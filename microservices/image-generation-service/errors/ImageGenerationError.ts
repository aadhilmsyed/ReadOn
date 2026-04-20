import { ErrorCode } from '../types/enums';

export class ImageGenerationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

export class ValidationError extends ImageGenerationError {
  constructor(message: string) {
    super(ErrorCode.INVALID_REQUEST, message, false);
    this.name = 'ValidationError';
  }
}

export class ProviderTimeoutError extends ImageGenerationError {
  constructor(message: string = 'Image generation service timed out') {
    super(ErrorCode.IMAGE_PROVIDER_TIMEOUT, message, true);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderUnavailableError extends ImageGenerationError {
  constructor(message: string = 'Image generation service is unavailable') {
    super(ErrorCode.IMAGE_PROVIDER_UNAVAILABLE, message, true);
    this.name = 'ProviderUnavailableError';
  }
}

export class RateLimitError extends ImageGenerationError {
  constructor(message: string = 'Rate limit exceeded') {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, false);
    this.name = 'RateLimitError';
  }
}

export class StorageError extends ImageGenerationError {
  constructor(message: string = 'Failed to store image metadata') {
    super(ErrorCode.STORAGE_FAILURE, message, true);
    this.name = 'StorageError';
  }
}
