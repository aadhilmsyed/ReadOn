/**
 * OpenAI client wrapper with retry logic and timeout handling
 */

import OpenAI from 'openai';
import { env } from '../config/env';
import { ExternalServiceError } from '../middlewares/errors';
import { logger } from '../middlewares/logging';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

export class OpenAIClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Exponential backoff retry helper
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates an image using DALL-E with retry logic
   */
  async generateImage(
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await this.client.images.generate(
            {
              model: 'dall-e-3',
              prompt: prompt,
              n: 1,
              size: '1024x1024',
              quality: 'standard',
            },
            {
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          const imageUrl = response.data[0]?.url;
          if (!imageUrl) {
            throw new Error('No image URL returned from OpenAI');
          }

          return imageUrl;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const isRateLimit = 
          error instanceof Error &&
          (error.message.includes('rate_limit') || 
           error.message.includes('429') ||
           (error as any).status === 429);

        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt);
          logger.warn(`OpenAI rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        if (attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt);
          const errorMeta: Record<string, unknown> = {
            attempt: attempt + 1,
            maxRetries,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
            } : String(error),
          };
          logger.warn(`OpenAI request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, errorMeta);
          await this.sleep(delay);
          continue;
        }

        throw new ExternalServiceError(
          `Failed to generate image after ${maxRetries} attempts: ${lastError.message}`,
          'OpenAI',
          { originalError: lastError.message }
        );
      }
    }

    throw new ExternalServiceError(
      `Failed to generate image: ${lastError?.message || 'Unknown error'}`,
      'OpenAI'
    );
  }

  /**
   * Generates text-to-speech audio
   */
  async generateSpeech(
    text: string,
    options: {
      model?: string;
      voice?: string;
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<ArrayBuffer> {
    const timeout = options.timeout || 30000;
    const maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
    const model = options.model || 'tts-1';
    const voice = options.voice || 'alloy';

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await this.client.audio.speech.create(
            {
              model,
              voice: voice as any,
              input: text,
            },
            {
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);
          return await response.arrayBuffer();
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries - 1) {
          const delay = DEFAULT_RETRY_DELAY * Math.pow(2, attempt);
          const errorMeta: Record<string, unknown> = {
            attempt: attempt + 1,
            maxRetries,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
            } : String(error),
          };
          logger.warn(`OpenAI TTS request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, errorMeta);
          await this.sleep(delay);
          continue;
        }

        throw new ExternalServiceError(
          `Failed to generate speech after ${maxRetries} attempts: ${lastError.message}`,
          'OpenAI',
          { originalError: lastError.message }
        );
      }
    }

    throw new ExternalServiceError(
      `Failed to generate speech: ${lastError?.message || 'Unknown error'}`,
      'OpenAI'
    );
  }
}

export const openAIClient = new OpenAIClient();

