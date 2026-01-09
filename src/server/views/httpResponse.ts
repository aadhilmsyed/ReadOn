/**
 * HTTP response helpers for consistent JSON responses
 */

import { NextResponse } from 'next/server';
import { mapErrorToResponse } from '../middlewares/errors';

/**
 * Creates a successful JSON response
 */
export function successResponse<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json(data, { status: statusCode });
}

/**
 * Creates an error response from an error
 */
export function errorResponse(error: unknown): NextResponse {
  const { statusCode, response } = mapErrorToResponse(error);
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Wraps an async handler with error handling
 */
export function withErrorHandling(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

