import { ProviderTimeoutError, ProviderUnavailableError } from '../errors/ImageGenerationError';
import { Logger } from '../utils/logger';
import { config } from '../config';

export interface ExternalImageRequest {
  prompt: string;
  style?: string;
  numImages: number;
}

export interface ExternalImageResponse {
  images: Array<{
    url?: string;
    base64?: string;
    storageKey?: string;
  }>;
  provider: string;
}

export class ExternalAIImageClient {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;
  private timeoutMs: number;
  private logger: Logger;

  constructor(
    apiKey: string = config.aiProvider.apiKey,
    apiEndpoint: string = config.aiProvider.endpoint,
    model: string = config.aiProvider.model,
    timeoutMs: number = config.aiProvider.timeoutMs
  ) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.logger = new Logger('ExternalAIImageClient');
  }

  async generateImages(request: ExternalImageRequest): Promise<ExternalImageResponse> {
    this.logger.info('Calling external AI image provider', {
      model: this.model,
      prompt: request.prompt.substring(0, 50),
      numImages: request.numImages,
    });

    try {
      const response = await this.makeRequest(request);
      
      this.logger.info('External AI provider responded successfully', {
        imageCount: response.images.length,
      });

      return response;
    } catch (error) {
      this.logger.error('External AI provider call failed', error as Error);
      throw this.handleProviderError(error);
    }
  }

  private async makeRequest(request: ExternalImageRequest): Promise<ExternalImageResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          prompt: request.prompt,
          n: 1,
          size: '1024x1024',
          ...(this.model.startsWith('dall-e-3') ? { quality: 'standard' } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error('Provider error response', new Error(`Status ${response.status}: ${errorBody}`));
        throw new Error(`Provider returned status ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as {
        data?: Array<{ url?: string; b64_json?: string }>;
      };

      const images = (data.data ?? []).map((img) => {
        if (img.url) {
          return { url: img.url };
        }
        if (img.b64_json) {
          return { base64: img.b64_json };
        }
        return {};
      }).filter((img) => img.url || img.base64);

      if (images.length === 0) {
        throw new Error('Provider returned no image data');
      }

      return {
        images,
        provider: this.model,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        throw new ProviderTimeoutError();
      }
      
      throw error;
    }
  }

  private handleProviderError(error: unknown): Error {
    if (error instanceof ProviderTimeoutError) {
      return error;
    }

    const errorMessage = (error as Error).message || 'Unknown error';
    
    if (errorMessage.includes('status 503') || errorMessage.includes('status 502')) {
      return new ProviderUnavailableError('Image generation service is temporarily unavailable');
    }

    if (errorMessage.includes('status 429')) {
      return new ProviderUnavailableError('Provider rate limit exceeded');
    }

    return new ProviderUnavailableError(`Provider error: ${errorMessage}`);
  }
}
