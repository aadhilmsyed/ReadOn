import type { FeatureKey } from '@shared/types/features';

export interface HistoryItem {
  story_id: string;
  title: string;
  created_at: string;
}

export interface FeatureHistorySlice {
  feature: FeatureKey;
  items: HistoryItem[];
  /** Present only if the downstream call failed; UI shows empty state for that card. */
  error?: string;
}

export type AggregatedHistory = Record<FeatureKey, FeatureHistorySlice>;

export interface FullStory {
  feature: FeatureKey;
  story_id: string;
  title: string;
  source_text: string;
  created_at: string;
}
