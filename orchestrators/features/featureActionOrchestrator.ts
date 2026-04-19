import type { FeatureKey } from '@shared/types/features';
import { notImplemented } from '@shared/notImplemented';

import { synthesizeAudiobookSpeech } from './audiobook/synthesizeSpeech';

export interface FeatureActionRequest {
  feature: FeatureKey;
  sourceText: string;
}

export interface FeatureProcessingResult {
  sourceText: string;
  audioBuffer: Buffer;
  mimeType: string;
}

export async function requestFeatureProcessing(
  request: FeatureActionRequest,
): Promise<FeatureProcessingResult> {
  if (request.feature === 'audiobook') {
    const { audioBuffer, mimeType } = await synthesizeAudiobookSpeech(request.sourceText);
    return { sourceText: request.sourceText, audioBuffer, mimeType };
  }

  return notImplemented(`${request.feature} orchestration`);
}
