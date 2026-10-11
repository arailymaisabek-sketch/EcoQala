import { AiVisionProvider } from './types';
import { GeminiVisionProvider } from './geminiProvider';
import { OpenAiVisionProvider } from './openaiProvider';

export function getVisionProvider(): AiVisionProvider {
  const preferred = (process.env.AI_PROVIDER || '').toLowerCase();

  if (preferred === 'openai') {
    const openai = new OpenAiVisionProvider();
    if (openai.isAvailable()) {
      return openai;
    }
  }

  // Default to Gemini (or fallback if OpenAI is not available)
  const gemini = new GeminiVisionProvider();
  if (gemini.isAvailable()) {
    return gemini;
  }

  // If OpenAI has a key but Gemini doesn't:
  const openaiFallback = new OpenAiVisionProvider();
  if (openaiFallback.isAvailable()) {
    return openaiFallback;
  }

  // Return gemini provider anyway (which will indicate it is unavailable if checked)
  return gemini;
}
