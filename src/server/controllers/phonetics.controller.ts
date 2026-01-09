/**
 * Phonetics controller - HTTP boundary layer
 */

import { Request } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validate';
import { defaultRateLimiter } from '../middlewares/rateLimit';
import { getPhoneticsData } from '../services/phonetics.service';
import { successResponse, errorResponse } from '../views/httpResponse';
import { logger } from '../middlewares/logging';

const requestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(3500, 'Text must be 3500 characters or less'),
});

export async function handlePhoneticsRequest(request: Request) {
  try {
    // Rate limiting
    defaultRateLimiter.check(request);

    // Validate request
    const body = await validateRequest(request, requestSchema);

    // Get phonetics data
    const result = await getPhoneticsData(body);

    logger.info('Phonetics data retrieved successfully', {
      wordCount: result.length,
    });

    return successResponse(result);
  } catch (error) {
    logger.error('Phonetics request failed', error);
    return errorResponse(error);
  }
}

