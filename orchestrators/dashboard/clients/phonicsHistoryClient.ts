import { httpGet } from './baseHttpClient';
import type { HistoryItem } from '../composition/types';

interface ListResponse { feature: 'phonics'; items: HistoryItem[] }

export async function listPhonicsHistory(limit: number): Promise<HistoryItem[]> {
  const res = await httpGet<ListResponse>(`/history/phonics?limit=${limit}`);
  return res.items;
}
