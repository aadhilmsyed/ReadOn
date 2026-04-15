// Write + single-read story actions. Used by the feature-action orchestrator
// (write path) and by the home-page prefill (single-read path). NOT used by
// the composition layer — composition is read-only fan-out across all 4
// per-feature history clients.

import { httpGet, httpPost } from './baseHttpClient';
import type { FeatureKey } from '@shared/types/features';
import type { FullStory } from '../composition/types';

interface CreateBody { title: string; source_text: string }

export async function createStory(feature: FeatureKey, body: CreateBody): Promise<FullStory> {
  return httpPost<FullStory>(`/history/${feature}`, body);
}

export async function getStory(feature: FeatureKey, storyId: string): Promise<FullStory> {
  return httpGet<FullStory>(`/history/${feature}/${encodeURIComponent(storyId)}`);
}
