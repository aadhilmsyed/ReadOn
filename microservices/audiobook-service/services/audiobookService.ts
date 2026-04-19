import { synthesizeAudiobookSpeech } from '@orchestrators/features/audiobook/synthesizeSpeech';

import type { AudiobookNarrationRequest, AudiobookNarrationResult } from '../models/audiobookModel';
import { buildAudiobookNarrationResult } from '../models/audiobookModel';

/**
 * Runs Google Cloud TTS for the given narration request.
 * `storyId` is carried through for downstream logging or caching; synthesis uses `sourceText` only.
 */
export async function synthesizeNarration(request: AudiobookNarrationRequest): Promise<AudiobookNarrationResult> {
  const { audioBuffer, mimeType } = await synthesizeAudiobookSpeech(request.sourceText);
  return buildAudiobookNarrationResult(request, audioBuffer, mimeType);
}
