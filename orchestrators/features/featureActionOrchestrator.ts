import type { FeatureKey } from '@shared/types/features';
import { notImplemented } from '@shared/notImplemented';

export interface FeatureActionRequest {
  feature: FeatureKey;
  sourceText: string;
}

export async function requestFeatureProcessing(request: FeatureActionRequest) {
  return notImplemented(`${request.feature} orchestration`);
}
