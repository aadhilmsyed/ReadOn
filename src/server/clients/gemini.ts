/**
 * Google Gemini client wrapper with retry logic and timeout handling
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { ExternalServiceError } from '../middlewares/errors';
import { logger } from '../middlewares/logging';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates content using Gemini with retry logic
   */
  async generateContent(
    prompt: string,
    options: {
      timeout?: number;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<string> {
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
    const retryDelay = options.retryDelay || DEFAULT_RETRY_DELAY;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Use Promise.race for timeout since Gemini SDK doesn't support AbortSignal directly
        const resultPromise = this.model.generateContent(prompt);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const response = result.response;
        return response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isRateLimit =
          error instanceof Error &&
          (error.message.includes('rate_limit') ||
            error.message.includes('429') ||
            (error as any).status === 429);

        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt);
          logger.warn(
            `Gemini rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await this.sleep(delay);
          continue;
        }

        if (attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt);
          logger.warn(
            `Gemini request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
            error
          );
          await this.sleep(delay);
          continue;
        }

        throw new ExternalServiceError(
          `Failed to generate content after ${maxRetries} attempts: ${lastError.message}`,
          'Gemini',
          { originalError: lastError.message }
        );
      }
    }

    throw new ExternalServiceError(
      `Failed to generate content: ${lastError?.message || 'Unknown error'}`,
      'Gemini'
    );
  }
}

export const geminiClient = new GeminiClient();

