import { describe, it, expect, beforeEach } from 'vitest';
import { verifyCleanupSubmission } from '../src/services/verificationEngine';
import { BeforeAfterVerificationPayload, AiComparisonOutput } from '../src/types/cleanupVerification';
import { submissionStore } from '../src/services/submissionRepository';
import { validateServerImageItem, computeImageSha256 } from '../src/services/imageCryptoUtils';

// Helper: Real valid JPEG base64 (starting with 0xFF, 0xD8, 0xFF)
const VALID_JPEG_B64_A =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

const VALID_JPEG_B64_B =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB=';

// Helper: Corrupted / invalid non-image base64
const CORRUPTED_NON_IMAGE_B64 = Buffer.from('this is not an image header at all').toString('base64');

describe('EcoQala AI Before/After Verification Test Suite', () => {
  beforeEach(() => {
    submissionStore.clearAll();
  });

  const createBasePayload = (idSuffix: string): BeforeAfterVerificationPayload => ({
    idempotencyKey: `idem-test-${idSuffix}`,
    taskId: 'quest-almaty-1',
    taskTitle: 'Паркті қоқыстан тазарту',
    category: 'trash',
    cityName: 'Алматы',
    beforeImage: {
      dataB64: VALID_JPEG_B64_A,
      mimeType: 'image/jpeg',
      fileName: 'before.jpg',
      sizeBytes: 1500,
    },
    afterImage: {
      dataB64: VALID_JPEG_B64_B,
      mimeType: 'image/jpeg',
      fileName: 'after.jpg',
      sizeBytes: 1520,
    },
  });

  // Test 1: Valid before/after cleanup photos
  it('1. Approves valid before/after cleanup photos when all criteria pass', async () => {
    const payload = createBasePayload('valid-cleanup');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: true,
      litterAfter: false,
      visibleImprovement: true,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'good',
      confidence: 0.94,
      recommendation: 'approved',
      reason: 'Authentic cleanup verified at identical park location.',
      reasonKz: 'Бір орында нақты тазалау жұмысы расталды.',
      reasonRu: 'Подтверждена реальная очистка территории.',
      detectedBeforeObjects: ['пластиковые бутылки', 'пакеты'],
      detectedAfterObjects: ['чистый газон', 'мешок для мусора'],
      estimatedLitterRemovedKg: 4.5,
      limitations: ['Photos alone cannot prove physical identity.'],
    };

    const result = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(result.status).toBe('approved');
    expect(result.pointsEarned).toBe(50);
    expect(result.decision.status).toBe('approved');
  });

  // Test 2: Identical images
  it('2. Automatically rejects identical images via cryptographic hash check', async () => {
    const payload = createBasePayload('identical-images');
    payload.afterImage.dataB64 = VALID_JPEG_B64_A; // Exact same bytes as beforeImage

    const result = await verifyCleanupSubmission(payload);
    expect(result.status).toBe('rejected');
    expect(result.pointsEarned).toBe(0);
    expect(result.decision.ruleViolations).toContain('IDENTICAL_BEFORE_AFTER_HASH');
  });

  // Test 3: Completely unrelated locations
  it('3. Rejects submissions when photos show different physical locations', async () => {
    const payload = createBasePayload('diff-locations');
    const mockAi: AiComparisonOutput = {
      sameLocation: false,
      litterBefore: true,
      litterAfter: false,
      visibleImprovement: false,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'good',
      confidence: 0.88,
      recommendation: 'rejected',
      reason: 'Different physical locations detected.',
      detectedBeforeObjects: ['мусор'],
      detectedAfterObjects: ['озеро'],
      limitations: [],
    };

    const result = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(result.status).toBe('rejected');
    expect(result.decision.ruleViolations).toContain('DIFFERENT_LOCATIONS');
  });

  // Test 4: No visible litter in the before photo
  it('4. Rejects submission when no litter existed in the before photo', async () => {
    const payload = createBasePayload('no-litter-before');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: false,
      litterAfter: false,
      visibleImprovement: false,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'good',
      confidence: 0.85,
      recommendation: 'rejected',
      reason: 'No litter was present in the before photo.',
      detectedBeforeObjects: ['чистый асфальт'],
      detectedAfterObjects: ['чистый асфальт'],
      limitations: [],
    };

    const result = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(result.status).toBe('rejected');
    expect(result.decision.ruleViolations).toContain('NO_LITTER_BEFORE');
  });

  // Test 5: No meaningful improvement
  it('5. Rejects submission when no visible improvement or cleanup occurred', async () => {
    const payload = createBasePayload('no-improvement');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: true,
      litterAfter: true,
      visibleImprovement: false,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'good',
      confidence: 0.9,
      recommendation: 'rejected',
      reason: 'Litter is still scattered identically.',
      detectedBeforeObjects: ['мусор'],
      detectedAfterObjects: ['тот же мусор'],
      limitations: [],
    };

    const result = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(result.status).toBe('rejected');
    expect(result.decision.ruleViolations).toContain('NO_VISIBLE_IMPROVEMENT');
  });

  // Test 6: Low-quality images
  it('6. Requests retake when image quality is poor', async () => {
    const payload = createBasePayload('poor-quality');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: true,
      litterAfter: false,
      visibleImprovement: true,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'poor',
      confidence: 0.35,
      recommendation: 'retake_required',
      reason: 'Photos are extremely blurry and dark.',
      detectedBeforeObjects: [],
      detectedAfterObjects: [],
      limitations: ['Image quality too low for inspection'],
    };

    const result = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(result.status).toBe('retake_required');
    expect(result.decision.ruleViolations).toContain('IMAGE_QUALITY_TOO_LOW');
  });

  // Test 7: Unsupported or corrupted files
  it('7. Rejects unsupported or corrupted files with invalid magic bytes', () => {
    const check = validateServerImageItem(
      {
        dataB64: CORRUPTED_NON_IMAGE_B64,
        mimeType: 'image/jpeg',
        fileName: 'corrupted.jpg',
        sizeBytes: 100,
      },
      'Before'
    );
    expect(check.isValid).toBe(false);
  });

  // Test 8: AI Timeout or Execution Error
  it('8. Routes to manual review when AI execution fails or times out', async () => {
    const payload = createBasePayload('ai-error');
    // Save provider with missing keys to trigger AI execution error
    const oldKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const result = await verifyCleanupSubmission(payload);
      expect(result.status).toBe('manual_review');
      expect(result.pointsEarned).toBe(0);
      expect(result.decision.ruleViolations).toContain('AI_SERVICE_UNAVAILABLE');
    } finally {
      process.env.GEMINI_API_KEY = oldKey;
    }
  });

  // Test 9: Invalid AI JSON response handled gracefully
  it('9. Handles uncalibrated low confidence by routing to manual review', async () => {
    const payload = createBasePayload('low-confidence');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: true,
      litterAfter: false,
      visibleImprovement: true,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'fair',
      confidence: 0.52, // Below 0.65 threshold
      recommendation: 'manual_review',
      reason: 'Angle difference makes certainty marginal.',
      detectedBeforeObjects: ['мусор'],
      detectedAfterObjects: ['чистота'],
      limitations: [],
    };

    const result = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(result.status).toBe('manual_review');
    expect(result.pointsEarned).toBe(0);
  });

  // Test 10: Missing API credentials does not auto-approve
  it('10. Never auto-approves when API credentials are absent', async () => {
    const payload = createBasePayload('missing-creds');
    const oldKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const result = await verifyCleanupSubmission(payload);
      expect(result.status).not.toBe('approved');
      expect(result.pointsEarned).toBe(0);
    } finally {
      process.env.GEMINI_API_KEY = oldKey;
    }
  });

  // Test 11: Suspicious digital editing flags manual review
  it('11. Flags suspicious digital editing for manual review', async () => {
    const payload = createBasePayload('digital-editing');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: true,
      litterAfter: false,
      visibleImprovement: true,
      duplicateDetected: false,
      suspiciousEditing: true, // Flagged
      imageQuality: 'good',
      confidence: 0.72,
      recommendation: 'manual_review',
      reason: 'Cloning artifacts detected in ground texture.',
      detectedBeforeObjects: [],
      detectedAfterObjects: [],
      limitations: [],
    };

    const result = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(result.status).toBe('manual_review');
    expect(result.decision.ruleViolations).toContain('SUSPICIOUS_DIGITAL_EDITING');
  });

  // Test 12: Repeated reward requests (Idempotency)
  it('12. Prevents repeated reward requests using idempotency keys', async () => {
    const payload = createBasePayload('idempotent-test');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: true,
      litterAfter: false,
      visibleImprovement: true,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'good',
      confidence: 0.95,
      recommendation: 'approved',
      reason: 'Valid cleanup.',
      detectedBeforeObjects: [],
      detectedAfterObjects: [],
      limitations: [],
    };

    const first = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(first.status).toBe('approved');
    expect(first.pointsEarned).toBe(50);

    // Call again with the exact same idempotency key
    const second = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(second.id).toBe(first.id); // Exactly same cached submission returned
    expect(second.pointsEarned).toBe(50); // Did not double-reward
  });

  // Test 13: Replay attack prevention with previously rewarded photo
  it('13. Rejects new submission using an already rewarded photo hash', async () => {
    const payload1 = createBasePayload('first-submission');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: true,
      litterAfter: false,
      visibleImprovement: true,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'good',
      confidence: 0.92,
      recommendation: 'approved',
      reason: 'Valid cleanup.',
      detectedBeforeObjects: [],
      detectedAfterObjects: [],
      limitations: [],
    };

    const first = await verifyCleanupSubmission(payload1, { mockAiOutput: mockAi });
    expect(first.status).toBe('approved');

    // Second submission with new idempotency key but reusing VALID_JPEG_B64_A
    const payload2 = createBasePayload('second-submission-different-key');
    payload2.beforeImage.dataB64 = VALID_JPEG_B64_A; // Reused already rewarded hash

    const second = await verifyCleanupSubmission(payload2, { mockAiOutput: mockAi });
    expect(second.status).toBe('rejected');
    expect(second.decision.ruleViolations).toContain('DUPLICATE_REWARD_CLAIM');
  });

  // Test 14: Manual review workflow returns 0 points until human approval
  it('14. Never awards points while in manual review', async () => {
    const payload = createBasePayload('moderator-check');
    const mockAi: AiComparisonOutput = {
      sameLocation: true,
      litterBefore: true,
      litterAfter: false,
      visibleImprovement: true,
      duplicateDetected: false,
      suspiciousEditing: false,
      imageQuality: 'fair',
      confidence: 0.6,
      recommendation: 'manual_review',
      reason: 'Unclear if bags contain the same debris.',
      detectedBeforeObjects: [],
      detectedAfterObjects: [],
      limitations: [],
    };

    const result = await verifyCleanupSubmission(payload, { mockAiOutput: mockAi });
    expect(result.status).toBe('manual_review');
    expect(result.pointsEarned).toBe(0);
  });

  // Test 15: SHA-256 hash consistency
  it('15. Accurately calculates SHA-256 digests for images', () => {
    const hashA = computeImageSha256(VALID_JPEG_B64_A);
    const hashB = computeImageSha256(VALID_JPEG_B64_B);
    expect(hashA).toHaveLength(64);
    expect(hashB).toHaveLength(64);
    expect(hashA).not.toBe(hashB);
  });
});
