// One of the four per-feature history clients used by the API Composition
// composer. Each client knows only how to talk to its own feature service.

import { httpGet } from './baseHttpClient';
import { comprehensionServiceBase } from '@orchestrators/story/serviceBaseUrls';
import { START_COMMANDS } from '@shared/http/serviceUnavailable';
import type { HistoryItem } from '../composition/types';

interface ListResponse { items?: HistoryItem[] }

export async function listComprehensionHistory(limit: number): Promise<HistoryItem[]> {
  const res = await httpGet<ListResponse>(`/history?limit=${limit}`, undefined, {
    baseUrl: comprehensionServiceBase(),
    serviceLabel: 'Comprehension service',
    startCommand: START_COMMANDS.comprehension,
  });
  return res.items ?? [];
}
