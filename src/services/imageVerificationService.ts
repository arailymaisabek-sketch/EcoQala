import { GoogleGenAI, Type } from '@google/genai';

export interface VerifyImagePayload {
  taskTitle: string;
  category: 'trash' | 'trees' | 'patrol' | 'all';
  cityName: string;
  imageB64: string; // base64 data without prefix or with prefix
  mimeType: string;
}

export type EcoVerificationStatus =
  | 'APPROVED' // «Фото тексеруден өтті»
  | 'REJECTED' // «Фото сәйкес келмейді»
  | 'NEEDS_REVIEW' // «Қосымша тексеру қажет»
  | 'NO_PHOTO'; // «Фото жүктелмеді»

export interface VerifyImageResult {
  status: EcoVerificationStatus;
  statusLabelKz: string;
  reasonKz: string;
  confidenceScore: number;
  detectedObjects: string[];
  metricsSummary: string;
  isCompliant: boolean;
}

// Server-side Gemini client using the recommended SDK
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Validate and verify uploaded eco photo
 */
export async function analyzeEcoPhoto(payload: VerifyImagePayload): Promise<VerifyImageResult> {
  const { taskTitle, category, cityName, imageB64, mimeType } = payload;

  if (!imageB64 || imageB64.trim() === '') {
    return {
      status: 'NO_PHOTO',
      statusLabelKz: 'Фото жүктелмеді',
      reasonKz: 'Алдымен фотосуретті жүктеңіз.',
      confidenceScore: 0,
      detectedObjects: [],
      metricsSummary: '0',
      isCompliant: false,
    };
  }

  // Server-side MIME validation: JPG, JPEG, PNG, WEBP
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const normalizedMime = mimeType.toLowerCase();
  if (!allowedMimeTypes.includes(normalizedMime)) {
    return {
      status: 'REJECTED',
      statusLabelKz: 'Фото сәйкес келмейді',
      reasonKz: 'Тек JPG, JPEG, PNG және WEBP форматтарындағы суреттер қабылданады.',
      confidenceScore: 0,
      detectedObjects: [],
      metricsSummary: '0',
      isCompliant: false,
    };
  }

  // Clean base64 string
  let cleanBase64 = imageB64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  // Check file size in bytes (~ base64 length * 0.75)
  const approxSizeBytes = Math.round((cleanBase64.length * 3) / 4);
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  if (approxSizeBytes > maxSizeBytes) {
    return {
      status: 'REJECTED',
      statusLabelKz: 'Фото сәйкес келмейді',
      reasonKz: 'Файл көлемі 10 МБ-тан аспауы тиіс.',
      confidenceScore: 0,
      detectedObjects: [],
      metricsSummary: '0',
      isCompliant: false,
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    // If AI service is unavailable, per requirement: "Если AI-сервис недоступен, не подтверждай заявку автоматически."
    return {
      status: 'NEEDS_REVIEW',
      statusLabelKz: 'Қосымша тексеру қажет',
      reasonKz: 'AI тексеру сервисі уақытша қолжетімсіз. Модератордың қосымша тексеруі қажет.',
      confidenceScore: 0,
      detectedObjects: [],
      metricsSummary: 'Тексеру күтілуде',
      isCompliant: false,
    };
  }

  try {
    const prompt = `
Сіз EcoQala экологиялық платформасының қатаң AI-инспекторысыз.
Пайдаланушы экологиялық тапсырманы орындағанын дәлелдейтін фотосурет жіберді.

ТАПСЫРМА ТУРАЛЫ АҚПАРАТ:
- Тапсырма атауы: "${taskTitle}"
- Санат: "${category}" (қоқыс тазалау, ағаш отырғызу немесе эко-патруль)
- Қала: "${cityName}"

ҚАТАҢ ЕРЕЖЕЛЕР:
1. Селфи, мем, интернеттен алынған кездейсоқ скриншот, құжат, бөлмедегі заттар немесе экологияға қатысы жоқ фото болса -> ДЕРЕУ ҚАБЫЛДАМАУ ("REJECTED").
2. Егер жай ғана қоқыс жатқан жерді түсіріп алса, бірақ тазалау белгісі немесе жиналған қаптар/сұрыпталған жәшік жоқ болса -> ТЕК ҚОҚЫС БАР ДЕП БЕКІТПЕҢІЗ. Бұл жағдайда "NEEDS_REVIEW" немесе "REJECTED" беріңіз.
3. Егер тапсырма ағаш отырғызу болса: суретте нақты жас көшет, отырғызылған түп, қазылған шұңқыр, су құйылған белгілері болуы қажет.
4. Егер бір фотосурет бойынша тапсырманың орындалғанына 100% сенімділік болмаса (күмәнді, тым алыс, анық емес) -> "NEEDS_REVIEW" ("Қосымша тексеру қажет") таңдаңыз.
5. Тек нақты, айқын экологиялық іс-қимыл көрініп тұрса ғана "APPROVED" беріңіз.

ШЫҒЫС ФОРМАТЫ (JSON):
- status: "APPROVED" | "REJECTED" | "NEEDS_REVIEW"
- statusLabelKz: "Фото тексеруден өтті" | "Фото сәйкес келмейді" | "Қосымша тексеру қажет"
- reasonKz: Қазақ тіліндегі нақты әрі түсінікті себеп немесе бағалау түсіндірмесі (1-2 сөйлем).
- confidenceScore: 0 мен 100 аралығындағы сан.
- detectedObjects: Суреттен табылған нақты нысандар тізімі (қазақша).
- metricsSummary: Шамаланған көлем немесе нәтиже (мысалы: "3 қап қоқыс (~6 кг)", "1 жас көшет", "Белгісіз").
- isCompliant: Тек status === "APPROVED" болғанда true, әйтпесе false.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: normalizedMime,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              description: 'APPROVED, REJECTED, or NEEDS_REVIEW',
            },
            statusLabelKz: {
              type: Type.STRING,
              description: 'Қазақша мәртебе атауы',
            },
            reasonKz: {
              type: Type.STRING,
              description: 'Қазақша толық түсініктеме',
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: '0 to 100 score',
            },
            detectedObjects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Танылған объектілер',
            },
            metricsSummary: {
              type: Type.STRING,
              description: 'Көлем қорытындысы',
            },
            isCompliant: {
              type: Type.BOOLEAN,
              description: 'True only if fully compliant',
            },
          },
          required: [
            'status',
            'statusLabelKz',
            'reasonKz',
            'confidenceScore',
            'detectedObjects',
            'metricsSummary',
            'isCompliant',
          ],
        },
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    let status: EcoVerificationStatus = 'NEEDS_REVIEW';
    if (parsed.status === 'APPROVED' && parsed.isCompliant === true) {
      status = 'APPROVED';
    } else if (parsed.status === 'REJECTED') {
      status = 'REJECTED';
    } else {
      status = 'NEEDS_REVIEW';
    }

    const labelMap: Record<EcoVerificationStatus, string> = {
      APPROVED: 'Фото тексеруден өтті',
      REJECTED: 'Фото сәйкес келмейді',
      NEEDS_REVIEW: 'Қосымша тексеру қажет',
      NO_PHOTO: 'Фото жүктелмеді',
    };

    return {
      status,
      statusLabelKz: labelMap[status],
      reasonKz: parsed.reasonKz || (status === 'APPROVED' ? 'Экологиялық жұмыс сәтті расталды.' : 'Қосымша тексеру қажет.'),
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 75,
      detectedObjects: Array.isArray(parsed.detectedObjects) ? parsed.detectedObjects : [],
      metricsSummary: parsed.metricsSummary || '1 бірлік',
      isCompliant: status === 'APPROVED',
    };
  } catch (error: any) {
    console.error('Gemini vision analysis error:', error);
    // If AI fails or throws, do NOT approve automatically
    return {
      status: 'NEEDS_REVIEW',
      statusLabelKz: 'Қосымша тексеру қажет',
      reasonKz: 'Суретті өңдеу барысында қате шықты немесе байланыс үзілді. Қосымша тексеру талап етіледі.',
      confidenceScore: 0,
      detectedObjects: [],
      metricsSummary: 'Анықталмады',
      isCompliant: false,
    };
  }
}
