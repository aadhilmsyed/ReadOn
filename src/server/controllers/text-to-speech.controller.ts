/**
 * Text-to-speech controller - HTTP boundary layer
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { validateRequest } from '../middlewares/validate';
import { defaultRateLimiter } from '../middlewares/rateLimit';
import { generateSpeech } from '../services/text-to-speech.service';
import { errorResponse } from '../views/httpResponse';
import { logger } from '../middlewares/logging';

const requestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(3500, 'Text must be 3500 characters or less'),
});

export async function handleTextToSpeechRequest(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    defaultRateLimiter.check(request);

    // Validate request
    const body = await validateRequest(request, requestSchema);

    // Generate speech
    const audioData = await generateSpeech(body);

    logger.info('Text-to-speech generated successfully', {
      audioSize: audioData.byteLength,
    });

    // Return audio data with appropriate headers
    return new NextResponse(audioData, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      },
    });
  } catch (error) {
    logger.error('Text-to-speech request failed', error);
    return errorResponse(error);
  }
}

