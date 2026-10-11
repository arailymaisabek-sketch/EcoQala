import {
  AiComparisonOutput,
  BeforeAfterVerificationPayload,
  CleanupSubmissionRecord,
  DeterministicDecision,
} from '../types/cleanupVerification';
import { computeImageSha256, validateServerImageItem } from './imageCryptoUtils';
import { getVisionProvider } from './ai/providerFactory';
import { submissionStore } from './submissionRepository';

export interface VerificationEngineOptions {
  mockAiOutput?: AiComparisonOutput; // for automated tests
}

/**
 * Deterministic rule engine to evaluate cleanup submissions
 */
export async function verifyCleanupSubmission(
  payload: BeforeAfterVerificationPayload,
  options?: VerificationEngineOptions
): Promise<CleanupSubmissionRecord> {
  const now = Date.now();
  const submissionId = `sub-${now}-${Math.random().toString(36).substring(2, 9)}`;
  const idempotencyKey = payload.idempotencyKey || `idem-${now}-${Math.random().toString(36).substring(2, 8)}`;

  // 1. Idempotency Check: Protect against repeated reward requests
  const existing = submissionStore.findByIdempotency(idempotencyKey);
  if (existing) {
    return existing;
  }

  // 2. Server-side validation of BEFORE photo
  const beforeVal = validateServerImageItem(payload.beforeImage, 'Before');
  if (!beforeVal.isValid) {
    const decision: DeterministicDecision = {
      status: 'rejected',
      statusLabelKz: 'Фото сәйкес келмейді',
      statusLabelRu: 'Фото отклонено',
      statusLabelEn: 'Photo rejected',
      decisionReason: beforeVal.error || 'Invalid Before photo.',
      decisionReasonKz: beforeVal.errorKz || 'Тазалауға дейінгі фотосурет жарамсыз.',
      decisionReasonRu: beforeVal.errorRu || 'Фотография «ДО» некорректна.',
      pointsAwarded: 0,
      ruleViolations: ['INVALID_BEFORE_FILE'],
    };

    const record: CleanupSubmissionRecord = {
      id: submissionId,
      idempotencyKey,
      userId: payload.userId,
      taskId: payload.taskId,
      taskTitle: payload.taskTitle,
      cityName: payload.cityName,
      status: 'rejected',
      statusLabelKz: decision.statusLabelKz,
      statusLabelRu: decision.statusLabelRu,
      statusLabelEn: decision.statusLabelEn,
      beforeHash: '',
      afterHash: '',
      decision,
      aiProvider: 'none',
      modelName: 'none',
      pointsEarned: 0,
      createdAt: now,
      verifiedAt: now,
    };
    submissionStore.save(record);
    return record;
  }

  // 3. Server-side validation of AFTER photo
  const afterVal = validateServerImageItem(payload.afterImage, 'After');
  if (!afterVal.isValid) {
    const decision: DeterministicDecision = {
      status: 'rejected',
      statusLabelKz: 'Фото сәйкес келмейді',
      statusLabelRu: 'Фото отклонено',
      statusLabelEn: 'Photo rejected',
      decisionReason: afterVal.error || 'Invalid After photo.',
      decisionReasonKz: afterVal.errorKz || 'Тазалаудан кейінгі фотосурет жарамсыз.',
      decisionReasonRu: afterVal.errorRu || 'Фотография «ПОСЛЕ» некорректна.',
      pointsAwarded: 0,
      ruleViolations: ['INVALID_AFTER_FILE'],
    };

    const record: CleanupSubmissionRecord = {
      id: submissionId,
      idempotencyKey,
      userId: payload.userId,
      taskId: payload.taskId,
      taskTitle: payload.taskTitle,
      cityName: payload.cityName,
      status: 'rejected',
      statusLabelKz: decision.statusLabelKz,
      statusLabelRu: decision.statusLabelRu,
      statusLabelEn: decision.statusLabelEn,
      beforeHash: '',
      afterHash: '',
      decision,
      aiProvider: 'none',
      modelName: 'none',
      pointsEarned: 0,
      createdAt: now,
      verifiedAt: now,
    };
    submissionStore.save(record);
    return record;
  }

  // 4. Cryptographic Hash & Exact Duplicate Check
  const beforeHash = computeImageSha256(payload.beforeImage.dataB64);
  const afterHash = computeImageSha256(payload.afterImage.dataB64);

  if (beforeHash === afterHash) {
    const decision: DeterministicDecision = {
      status: 'rejected',
      statusLabelKz: 'Бірдей фотосуреттер',
      statusLabelRu: 'Идентичные фото',
      statusLabelEn: 'Identical photos',
      decisionReason: 'Before and After photos are identical files. Duplicate submission rejected.',
      decisionReasonKz: 'Тазалауға дейінгі және кейінгі суреттер бірдей. Өтінім қабылданбады.',
      decisionReasonRu: 'Фотографии ДО и ПОСЛЕ абсолютно одинаковы. Заявка отклонена.',
      pointsAwarded: 0,
      ruleViolations: ['IDENTICAL_BEFORE_AFTER_HASH'],
    };

    const record: CleanupSubmissionRecord = {
      id: submissionId,
      idempotencyKey,
      userId: payload.userId,
      taskId: payload.taskId,
      taskTitle: payload.taskTitle,
      cityName: payload.cityName,
      status: 'rejected',
      statusLabelKz: decision.statusLabelKz,
      statusLabelRu: decision.statusLabelRu,
      statusLabelEn: decision.statusLabelEn,
      beforeHash,
      afterHash,
      decision,
      aiProvider: 'rules-engine',
      modelName: 'sha256',
      pointsEarned: 0,
      createdAt: now,
      verifiedAt: now,
    };
    submissionStore.save(record);
    return record;
  }

  // Check if either hash was already successfully approved in the database (replay attack prevention)
  const isBeforeReused = submissionStore.hasHashBeenRewarded(beforeHash);
  const isAfterReused = submissionStore.hasHashBeenRewarded(afterHash);
  if (isBeforeReused || isAfterReused) {
    const decision: DeterministicDecision = {
      status: 'rejected',
      statusLabelKz: 'Фото бұрын қолданылған',
      statusLabelRu: 'Фото уже использовалось',
      statusLabelEn: 'Photo already rewarded',
      decisionReason: 'This photo has already been approved and rewarded in a previous submission.',
      decisionReasonKz: 'Бұл фотосурет бұрынғы өтінімде мақұлданған және сыйақы берілген.',
      decisionReasonRu: 'Эта фотография уже была проверена и вознаграждена ранее.',
      pointsAwarded: 0,
      ruleViolations: ['DUPLICATE_REWARD_CLAIM'],
    };

    const record: CleanupSubmissionRecord = {
      id: submissionId,
      idempotencyKey,
      userId: payload.userId,
      taskId: payload.taskId,
      taskTitle: payload.taskTitle,
      cityName: payload.cityName,
      status: 'rejected',
      statusLabelKz: decision.statusLabelKz,
      statusLabelRu: decision.statusLabelRu,
      statusLabelEn: decision.statusLabelEn,
      beforeHash,
      afterHash,
      decision,
      aiProvider: 'rules-engine',
      modelName: 'hash-check',
      pointsEarned: 0,
      createdAt: now,
      verifiedAt: now,
    };
    submissionStore.save(record);
    return record;
  }

  // 5. AI Vision comparative analysis
  const provider = getVisionProvider();
  let aiOutput: AiComparisonOutput;
  let providerUsedName = provider.name;
  let modelUsedName = provider.modelName;

  if (options?.mockAiOutput) {
    aiOutput = options.mockAiOutput;
    providerUsedName = 'mock';
    modelUsedName = 'mock-vision';
  } else {
    try {
      if (!provider.isAvailable()) {
        // AI credentials missing -> send to manual review per Phase 4:
        // "Если AI-сервис недоступен, не подтверждай заявку автоматически."
        const decision: DeterministicDecision = {
          status: 'manual_review',
          statusLabelKz: 'Қосымша тексеру қажет',
          statusLabelRu: 'Требуется модерация',
          statusLabelEn: 'Manual review required',
          decisionReason: 'AI verification service is not configured. Submission routed to human moderator.',
          decisionReasonKz: 'AI жүйесі қолжетімсіз болғандықтан, өтінім модератор қарауына жіберілді.',
          decisionReasonRu: 'ИИ сервис недоступен. Заявка отправлена на ручную проверку модератором.',
          pointsAwarded: 0,
          ruleViolations: ['AI_SERVICE_UNAVAILABLE'],
        };

        const record: CleanupSubmissionRecord = {
          id: submissionId,
          idempotencyKey,
          userId: payload.userId,
          taskId: payload.taskId,
          taskTitle: payload.taskTitle,
          cityName: payload.cityName,
          status: 'manual_review',
          statusLabelKz: decision.statusLabelKz,
          statusLabelRu: decision.statusLabelRu,
          statusLabelEn: decision.statusLabelEn,
          beforeHash,
          afterHash,
          decision,
          aiProvider: 'fallback',
          modelName: 'none',
          pointsEarned: 0,
          createdAt: now,
          verifiedAt: now,
        };
        submissionStore.save(record);
        return record;
      }

      aiOutput = await provider.compareBeforeAfter({
        taskTitle: payload.taskTitle,
        category: payload.category,
        cityName: payload.cityName,
        beforeImage: payload.beforeImage,
        afterImage: payload.afterImage,
      });
    } catch (aiErr: any) {
      console.error('AI comparison error:', aiErr);
      const decision: DeterministicDecision = {
        status: 'manual_review',
        statusLabelKz: 'Қосымша тексеру қажет',
        statusLabelRu: 'Требуется модерация',
        statusLabelEn: 'Manual review required',
        decisionReason: `AI model execution failed: ${aiErr?.message || 'timeout/error'}. Routed to moderator.`,
        decisionReasonKz: 'AI өңдеуде қате орын алды. Өтінім модератор қарауына жіберілді.',
        decisionReasonRu: 'Сбой ИИ сервиса. Заявка передана на ручную проверку.',
        pointsAwarded: 0,
        ruleViolations: ['AI_EXECUTION_ERROR'],
      };

      const record: CleanupSubmissionRecord = {
        id: submissionId,
        idempotencyKey,
        userId: payload.userId,
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        cityName: payload.cityName,
        status: 'manual_review',
        statusLabelKz: decision.statusLabelKz,
        statusLabelRu: decision.statusLabelRu,
        statusLabelEn: decision.statusLabelEn,
        beforeHash,
        afterHash,
        decision,
        aiProvider: providerUsedName,
        modelName: modelUsedName,
        pointsEarned: 0,
        createdAt: now,
        verifiedAt: now,
      };
      submissionStore.save(record);
      return record;
    }
  }

  // 6. Deterministic Server-side Decision Rules
  const violations: string[] = [];
  const baseReward = payload.category === 'trees' ? 100 : 50;

  // Rule: Duplicate detected by AI
  if (aiOutput.duplicateDetected) {
    violations.push('AI_DUPLICATE_DETECTED');
  }

  // Rule: Different physical locations
  if (!aiOutput.sameLocation) {
    violations.push('DIFFERENT_LOCATIONS');
  }

  // Rule: No litter in before photo
  if (!aiOutput.litterBefore) {
    violations.push('NO_LITTER_BEFORE');
  }

  // Rule: No visible cleanup improvement
  if (!aiOutput.visibleImprovement) {
    violations.push('NO_VISIBLE_IMPROVEMENT');
  }

  // Rule: Suspicious digital editing
  if (aiOutput.suspiciousEditing) {
    violations.push('SUSPICIOUS_DIGITAL_EDITING');
  }

  // Rule: Poor image quality
  if (aiOutput.imageQuality === 'poor' || aiOutput.recommendation === 'retake_required') {
    violations.push('IMAGE_QUALITY_TOO_LOW');
  }

  // Rule: Low confidence score
  if (aiOutput.confidence < 0.65) {
    violations.push('LOW_CONFIDENCE_SCORE');
  }

  let finalStatus: CleanupSubmissionRecord['status'];
  let decisionReason: string;
  let decisionReasonKz: string;
  let decisionReasonRu: string;
  let pointsAwarded = 0;

  if (violations.includes('IMAGE_QUALITY_TOO_LOW')) {
    finalStatus = 'retake_required';
    decisionReason = 'Image quality is too low to verify cleanup. Please retake clearer photos.';
    decisionReasonKz = 'Сурет сапасы тым төмен. Анығырақ әрі жарықта түсірілген фотосурет жүктеңіз.';
    decisionReasonRu = 'Качество фотографий слишком низкое. Пожалуйста, сделайте более четкие снимки.';
  } else if (violations.includes('DIFFERENT_LOCATIONS')) {
    finalStatus = 'rejected';
    decisionReason = 'The Before and After photos appear to be taken at completely different physical locations.';
    decisionReasonKz = 'Фотосуреттер бір орыннан түсірілмеген сияқты. Екі сурет те бір жерде түсірілуі тиіс.';
    decisionReasonRu = 'Фотографии ДО и ПОСЛЕ сделаны в разных местах. Локации не совпадают.';
  } else if (violations.includes('AI_DUPLICATE_DETECTED')) {
    finalStatus = 'rejected';
    decisionReason = 'Duplicate photos detected. The Before and After photos must be distinct.';
    decisionReasonKz = 'Бірдей суреттер анықталды. Тазалауға дейінгі және кейінгі фотолар әртүрлі болуы қажет.';
    decisionReasonRu = 'Обнаружены дубликаты фотографий.';
  } else if (violations.includes('NO_LITTER_BEFORE')) {
    finalStatus = 'rejected';
    decisionReason = 'No visible litter or cleanup requirement detected in the Before photo.';
    decisionReasonKz = 'Тазалауға дейінгі фотода қоқыс немесе тазалау нысаны табылмады.';
    decisionReasonRu = 'На фотографии ДО уборки не обнаружено мусора или необходимости в очистке.';
  } else if (violations.includes('NO_VISIBLE_IMPROVEMENT')) {
    finalStatus = 'rejected';
    decisionReason = 'No meaningful environmental improvement or litter reduction detected between the photos.';
    decisionReasonKz = 'Тазалау нәтижесінде көрінетін өзгеріс немесе қоқыстың азайғаны байқалмайды.';
    decisionReasonRu = 'Не обнаружено заметного уменьшения мусора или улучшения состояния территории.';
  } else if (violations.includes('SUSPICIOUS_DIGITAL_EDITING') || violations.includes('LOW_CONFIDENCE_SCORE') || aiOutput.recommendation === 'manual_review') {
    finalStatus = 'manual_review';
    decisionReason = 'Inconclusive or requires human review due to angle differences or lighting.';
    decisionReasonKz = 'Қосымша тексеру қажет. Түсіру бұрышы немесе дәлелдер күмәнді болғандықтан, модераторға жолданды.';
    decisionReasonRu = 'Требуется ручная проверка модератором из-за разницы ракурсов или освещения.';
  } else if (aiOutput.recommendation === 'approved' && violations.length === 0) {
    finalStatus = 'approved';
    pointsAwarded = baseReward;
    decisionReason = aiOutput.reason || 'Verification successful. Significant cleanup improvement verified at the same location.';
    decisionReasonKz = aiOutput.reasonKz || 'Тапсырма тексеруден өтті! Бір орында нақты тазалау жұмысы расталды.';
    decisionReasonRu = aiOutput.reasonRu || 'Задание успешно прошло проверку! Подтверждена реальная очистка территории.';
  } else {
    finalStatus = 'manual_review';
    decisionReason = aiOutput.reason || 'Ambiguous case sent to manual review.';
    decisionReasonKz = aiOutput.reasonKz || 'Қосымша тексеру қажет.';
    decisionReasonRu = aiOutput.reasonRu || 'Отправлено на ручную проверку.';
  }

  const labelMap: Record<CleanupSubmissionRecord['status'], { kz: string; ru: string; en: string }> = {
    approved: { kz: 'Тапсырма тексеруден өтті', ru: 'Задание прошло проверку', en: 'Verification successful' },
    manual_review: { kz: 'Қосымша тексеру қажет', ru: 'Требуется модерация', en: 'Manual review required' },
    rejected: { kz: 'Фото сәйкес келмейді', ru: 'Фото отклонено', en: 'Verification rejected' },
    retake_required: { kz: 'Қайта түсіру қажет', ru: 'Требуется переснять', en: 'Retake required' },
    verification_failed: { kz: 'Тексеру сәтсіз аяқталды', ru: 'Ошибка проверки', en: 'Verification failed' },
  };

  const decision: DeterministicDecision = {
    status: finalStatus,
    statusLabelKz: labelMap[finalStatus].kz,
    statusLabelRu: labelMap[finalStatus].ru,
    statusLabelEn: labelMap[finalStatus].en,
    decisionReason,
    decisionReasonKz,
    decisionReasonRu,
    pointsAwarded,
    ruleViolations: violations,
  };

  const record: CleanupSubmissionRecord = {
    id: submissionId,
    idempotencyKey,
    userId: payload.userId,
    taskId: payload.taskId,
    taskTitle: payload.taskTitle,
    cityName: payload.cityName,
    status: finalStatus,
    statusLabelKz: decision.statusLabelKz,
    statusLabelRu: decision.statusLabelRu,
    statusLabelEn: decision.statusLabelEn,
    beforeHash,
    afterHash,
    decision,
    aiOutput,
    aiProvider: providerUsedName,
    modelName: modelUsedName,
    pointsEarned: pointsAwarded,
    createdAt: now,
    verifiedAt: now,
  };

  submissionStore.save(record);
  return record;
}
