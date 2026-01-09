/**
 * Error handling middleware and custom error classes
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    public readonly service: string,
    details?: unknown
  ) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

export interface ErrorResponse {
  error: string;
  details?: string | unknown;
  code?: string;
}

/**
 * Maps an error to a safe HTTP response
 * Never leaks sensitive information in production
 */
export function mapErrorToResponse(error: unknown): {
  statusCode: number;
  response: ErrorResponse;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      response: {
        error: error.message,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
      },
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      response: {
        error: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    };
  }

  return {
    statusCode: 500,
    response: {
      error: 'An unknown error occurred',
    },
  };
}

