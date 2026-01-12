/**
 * Visualization controller - HTTP boundary layer
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validate';
import { strictRateLimiter } from '../middlewares/rateLimit';
import { generateVisualizations } from '../services/visualization.service';
import { successResponse, errorResponse } from '../views/httpResponse';
import { logger } from '../middlewares/logging';

const requestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(3500, 'Text must be 3500 characters or less'),
});

export async function handleVisualizationRequest(request: NextRequest) {
  try {
    // Rate limiting
    strictRateLimiter.check(request);

    // Validate request
    const body = await validateRequest(request, requestSchema);

    // Generate visualizations
    const result = await generateVisualizations(body);

    logger.info('Visualization generated successfully', {
      resultCount: result.results.length,
    });

    return successResponse(result);
  } catch (error) {
    logger.error('Visualization request failed', error);
    return errorResponse(error);
  }
}

