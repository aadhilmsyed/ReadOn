import type { FeatureKey } from '@shared/types/features';
import { notImplemented } from '@shared/notImplemented';

import { synthesizeAudiobookSpeech } from './audiobook/synthesizeSpeech';

export interface FeatureActionRequest {
  feature: FeatureKey;
  sourceText: string;
}

export interface FeatureProcessingResult {
  audioBuffer: Buffer;
  mimeType: string;
}

export async function requestFeatureProcessing(
  request: FeatureActionRequest,
): Promise<FeatureProcessingResult> {
  if (request.feature === 'audiobook') {
    return synthesizeAudiobookSpeech(request.sourceText);
  }

  return notImplemented(`${request.feature} orchestration`);
}
