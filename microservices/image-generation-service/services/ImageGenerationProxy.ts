import { IImageGenerationService } from './IImageGenerationService';
import { RealImageGenerationService } from './RealImageGenerationService';
import { GenerateImageRequestDTO, GenerateImageResponseDTO } from '../types/dtos';
import { IImageGenerationCache, CachedImageResult } from '../cache/IImageGenerationCache';
import { IImageMetadataRepository } from '../repositories/IImageMetadataRepository';
import { ImageGenerationMetadata, createImageGenerationMetadata } from '../models/ImageGenerationMetadata';
import { generateCacheKey } from '../utils/cacheKeyGenerator';
import { generateRequestId } from '../utils/requestIdGenerator';
import { RateLimiter } from '../utils/rateLimiter';
import { Logger } from '../utils/logger';
import { ValidationError, ImageGenerationError } from '../errors/ImageGenerationError';
import { GenerationStatus, ErrorCode } from '../types/enums';

export class ImageGenerationProxy implements IImageGenerationService {
  private realService: IImageGenerationService;
  private cache: IImageGenerationCache | null;
  private repository: IImageMetadataRepository;
  private rateLimiter: RateLimiter | null;
  private logger: Logger;

  constructor(
    realService?: IImageGenerationService,
    cache?: IImageGenerationCache | null,
    repository?: IImageMetadataRepository,
    rateLimiter?: RateLimiter | null
  ) {
    this.realService = realService || new RealImageGenerationService();
    this.cache = cache || null;
    this.repository = repository!;
    this.rateLimiter = rateLimiter || null;
    this.logger = new Logger('ImageGenerationProxy');
  }

  async generateImage(request: GenerateImageRequestDTO): Promise<GenerateImageResponseDTO> {
    const requestId = generateRequestId();
    
    this.logger.info('Image generation request received', {
      requestId,
      storyId: request.storyId,
      userId: request.userId,
    });

    // Step 1: Validate request
    const validationError = this.validateRequest(request);
    if (validationError) {
      this.logger.warn('Request validation failed', { requestId, error: validationError });
      return this.buildErrorResponse(requestId, request.storyId, validationError);
    }

    // Step 2: Check cache
    const cacheKey = generateCacheKey(request);
    const cachedResult = await this.checkCache(cacheKey, requestId);
    if (cachedResult) {
      this.logger.info('Cache hit - returning cached result', { requestId, cacheKey });
      return this.buildCachedResponse(requestId, request.storyId, cachedResult);
    }

    this.logger.info('Cache miss - proceeding with generation', { requestId, cacheKey });

    // Step 3: Check rate limit
    const rateLimitError = await this.checkRateLimit(requestId);
    if (rateLimitError) {
      return this.buildErrorResponse(requestId, request.storyId, rateLimitError);
    }

    // Step 4: Create and save initial metadata
    const metadata = createImageGenerationMetadata(requestId, request.prompt, {
      storyId: request.storyId,
      userId: request.userId,
      style: request.style,
      theme: request.theme,
      ageGroup: request.ageGroup,
      numImages: request.numImages,
    });

    await this.saveMetadata(metadata);

    // Step 5: Call real service
    this.logger.info('Calling real image generation service', { requestId });
    const result = await this.realService.generateImage(request);

    // Step 6: Update metadata based on result
    await this.updateMetadataFromResult(requestId, result);

    // Step 7: Cache successful result
    if (result.success && result.images) {
      await this.cacheResult(cacheKey, requestId, result);
    }

    // Step 8: Return response with requestId
    const response: GenerateImageResponseDTO = {
      ...result,
      requestId,
    };

    this.logger.info('Image generation completed', {
      requestId,
      success: result.success,
      imageCount: result.images?.length || 0,
    });

    return response;
  }

