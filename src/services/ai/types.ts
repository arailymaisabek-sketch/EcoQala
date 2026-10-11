import { AiComparisonOutput, ImageUploadItem } from '../../types/cleanupVerification';

export interface CompareImagesParams {
  taskTitle: string;
  category: string;
  cityName: string;
  beforeImage: ImageUploadItem;
  afterImage: ImageUploadItem;
}

export interface AiVisionProvider {
  readonly name: string;
  readonly modelName: string;
  isAvailable(): boolean;
  compareBeforeAfter(params: CompareImagesParams): Promise<AiComparisonOutput>;
}
