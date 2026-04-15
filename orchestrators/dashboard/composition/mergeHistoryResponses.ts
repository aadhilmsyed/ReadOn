import type { FeatureKey } from '@shared/types/features';
import type { AggregatedHistory, FeatureHistorySlice, HistoryItem } from './types';

export interface SettledSlice {
  feature: FeatureKey;
  result: PromiseSettledResult<HistoryItem[]>;
}

export function mergeHistoryResponses(slices: SettledSlice[]): AggregatedHistory {
  const empty = (): FeatureHistorySlice => ({ feature: 'phonics', items: [] });
  const out: AggregatedHistory = {
    phonics:       { ...empty(), feature: 'phonics' },
    comprehension: { ...empty(), feature: 'comprehension' },
    visualization: { ...empty(), feature: 'visualization' },
    audiobook:     { ...empty(), feature: 'audiobook' },
  };
  for (const { feature, result } of slices) {
    if (result.status === 'fulfilled') {
      out[feature] = { feature, items: result.value };
    } else {
      out[feature] = { feature, items: [], error: String(result.reason?.message ?? result.reason ?? 'unknown') };
    }
  }
  return out;
}
