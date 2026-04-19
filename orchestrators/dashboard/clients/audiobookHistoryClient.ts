import { httpGet } from './baseHttpClient';
import type { HistoryItem } from '../composition/types';

interface ListResponse { feature: 'audiobook'; items: HistoryItem[] }

export async function listAudiobookHistory(limit: number): Promise<HistoryItem[]> {
  const res = await httpGet<ListResponse>(`/history/audiobook?limit=${limit}`);
  return res.items;
}
