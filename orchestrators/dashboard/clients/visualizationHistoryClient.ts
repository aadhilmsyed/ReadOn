import { httpGet } from './baseHttpClient';
import type { HistoryItem } from '../composition/types';

interface ListResponse { feature: 'visualization'; items: HistoryItem[] }

export async function listVisualizationHistory(limit: number): Promise<HistoryItem[]> {
  const res = await httpGet<ListResponse>(`/history/visualization?limit=${limit}`);
  return res.items;
}
