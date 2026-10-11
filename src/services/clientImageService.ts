import { EcoVerificationStatus, VerifyImageResult } from './imageVerificationService';

export interface ClientValidation {
  isValid: boolean;
  errorMessageKz?: string;
}

/**
 * Validates file on the client:
 * 1. Checks file presence
 * 2. Allowed formats: JPG, JPEG, PNG, WEBP
 * 3. Max size: 10 MB
 * 4. Ensures file is a valid image via header inspection and Image() object loading
 */
export async function validateImageFile(file: File | null | undefined): Promise<ClientValidation> {
  if (!file) {
    return {
      isValid: false,
      errorMessageKz: 'Алдымен фотосуретті жүктеңіз',
    };
  }

  // 1. Check size: max 10MB
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      isValid: false,
      errorMessageKz: 'Файл көлемі 10 МБ-тан аспауы тиіс.',
    };
  }

  // 2. Check extension & MIME
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
  const ext = file.name ? file.name.split('.').pop()?.toLowerCase() || '' : '';
  const isImageMime = file.type ? file.type.toLowerCase().startsWith('image/') : false;
  const isAllowedExt = allowedExtensions.includes(ext);

  // If both mime and extension are known and neither is an image:
  if (file.type && !isImageMime && !isAllowedExt) {
    return {
      isValid: false,
      errorMessageKz: 'Тек JPG, JPEG, PNG және WEBP пішіміндегі суреттерге рұқсат етіледі.',
    };
  }

  // 3. Inspect magic bytes to verify it's a real image
  try {
    const isRealImage = await checkImageMagicBytes(file);
    if (!isRealImage) {
      // If magic bytes cannot be verified, test rendering before rejecting
      const canRender = await testImageRender(file).catch(() => false);
      if (!canRender) {
        return {
          isValid: false,
          errorMessageKz: 'Файл жарамды сурет емес немесе бүлінген.',
        };
      }
    }
  } catch (e) {
    console.warn('Magic bytes check bypassed:', e);
  }

  return { isValid: true };
}

/**
 * Read the first bytes of the file to check signatures for JPEG, PNG, and WEBP
 */
function checkImageMagicBytes(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer).subarray(0, 16);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).padStart(2, '0');
      }

      // JPEG: starts with ffd8
      const isJpeg = header.startsWith('ffd8');
      // PNG: starts with 89504e47
      const isPng = header.startsWith('89504e47');
      // WEBP: starts with 52494646 (RIFF) or contains 57454250 (WEBP)
      const isWebp = header.startsWith('52494646') || header.includes('57454250');

      resolve(isJpeg || isPng || isWebp);
    };
    reader.onerror = () => resolve(true);
    reader.readAsArrayBuffer(file.slice(0, 16));
  });
}

function testImageRender(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image data'));
    };
    img.src = url;
  });
}

/**
 * Convert file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Request server verification (tries Netlify function /api/verify-photo first, or falls back to server endpoint)
 */
export async function requestPhotoVerification(params: {
  taskTitle: string;
  category: 'trash' | 'trees' | 'patrol' | 'all';
  cityName: string;
  imageB64: string;
  mimeType: string;
}): Promise<VerifyImageResult> {
  // If no photo is passed
  if (!params.imageB64 || params.imageB64.trim() === '') {
    return {
      status: 'NO_PHOTO',
      statusLabelKz: 'Фото жүктелмеді',
      reasonKz: 'Алдымен фотосуретті жүктеңіз',
      confidenceScore: 0,
      detectedObjects: [],
      metricsSummary: '0',
      isCompliant: false,
    };
  }

  const endpoints = ['/api/verify-photo', '/.netlify/functions/verify-photo'];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const data: VerifyImageResult = await res.json();
        return data;
      }

      const errData = await res.json().catch(() => null);
      if (errData && errData.status) {
        return errData as VerifyImageResult;
      }
    } catch (networkErr) {
      console.warn(`Network call to ${url} failed, trying next endpoint:`, networkErr);
    }
  }

  // If server is not responding, requirement specifies:
  // "Если AI-сервис недоступен, не подтверждай заявку автоматически."
  return {
    status: 'NEEDS_REVIEW',
    statusLabelKz: 'Қосымша тексеру қажет',
    reasonKz: 'AI тексеру сервисімен байланыс орнату мүмкін болмады. Өтінім модератордың қосымша тексеруіне жіберілді.',
    confidenceScore: 0,
    detectedObjects: [],
    metricsSummary: 'Қосымша тексеруде',
    isCompliant: false,
  };
}

/**
 * Request real Before/After comparative AI verification
 */
export async function requestBeforeAfterVerification(
  payload: import('../types/cleanupVerification').BeforeAfterVerificationPayload
): Promise<import('../types/cleanupVerification').CleanupSubmissionRecord> {
  const endpoints = ['/api/verify-cleanup', '/.netlify/functions/verify-cleanup'];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      }

      const errData = await res.json().catch(() => null);
      if (errData && errData.decision) {
        return errData;
      }
    } catch (networkErr) {
      console.warn(`Network call to ${url} failed, trying next endpoint:`, networkErr);
    }
  }

  // Fallback: If server is unreachable, do NOT auto-approve. Route to manual review.
  const now = Date.now();
  return {
    id: `offline-${now}`,
    idempotencyKey: payload.idempotencyKey,
    taskTitle: payload.taskTitle,
    cityName: payload.cityName,
    status: 'manual_review',
    statusLabelKz: 'Қосымша тексеру қажет',
    statusLabelRu: 'Требуется модерация',
    statusLabelEn: 'Manual review required',
    beforeHash: '',
    afterHash: '',
    decision: {
      status: 'manual_review',
      statusLabelKz: 'Қосымша тексеру қажет',
      statusLabelRu: 'Требуется модерация',
      statusLabelEn: 'Manual review required',
      decisionReason: 'Network connection failed or server is temporarily unreachable. Submission queued for moderator review.',
      decisionReasonKz: 'Сервермен байланыс орнатылмады. Өтінім модератордың қарауына жіберілді.',
      decisionReasonRu: 'Связь с сервером прервана. Заявка отправлена на ручную модерацию.',
      pointsAwarded: 0,
      ruleViolations: ['NETWORK_UNAVAILABLE'],
    },
    aiProvider: 'none',
    modelName: 'none',
    pointsEarned: 0,
    createdAt: now,
    verifiedAt: now,
  };
}
