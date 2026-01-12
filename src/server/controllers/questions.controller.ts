/**
 * Questions controller - HTTP boundary layer
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validate';
import { defaultRateLimiter } from '../middlewares/rateLimit';
import { generateQuestions } from '../services/questions.service';
import { successResponse, errorResponse } from '../views/httpResponse';
import { logger } from '../middlewares/logging';

const requestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(3500, 'Text must be 3500 characters or less'),
});

export async function handleQuestionsRequest(request: NextRequest) {
  try {
    // Rate limiting
    defaultRateLimiter.check(request);

    // Validate request
    const body = await validateRequest(request, requestSchema);

    // Generate questions
    const result = await generateQuestions(body);

    logger.info('Questions generated successfully', {
      questionCount: result.questions.length,
    });

    return successResponse(result);
  } catch (error) {
    logger.error('Questions request failed', error);
    return errorResponse(error);
  }
}

