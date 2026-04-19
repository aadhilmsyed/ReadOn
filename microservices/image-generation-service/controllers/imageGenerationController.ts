import { IImageGenerationService } from '../services/IImageGenerationService';
import { GenerateImageRequestDTO, GenerateImageResponseDTO, GetStatusResponseDTO } from '../types/dtos';
import { ValidationError } from '../errors/ImageGenerationError';
import { ErrorCode } from '../types/enums';
import { Logger } from '../utils/logger';

export interface HttpRequest {
  body: unknown;
  params: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  body: GenerateImageResponseDTO | GetStatusResponseDTO;
}

export class ImageGenerationController {
  private readonly service: IImageGenerationService;
  private readonly logger: Logger;

  constructor(service: IImageGenerationService) {
    this.service = service;
    this.logger = new Logger('ImageGenerationController');
  }

  async handleGenerateImage(req: HttpRequest): Promise<HttpResponse> {
    this.logger.info('POST /images/generate received');

    try {
      const requestDTO = this.parseAndValidateRequest(req.body);
      const result = await this.service.generateImage(requestDTO);

      return {
        status: result.success ? 200 : 500,
        body: result,
      };
    } catch (error) {
      this.logger.error('Controller error in handleGenerateImage', error as Error);

      if (error instanceof ValidationError) {
        return {
          status: 400,
          body: {
            success: false,
            requestId: '',
            status: 'FAILED',
            cached: false,
            error: {
              code: error.code,
              message: error.message,
            },
          },
        };
      }

      return {
        status: 500,
        body: {
          success: false,
          requestId: '',
          status: 'FAILED',
          cached: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
          },
        },
      };
    }
  }

  async handleGetStatus(req: HttpRequest): Promise<HttpResponse> {
    const { requestId } = req.params;

    this.logger.info('GET /images/:requestId received', { requestId });

    if (!requestId) {
      return {
        status: 400,
        body: {
          success: false,
          requestId: '',
          status: 'FAILED',
          cached: false,
          error: {
            code: ErrorCode.INVALID_REQUEST,
            message: 'requestId is required',
          },
        },
      };
    }

    try {
      const result = await this.service.getGenerationStatus(requestId);

      return {
        status: result.success ? 200 : 404,
        body: result,
      };
    } catch (error) {
      this.logger.error('Controller error in handleGetStatus', error as Error);

      return {
        status: 500,
        body: {
          success: false,
          requestId,
          status: 'FAILED',
          cached: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
          },
        },
      };
    }
  }

  private parseAndValidateRequest(body: unknown): GenerateImageRequestDTO {
    if (!body || typeof body !== 'object') {
      throw new ValidationError('Request body is required');
    }

    const data = body as Record<string, unknown>;

    if (!data.prompt || typeof data.prompt !== 'string') {
      throw new ValidationError('prompt is required and must be a string');
    }

    return {
      storyId: typeof data.storyId === 'string' ? data.storyId : undefined,
      userId: typeof data.userId === 'string' ? data.userId : undefined,
      prompt: data.prompt,
      style: typeof data.style === 'string' ? data.style : undefined,
      theme: typeof data.theme === 'string' ? data.theme : undefined,
      ageGroup: typeof data.ageGroup === 'string' ? data.ageGroup : undefined,
      numImages: typeof data.numImages === 'number' ? data.numImages : 1,
    };
  }
}
