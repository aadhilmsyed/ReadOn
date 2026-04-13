import { IImageGenerationService } from './IImageGenerationService';
import { GenerateImageRequestDTO, GenerateImageResponseDTO, GeneratedImageDTO } from '../types/dtos';
import { ExternalAIImageClient } from '../clients/ExternalAIImageClient';
import { Logger } from '../utils/logger';
import { retryWithBackoff } from '../utils/retryPolicy';
import { ErrorCode, GenerationStatus } from '../types/enums';

export class RealImageGenerationService implements IImageGenerationService {
  private client: ExternalAIImageClient;
  private logger: Logger;

  constructor(client?: ExternalAIImageClient) {
    this.client = client || new ExternalAIImageClient();
    this.logger = new Logger('RealImageGenerationService');
  }

  async generateImage(request: GenerateImageRequestDTO): Promise<GenerateImageResponseDTO> {
    this.logger.info('Calling external provider for image generation', {
      prompt: request.prompt.substring(0, 50),
      numImages: request.numImages || 1,
    });

    try {
      const response = await retryWithBackoff(
        () => this.client.generateImages({
          prompt: request.prompt,
          style: request.style,
          numImages: request.numImages || 1,
        }),
        { maxRetries: 2 }
      );

      const images: GeneratedImageDTO[] = response.images.map(img => ({
        url: img.url,
        provider: response.provider,
        storageKey: img.storageKey,
      }));

      this.logger.info('External provider returned images successfully', {
        imageCount: images.length,
      });

      return {
        success: true,
        requestId: '',
        storyId: request.storyId,
        status: GenerationStatus.COMPLETED,
        images,
        cached: false,
      };
    } catch (error) {
      this.logger.error('External provider failed to generate images', error as Error);

      return {
        success: false,
        requestId: '',
        storyId: request.storyId,
        status: GenerationStatus.FAILED,
        cached: false,
        error: {
          code: ErrorCode.IMAGE_PROVIDER_UNAVAILABLE,
          message: (error as Error).message || 'Image generation failed',
        },
      };
    }
  }

  async getGenerationStatus(requestId: string): Promise<GenerateImageResponseDTO> {
    throw new Error('Status retrieval not supported in real service - use proxy');
  }
}
