// One of the four per-feature history clients used by the API Composition
// composer. FeatureKey 'visualization' maps to the image-generation-service
// (the underlying microservice that renders images for stories).

import { httpGet } from './baseHttpClient';
import { imageGenerationServiceBase } from '@orchestrators/story/serviceBaseUrls';
import { START_COMMANDS } from '@shared/http/serviceUnavailable';
import type { HistoryItem } from '../composition/types';

interface ListResponse { items?: HistoryItem[] }

export async function listVisualizationHistory(limit: number): Promise<HistoryItem[]> {
  const res = await httpGet<ListResponse>(`/history?limit=${limit}`, undefined, {
    baseUrl: imageGenerationServiceBase(),
    serviceLabel: 'Image generation service',
    startCommand: START_COMMANDS.imageGeneration,
  });
  return res.items ?? [];
}
