import { parseAudiobookNarrationRequest } from '../models/audiobookModel';
import { synthesizeNarration } from '../services/audiobookService';

/**
 * Entry point for narration: validate body → TTS → structured result.
 * Callers map `AudiobookNarrationResult` to HTTP (binary audio) or internal queues.
 */
export async function handleAudiobookRequest(body: unknown) {
  const request = parseAudiobookNarrationRequest(body);
  return synthesizeNarration(request);
}
