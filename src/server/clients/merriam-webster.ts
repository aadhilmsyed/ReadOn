/**
 * Merriam-Webster Dictionary API client with retry logic
 */

import { env } from '../config/env';
import { ExternalServiceError } from '../middlewares/errors';
import { logger } from '../middlewares/logging';
import { WordData } from '../models/phonetics';

const BASE_URL = 'https://www.dictionaryapi.com/api/v3/references/collegiate/json';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 500; // 500ms

export class MerriamWebsterClient {
  private apiKey: string;

  constructor() {
    this.apiKey = env.MERRIAM_WEBSTER_API_KEY;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets audio URL from audio file name
   */
  private getAudioUrl(audioFile: string): string {
    let subdir: string;

    if (audioFile.startsWith('bix')) {
      subdir = 'bix';
    } else if (audioFile.startsWith('gg')) {
      subdir = 'gg';
    } else if (audioFile.startsWith('_')) {
      subdir = 'number';
    } else {
      subdir = audioFile[0];
    }

    return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioFile}.mp3`;
  }

  /**
   * Fetches word data from Merriam-Webster API with retry logic
   */
  async getWordData(
    word: string,
    options: {
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<WordData | null> {
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;

    const url = `${BASE_URL}/${encodeURIComponent(word)}?key=${this.apiKey}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 404) {
              return null; // Word not found
            }
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          if (!data?.[0] || typeof data[0] !== 'object') {
            return null;
          }

          const wordData = data[0];

          if (wordData.hwi?.prs?.[0]) {
            const pronunciation = wordData.hwi.prs[0];
            const phonetic = pronunciation.mw || '';
            const audioFile = pronunciation.sound?.audio || '';
            const definition = wordData.shortdef?.[0] || '';

            return {
              word,
              phonetic,
              audio_url: audioFile ? this.getAudioUrl(audioFile) : null,
              definition,
            };
          }

          return null;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delay = DEFAULT_RETRY_DELAY * Math.pow(2, attempt);
          logger.debug(
            `Merriam-Webster request failed for "${word}", retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await this.sleep(delay);
          continue;
        }

        // Don't throw for individual word failures, just log
        logger.warn(`Failed to fetch word data for "${word}" after ${maxRetries} attempts`, {
          error: lastError.message,
        });
        return null;
      }
    }

    return null;
  }
}

export const merriamWebsterClient = new MerriamWebsterClient();

