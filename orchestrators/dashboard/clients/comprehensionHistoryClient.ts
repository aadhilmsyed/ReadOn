import { httpGet } from './baseHttpClient';
import type { HistoryItem } from '../composition/types';

interface ListResponse { feature: 'comprehension'; items: HistoryItem[] }

export async function listComprehensionHistory(limit: number): Promise<HistoryItem[]> {
  const res = await httpGet<ListResponse>(`/history/comprehension?limit=${limit}`);
  return res.items;
}
