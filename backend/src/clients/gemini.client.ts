import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Model names — pinned to non-deprecated, GA versions as of Sept 2026
const EMBEDDING_MODEL = 'gemini-embedding-001';
const GENERATION_MODEL = 'gemini-3.5-flash';

// Matryoshka truncation: request 768 dims explicitly.
// gemini-embedding-001 defaults to 3072 — do NOT omit this or VECTOR(768) inserts will fail.
const EMBEDDING_DIMENSIONS = 768;

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff retry wrapper.
 * Doubles delay each attempt: 1s, 2s, 4s, 8s, 16s — then gives up.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  attempt = 0
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (attempt >= MAX_RETRIES - 1) {
      logger.error(`[GeminiClient] ${context} failed after ${MAX_RETRIES} attempts`, {}, err as Error);
      throw err;
    }
    const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
    logger.warn(`[GeminiClient] ${context} attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
    await sleep(delayMs);
    return withRetry(fn, context, attempt + 1);
  }
}

class GeminiClient {
  private genAI: GoogleGenerativeAI | null = null;

  private getClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      if (!env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set. Cannot use real Track B pipeline.');
      }
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
    return this.genAI;
  }

  /**
   * Embed a batch of texts.
   * Returns an array of 768-dimensional float vectors (one per input text).
   * Explicitly requests output_dimensionality=768 via Matryoshka truncation.
   */
  public async embedTexts(texts: string[]): Promise<number[][]> {
    return withRetry(async () => {
      const client = this.getClient();
      const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });

      const results: number[][] = [];
      for (const text of texts) {
        const response = await model.embedContent({
          content: { role: 'user', parts: [{ text }] },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
          // Matryoshka truncation to 768 dims — critical, default is 3072
          // @ts-expect-error: outputDimensionality is a valid API param not yet in @types
          outputDimensionality: EMBEDDING_DIMENSIONS,
        });
        results.push(response.embedding.values);
      }
      return results;
    }, `embedTexts(batch of ${texts.length})`);
  }

  /**
   * Embed a single query string for retrieval.
   * Uses RETRIEVAL_QUERY task type (different from RETRIEVAL_DOCUMENT for better asymmetric matching).
   */
  public async embedQuery(queryText: string): Promise<number[]> {
    return withRetry(async () => {
      const client = this.getClient();
      const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
      const response = await model.embedContent({
        content: { role: 'user', parts: [{ text: queryText }] },
        taskType: TaskType.RETRIEVAL_QUERY,
        // @ts-expect-error: outputDimensionality is a valid API param not yet in @types
        outputDimensionality: EMBEDDING_DIMENSIONS,
      });
      return response.embedding.values;
    }, 'embedQuery');
  }

  /**
   * Generate text using gemini-3.5-flash.
   * systemPrompt is injected as the system instruction.
   */
  public async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    return withRetry(async () => {
      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: GENERATION_MODEL,
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      if (!text) throw new Error('Gemini returned empty response');
      return text;
    }, 'generateText');
  }

  /**
   * Generate text with Gemini function-calling tools (for the impact agent).
   * Returns either the final text answer or the first tool call request.
   */
  public async generateWithTools(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }> }>,
    tools: unknown[]
  ): Promise<{ text?: string; toolCall?: { name: string; args: Record<string, unknown> } }> {
    return withRetry(async () => {
      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: GENERATION_MODEL,
        systemInstruction: systemPrompt,
        // @ts-expect-error: tools typing is complex in current SDK version
        tools,
      });

      // @ts-expect-error: conversationHistory typing
      const chat = model.startChat({ history: conversationHistory.slice(0, -1) });
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      const lastText = (lastMessage?.parts?.[0] as { text?: string })?.text ?? '';

      const result = await chat.sendMessage(lastText);
      const response = result.response;

      // Check if model wants to call a tool
      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0] as { functionCall?: { name: string; args: Record<string, unknown> }; text?: string } | undefined;

      if (part?.functionCall) {
        return { toolCall: { name: part.functionCall.name, args: part.functionCall.args } };
      }

      return { text: response.text() };
    }, 'generateWithTools');
  }
}

export const geminiClient = new GeminiClient();
