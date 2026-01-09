/**
 * Request validation middleware using Zod
 */

import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Validates request body against a Zod schema
 * Throws ValidationError if validation fails
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Invalid request data',
        error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    throw new ValidationError('Invalid JSON in request body');
  }
}

