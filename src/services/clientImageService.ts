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
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedExtensions.includes(ext) || !allowedMime.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      errorMessageKz: 'Тек JPG, JPEG, PNG және WEBP пішіміндегі суреттерге рұқсат етіледі.',
    };
  }

  // 3. Inspect magic bytes to verify it's a real image, not just a renamed file
  try {
    const isRealImage = await checkImageMagicBytes(file);
    if (!isRealImage) {
      return {
        isValid: false,
        errorMessageKz: 'Файл жарамды сурет емес немесе бүлінген (нақты суретті таңдаңыз).',
      };
    }
  } catch (e) {
    console.warn('Magic bytes check bypassed:', e);
  }

  // 4. Test loading into Image element to guarantee renderability
  try {
    await testImageRender(file);
  } catch {
    return {
      isValid: false,
      errorMessageKz: 'Суретті ашу мүмкін болмады. Басқа фотосурет жүктеп көріңіз.',
    };
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
      const arr = new Uint8Array(reader.result as ArrayBuffer).subarray(0, 12);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).padStart(2, '0');
      }

      // JPEG: starts with ffd8ff
      const isJpeg = header.startsWith('ffd8ff');
      // PNG: starts with 89504e470d0a1a0a
      const isPng = header.startsWith('89504e47');
      // WEBP: starts with 52494646 (RIFF) and has 57454250 (WEBP) at offset 8
      const isWebp = header.startsWith('52494646') && header.slice(16, 24) === '57454250';

      resolve(isJpeg || isPng || isWebp);
    };
    reader.onerror = () => resolve(false);
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

  try {
    const res = await fetch('/api/verify-photo', {
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
    console.warn('Network call to /api/verify-photo failed:', networkErr);
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
