import { analyzeEcoPhoto, VerifyImagePayload } from '../../src/services/imageVerificationService';

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

/**
 * Netlify Function handler for POST /api/verify-photo
 * Can be deployed to Netlify Functions directly.
 */
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: defaultHeaders,
      body: JSON.stringify({
        status: 'REJECTED',
        statusLabelKz: 'Фото сәйкес келмейді',
        reasonKz: 'Тек POST сұраныстары қабылданады.',
        isCompliant: false,
      }),
    };
  }

  try {
    const payload: VerifyImagePayload = JSON.parse(event.body || '{}');

    // 1. Check if photo is present
    if (!payload.imageB64 || payload.imageB64.trim() === '') {
      return {
        statusCode: 400,
        headers: defaultHeaders,
        body: JSON.stringify({
          status: 'NO_PHOTO',
          statusLabelKz: 'Фото жүктелмеді',
          reasonKz: 'Алдымен фотосуретті жүктеңіз.',
          confidenceScore: 0,
          detectedObjects: [],
          metricsSummary: '0',
          isCompliant: false,
        }),
      };
    }

    // 2. Validate file format server-side
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const mime = (payload.mimeType || '').toLowerCase();
    if (!allowedMimes.includes(mime)) {
      return {
        statusCode: 400,
        headers: defaultHeaders,
        body: JSON.stringify({
          status: 'REJECTED',
          statusLabelKz: 'Фото сәйкес келмейді',
          reasonKz: 'Тек JPG, JPEG, PNG және WEBP форматтарындағы нақты суреттер қабылданады.',
          confidenceScore: 0,
          detectedObjects: [],
          metricsSummary: '0',
          isCompliant: false,
        }),
      };
    }

    // 3. Process via Gemini AI
    const result = await analyzeEcoPhoto(payload);

    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Netlify function error:', error);
    return {
      statusCode: 500,
      headers: defaultHeaders,
      body: JSON.stringify({
        status: 'NEEDS_REVIEW',
        statusLabelKz: 'Қосымша тексеру қажет',
        reasonKz: 'Серверлік өңдеу қатесі орын алды. Қосымша тексеру қажет.',
        confidenceScore: 0,
        detectedObjects: [],
        metricsSummary: 'Қате',
        isCompliant: false,
      }),
    };
  }
}