  async getGenerationStatus(requestId: string): Promise<GenerateImageResponseDTO> {
    this.logger.info('Status request received', { requestId });

    const metadata = await this.repository.findById(requestId);

    if (!metadata) {
      this.logger.warn('Metadata not found for requestId', { requestId });
      return {
        success: false,
        requestId,
        status: GenerationStatus.FAILED,
        cached: false,
        error: {
          code: ErrorCode.INVALID_REQUEST,
          message: `No generation found with requestId: ${requestId}`,
        },
      };
    }

    return {
      success: metadata.status === GenerationStatus.COMPLETED,
      requestId: metadata.id,
      storyId: metadata.storyId,
      status: metadata.status,
      images: metadata.imageUrls.map(url => ({
        url,
        provider: metadata.provider,
      })),
      cached: metadata.cached,
      error: metadata.errorMessage ? {
        code: ErrorCode.INTERNAL_ERROR,
        message: metadata.errorMessage,
      } : undefined,
    };
  }

  private validateRequest(request: GenerateImageRequestDTO): ImageGenerationError | null {
    if (!request.prompt || request.prompt.trim().length === 0) {
      return new ValidationError('Prompt is required and cannot be empty');
    }

    if (request.prompt.length > 2000) {
      return new ValidationError('Prompt exceeds maximum length of 2000 characters');
    }

    if (request.numImages && (request.numImages < 1 || request.numImages > 4)) {
      return new ValidationError('numImages must be between 1 and 4');
    }

    return null;
  }

  private async checkCache(cacheKey: string, requestId: string): Promise<CachedImageResult | null> {
    if (!this.cache) {
      return null;
    }

    try {
      return await this.cache.get(cacheKey);
    } catch (error) {
      this.logger.warn('Cache lookup failed, proceeding without cache', {
        requestId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  private async checkRateLimit(requestId: string): Promise<ImageGenerationError | null> {
    if (!this.rateLimiter) {
      return null;
    }

    try {
      await this.rateLimiter.checkLimit();
      return null;
    } catch (error) {
      if (error instanceof ImageGenerationError) {
        this.logger.warn('Rate limit exceeded', { requestId });
        return error;
      }
      return null;
    }
  }

  private async saveMetadata(metadata: ImageGenerationMetadata): Promise<void> {
    try {
      await this.repository.save(metadata);
      this.logger.info('Metadata saved', { requestId: metadata.id });
    } catch (error) {
      this.logger.error('Failed to save metadata', error as Error, { requestId: metadata.id });
    }
  }

  private async updateMetadataFromResult(
    requestId: string,
    result: GenerateImageResponseDTO
  ): Promise<void> {
    try {
      await this.repository.update(requestId, {
        status: result.success ? GenerationStatus.COMPLETED : GenerationStatus.FAILED,
        imageUrls: result.images?.map(img => img.url) || [],
        storageKeys: result.images?.map(img => img.storageKey).filter((key): key is string => !!key) || [],
        errorMessage: result.error?.message,
      });
      this.logger.info('Metadata updated', { requestId, status: result.success ? 'COMPLETED' : 'FAILED' });
    } catch (error) {
      this.logger.error('Failed to update metadata', error as Error, { requestId });
    }
  }

  private async cacheResult(
    cacheKey: string,
    requestId: string,
    result: GenerateImageResponseDTO
  ): Promise<void> {
    if (!this.cache || !result.images) {
      return;
    }

    try {
      const cacheEntry: CachedImageResult = {
        requestId,
        imageUrls: result.images.map(img => img.url),
        provider: result.images[0]?.provider || 'external-ai-provider',
        cachedAt: new Date(),
      };

      await this.cache.set(cacheKey, cacheEntry);
      this.logger.info('Result cached', { requestId, cacheKey });
    } catch (error) {
      this.logger.warn('Failed to cache result', {
        requestId,
        error: (error as Error).message,
      });
    }
  }

  private buildCachedResponse(
    requestId: string,
    storyId: string | undefined,
    cached: CachedImageResult
  ): GenerateImageResponseDTO {
    return {
      success: true,
      requestId,
      storyId,
      status: GenerationStatus.COMPLETED,
      images: cached.imageUrls.map(url => ({
        url,
        provider: cached.provider,
      })),
      cached: true,
    };
  }

  private buildErrorResponse(
    requestId: string,
    storyId: string | undefined,
    error: ImageGenerationError
  ): GenerateImageResponseDTO {
    return {
      success: false,
      requestId,
      storyId,
      status: GenerationStatus.FAILED,
      cached: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }
}
