export type CleanupVerificationStatus =
  | 'approved'
  | 'manual_review'
  | 'rejected'
  | 'retake_required'
  | 'verification_failed';

export interface ImageUploadItem {
  dataB64: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  previewUrl?: string;
  hashSha256?: string;
}

export interface BeforeAfterVerificationPayload {
  idempotencyKey: string;
  taskId?: string;
  taskTitle: string;
  category: 'trash' | 'trees' | 'patrol' | 'all';
  cityName: string;
  walletAddress?: string | null;
  userId?: string;
  beforeImage: ImageUploadItem;
  afterImage: ImageUploadItem;
}

export interface AiComparisonOutput {
  sameLocation: boolean;
  litterBefore: boolean;
  litterAfter: boolean;
  visibleImprovement: boolean;
  duplicateDetected: boolean;
  suspiciousEditing: boolean;
  imageQuality: 'poor' | 'fair' | 'good' | 'excellent';
  confidence: number; // 0.00 to 1.00
  recommendation: 'approved' | 'manual_review' | 'rejected' | 'retake_required';
  reason: string;
  reasonKz?: string;
  reasonRu?: string;
  detectedBeforeObjects: string[];
  detectedAfterObjects: string[];
  estimatedLitterRemovedKg?: number;
  limitations: string[];
}

export interface DeterministicDecision {
  status: CleanupVerificationStatus;
  statusLabelKz: string;
  statusLabelRu: string;
  statusLabelEn: string;
  decisionReason: string;
  decisionReasonKz: string;
  decisionReasonRu: string;
  pointsAwarded: number;
  ruleViolations: string[];
}

export interface CleanupSubmissionRecord {
  id: string;
  idempotencyKey: string;
  userId?: string;
  taskId?: string;
  taskTitle: string;
  cityName: string;
  status: CleanupVerificationStatus;
  statusLabelKz: string;
  statusLabelRu: string;
  statusLabelEn: string;
  beforeHash: string;
  afterHash: string;
  decision: DeterministicDecision;
  aiOutput?: AiComparisonOutput;
  aiProvider: string;
  modelName: string;
  pointsEarned: number;
  solanaTxSignature?: string;
  createdAt: number;
  verifiedAt: number;
}
