import { AiVisionProvider, CompareImagesParams } from './types';
import { AiComparisonOutput } from '../../types/cleanupVerification';

export class OpenAiVisionProvider implements AiVisionProvider {
  public readonly name = 'openai';
  public readonly modelName: string;

  constructor() {
    this.modelName = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  }

  public isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  public async compareBeforeAfter(params: CompareImagesParams): Promise<AiComparisonOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API credentials not configured (OPENAI_API_KEY is missing).');
    }

    const cleanBefore = params.beforeImage.dataB64.startsWith('data:')
      ? params.beforeImage.dataB64
      : `data:${params.beforeImage.mimeType || 'image/jpeg'};base64,${params.beforeImage.dataB64}`;

    const cleanAfter = params.afterImage.dataB64.startsWith('data:')
      ? params.afterImage.dataB64
      : `data:${params.afterImage.mimeType || 'image/jpeg'};base64,${params.afterImage.dataB64}`;

    const systemPrompt = `
You are the EcoQala environmental vision inspector.
Compare the two images: Image 1 is BEFORE cleanup, Image 2 is AFTER cleanup.
Determine if:
1. Both photos show the SAME physical location (check background, trees, surfaces, landmarks).
2. The BEFORE photo has visible litter.
3. The AFTER photo shows that the litter was cleaned up (or trash bags collected).
4. Photos are not duplicates or manipulated.
5. Image quality is sufficient.

Respond ONLY with valid JSON following this exact structure:
{
  "sameLocation": boolean,
  "litterBefore": boolean,
  "litterAfter": boolean,
  "visibleImprovement": boolean,
  "duplicateDetected": boolean,
  "suspiciousEditing": boolean,
  "imageQuality": "poor" | "fair" | "good" | "excellent",
  "confidence": number (between 0.00 and 1.00),
  "recommendation": "approved" | "manual_review" | "rejected" | "retake_required",
  "reason": "English explanation",
  "reasonKz": "Kazakh explanation",
  "reasonRu": "Russian explanation",
  "detectedBeforeObjects": ["string"],
  "detectedAfterObjects": ["string"],
  "estimatedLitterRemovedKg": number,
  "limitations": ["string"]
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Task: ${params.taskTitle}. City: ${params.cityName}. Compare BEFORE (1st) and AFTER (2nd).` },
              { type: 'image_url', image_url: { url: cleanBefore, detail: 'low' } },
              { type: 'image_url', image_url: { url: cleanAfter, detail: 'low' } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Vision API error (${response.status}): ${errText}`);
    }

    const resJson = await response.json();
    const content = resJson.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      sameLocation: Boolean(parsed.sameLocation),
      litterBefore: Boolean(parsed.litterBefore),
      litterAfter: Boolean(parsed.litterAfter),
      visibleImprovement: Boolean(parsed.visibleImprovement),
      duplicateDetected: Boolean(parsed.duplicateDetected),
      suspiciousEditing: Boolean(parsed.suspiciousEditing),
      imageQuality: ['poor', 'fair', 'good', 'excellent'].includes(parsed.imageQuality)
        ? parsed.imageQuality
        : 'fair',
      confidence: typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.75,
      recommendation: ['approved', 'manual_review', 'rejected', 'retake_required'].includes(parsed.recommendation)
        ? parsed.recommendation
        : 'manual_review',
      reason: parsed.reason || 'OpenAI analysis completed.',
      reasonKz: parsed.reasonKz || 'OpenAI талдауы аяқталды.',
      reasonRu: parsed.reasonRu || 'Анализ OpenAI завершён.',
      detectedBeforeObjects: Array.isArray(parsed.detectedBeforeObjects) ? parsed.detectedBeforeObjects : [],
      detectedAfterObjects: Array.isArray(parsed.detectedAfterObjects) ? parsed.detectedAfterObjects : [],
      estimatedLitterRemovedKg: typeof parsed.estimatedLitterRemovedKg === 'number' ? parsed.estimatedLitterRemovedKg : undefined,
      limitations: Array.isArray(parsed.limitations) ? parsed.limitations : ['Photos alone cannot prove physical activity.'],
    };
  }
}
