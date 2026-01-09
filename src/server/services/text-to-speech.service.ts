/**
 * Text-to-speech service - business logic for audio generation
 */

import { TextToSpeechRequest } from '../models/text-to-speech';
import { openAIClient } from '../clients/openai';
import { audiobookCache, getCachedAudio } from '../../utils/caches';
import { logger } from '../middlewares/logging';

/**
 * Generates text-to-speech audio
 */
export async function generateSpeech(
  request: TextToSpeechRequest
): Promise<ArrayBuffer> {
  const { text } = request;

  // Check cache first
  const cached = getCachedAudio(text);
  if (cached) {
    logger.debug('Using cached audio', { textLength: text.length });
    return cached;
  }

  logger.info('Generating speech', { textLength: text.length });

  // Generate audio
  const audioBuffer = await openAIClient.generateSpeech(text, {
    model: 'tts-1',
    voice: 'alloy',
  });

  // Cache the result
  audiobookCache.put(text, audioBuffer);

  logger.info('Speech generated successfully', {
    audioSize: audioBuffer.byteLength,
  });

  return audioBuffer;
}

