import { verifyCleanupSubmission } from '../../src/services/verificationEngine';
import { BeforeAfterVerificationPayload } from '../../src/types/cleanupVerification';

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
 * Netlify Function handler for POST /api/verify-cleanup
 */
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
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
        error: 'Method not allowed. Only POST accepted.',
      }),
    };
  }

  try {
    const payload: BeforeAfterVerificationPayload = JSON.parse(event.body || '{}');

    // Execute deterministic rule engine
    const result = await verifyCleanupSubmission(payload);

    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Netlify function verify-cleanup error:', error);
    return {
      statusCode: 500,
      headers: defaultHeaders,
      body: JSON.stringify({
        status: 'manual_review',
        statusLabelKz: 'Қосымша тексеру қажет',
        statusLabelRu: 'Требуется модерация',
        statusLabelEn: 'Manual review required',
        decision: {
          status: 'manual_review',
          decisionReason: `Server error: ${error?.message || 'internal error'}`,
          decisionReasonKz: 'Серверлік өңдеуде күтпеген қате шықты. Модератор қарауына жіберілді.',
          decisionReasonRu: 'Внутренняя ошибка сервера. Заявка отправлена модератору.',
          pointsAwarded: 0,
          ruleViolations: ['INTERNAL_SERVER_ERROR'],
        },
      }),
    };
  }
}
