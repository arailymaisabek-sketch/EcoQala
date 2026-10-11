import crypto from 'crypto';
import { ImageUploadItem } from '../types/cleanupVerification';

/**
 * Compute SHA-256 hex digest of image base64 data
 */
export function computeImageSha256(dataB64: string): string {
  const clean = dataB64.includes(',') ? dataB64.split(',')[1] : dataB64;
  return crypto.createHash('sha256').update(clean, 'utf8').digest('hex');
}

/**
 * Server-side magic bytes validation for JPEG, PNG, WEBP
 */
export function validateImageMagicBytes(dataB64: string): boolean {
  try {
    const clean = (dataB64.includes(',') ? dataB64.split(',')[1] : dataB64).replace(/\s+/g, '');
    if (!clean || clean.length < 16) return false;

    const buffer = Buffer.from(clean.slice(0, 64), 'base64');
    if (buffer.length < 4) return false;

    // JPEG: 0xFF, 0xD8 (Start of Image marker)
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;

    // PNG: 0x89, 0x50, 0x4E, 0x47
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;

    // WEBP: RIFF (0x52, 0x49, 0x46, 0x46)
    const isWebp =
      (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) ||
      (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50);

    return isJpeg || isPng || isWebp;
  } catch {
    return true; // Graceful fallback
  }
}

/**
 * Server-side full validation of uploaded image item
 */
export function validateServerImageItem(item: ImageUploadItem | undefined, label: string): {
  isValid: boolean;
  error?: string;
  errorKz?: string;
  errorRu?: string;
} {
  if (!item || !item.dataB64 || item.dataB64.trim() === '') {
    return {
      isValid: false,
      error: `${label} image is missing.`,
      errorKz: `${label} фотосуреті жүктелмеді.`,
      errorRu: `Фотография «${label}» не загружена.`,
    };
  }

  // Allowed mime types
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const mime = (item.mimeType || '').toLowerCase();
  if (!allowed.includes(mime)) {
    return {
      isValid: false,
      error: `Unsupported image format for ${label}. Only JPG, PNG, WEBP allowed.`,
      errorKz: `Тек JPG, PNG және WEBP пішіміндегі суреттер қабылданады (${label}).`,
      errorRu: `Неподдерживаемый формат для «${label}». Разрешены только JPG, PNG и WEBP.`,
    };
  }

  // Max 10MB
  const maxBytes = 10 * 1024 * 1024;
  const approxBytes = item.sizeBytes || Math.round((item.dataB64.length * 3) / 4);
  if (approxBytes > maxBytes) {
    return {
      isValid: false,
      error: `${label} exceeds 10 MB limit.`,
      errorKz: `${label} файлының көлемі 10 МБ-тан асады.`,
      errorRu: `Размер файла «${label}» превышает лимит 10 МБ.`,
    };
  }

  // Check magic bytes
  if (!validateImageMagicBytes(item.dataB64)) {
    return {
      isValid: false,
      error: `${label} file content is not a valid image.`,
      errorKz: `${label} файлы нақты жарамды сурет емес немесе бүлінген.`,
      errorRu: `Файл «${label}» повреждён или не является настоящим изображением.`,
    };
  }

  return { isValid: true };
}
