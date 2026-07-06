import { VertexAI } from '@google-cloud/vertexai';

import { ProviderTimeoutError, ProviderUnavailableError } from '../errors/ImageGenerationError';
import { Logger } from '../utils/logger';
import { config } from '../config';
import type { IImageProvider, ImageProviderRequest, ImageProviderResponse } from './IImageProvider';

/** Vertex AI Gemini native image generation (Nano Banana). */
export class VertexGeminiImageClient implements IImageProvider {
  private project: string;
  private location: string;
  private model: string;
  private timeoutMs: number;
  private logger: Logger;

  constructor(
    project: string = config.vertex.project,
    location: string = config.vertex.location,
    model: string = config.aiProvider.model,
    timeoutMs: number = config.aiProvider.timeoutMs,
  ) {
    this.project = project;
    this.location = location;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.logger = new Logger('VertexGeminiImageClient');
  }

  async generateImages(request: ImageProviderRequest): Promise<ImageProviderResponse> {
    this.logger.info('Calling Vertex Gemini image provider', {
      model: this.model,
      project: this.project,
      location: this.location,
      prompt: request.prompt.substring(0, 50),
    });

    try {
      const images = await this.generateWithTimeout(request);
      if (images.length === 0) {
        throw new Error('Vertex returned no image data');
      }
      return { images, provider: `vertex:${this.model}` };
    } catch (error) {
      this.logger.error('Vertex Gemini image call failed', error as Error);
      throw this.handleProviderError(error);
    }
  }

  private async generateWithTimeout(request: ImageProviderRequest): Promise<ImageProviderResponse['images']> {
    const work = this.callVertex(request);
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ProviderTimeoutError()), this.timeoutMs);
    });
    return Promise.race([work, timeout]);
  }

  private async callVertex(request: ImageProviderRequest): Promise<ImageProviderResponse['images']> {
    const vertexAI = new VertexAI({ project: this.project, location: this.location });
    const generativeModel = vertexAI.getGenerativeModel({ model: this.model });

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        // Image models require responseModalities (not yet in SDK typings).
        responseModalities: ['IMAGE'],
      } as Record<string, unknown>,
    });

    const parts = result.response?.candidates?.[0]?.content?.parts ?? [];
    const images: ImageProviderResponse['images'] = [];

    for (const part of parts) {
      const inline = part.inlineData;
      if (inline?.data) {
        images.push({ base64: inline.data });
      }
    }

    return images;
  }

  private handleProviderError(error: unknown): Error {
    if (error instanceof ProviderTimeoutError) {
      return error;
    }

    const errorMessage = (error as Error).message || 'Unknown error';

    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
      return new ProviderUnavailableError('Vertex AI rate limit or quota exceeded');
    }

    if (errorMessage.includes('503') || errorMessage.includes('502')) {
      return new ProviderUnavailableError('Vertex AI is temporarily unavailable');
    }

    return new ProviderUnavailableError(`Vertex error: ${errorMessage}`);
  }
}
