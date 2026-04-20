import { IImageGenerationService } from './IImageGenerationService';
import { GenerateImageRequestDTO, GenerateImageResponseDTO, GeneratedImageDTO } from '../types/dtos';
import { ExternalAIImageClient } from '../clients/ExternalAIImageClient';
import { CloudStorageClient } from '../clients/CloudStorageClient';
import { Logger } from '../utils/logger';
import { retryWithBackoff } from '../utils/retryPolicy';
import { ErrorCode, GenerationStatus } from '../types/enums';

export class RealImageGenerationService implements IImageGenerationService {
  private client: ExternalAIImageClient;
  private storageClient: CloudStorageClient;
  private logger: Logger;

  constructor(client?: ExternalAIImageClient, storageClient?: CloudStorageClient) {
    this.client = client || new ExternalAIImageClient();
    this.storageClient = storageClient || new CloudStorageClient();
    this.logger = new Logger('RealImageGenerationService');
  }

  async generateImage(request: GenerateImageRequestDTO): Promise<GenerateImageResponseDTO> {
    this.logger.info('Calling external provider for image generation', {
      prompt: request.prompt.substring(0, 50),
      numImages: request.numImages || 1,
    });

    try {
      // Step 1: Generate image with AI provider
      const response = await retryWithBackoff(
        () => this.client.generateImages({
          prompt: request.prompt,
          style: request.style,
          numImages: request.numImages || 1,
        }),
        { maxRetries: 2 }
      );

      this.logger.info('External provider returned images successfully', {
        imageCount: response.images.length,
      });

      // Step 2: Upload images to Cloud Storage
      this.logger.info('Starting GCS upload process', {
        imageCount: response.images.length,
        storyId: request.storyId,
        paragraphIndex: request.paragraphIndex,
      });
      
      const images: GeneratedImageDTO[] = [];
      
      for (let i = 0; i < response.images.length; i++) {
        const tempUrl = response.images[i].url;
        this.logger.info(`Processing image ${i + 1}/${response.images.length}`, {
          tempUrlPreview: tempUrl.substring(0, 80) + '...',
        });
        
        try {
          // Download image from temporary URL
          this.logger.info('Downloading image from temporary URL...');
          const imageBuffer = await this.storageClient.downloadImage(tempUrl);
          this.logger.info('Image downloaded successfully', { sizeBytes: imageBuffer.length });
          
          // Upload to GCS with proper path structure
          const storyId = request.storyId || 'default';
          const paragraphIndex = request.paragraphIndex ?? 0;
          const generationId = `gen-${Date.now()}-${i}`;
          
          this.logger.info('Uploading to GCS...', {
            storyId,
            paragraphIndex,
            generationId,
            bucket: process.env.READON_STORAGE_BUCKET,
          });
          
          const permanentUrl = await this.storageClient.uploadImage({
            storyId,
            paragraphIndex,
            generationId,
            imageBuffer,
          });
          
          // Build storage key for database
          const storageKey = `visualization/stories/${storyId}/paragraphs/${paragraphIndex}/${generationId}.png`;
          
          images.push({
            url: permanentUrl,
            provider: response.provider,
            storageKey,
          });
          
          this.logger.info('✅ Image successfully uploaded to GCS', {
            permanentUrl,
            storageKey,
            tempUrlExpires: 'in ~2 hours',
            permanentUrlExpires: 'never',
          });
        } catch (uploadError) {
          this.logger.error('❌ Failed to upload image to GCS, using temporary URL as fallback', uploadError as Error);
          this.logger.warn('Image will expire in ~2 hours', { tempUrl: tempUrl.substring(0, 80) });
          // Fallback to temporary URL if upload fails
          images.push({
            url: tempUrl,
            provider: response.provider,
          });
        }
      }
      
      this.logger.info('GCS upload process completed', {
        totalImages: images.length,
        successfulUploads: images.filter(img => img.storageKey).length,
        fallbackUrls: images.filter(img => !img.storageKey).length,
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
