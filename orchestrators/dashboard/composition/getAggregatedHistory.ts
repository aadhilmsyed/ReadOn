// API Composition: fan out to all four per-feature history clients in parallel,
// then merge into a single view-shaped payload. Uses Promise.allSettled so a
// single feature outage degrades only that one card on the dashboard.

import { listPhonicsHistory }       from '../clients/phonicsHistoryClient';
import { listComprehensionHistory } from '../clients/comprehensionHistoryClient';
import { listVisualizationHistory } from '../clients/visualizationHistoryClient';
import { listAudiobookHistory }     from '../clients/audiobookHistoryClient';

import { mergeHistoryResponses }    from './mergeHistoryResponses';
import type { AggregatedHistory }   from './types';

const DEFAULT_LIMIT = 5;

export async function getAggregatedHistory(limit: number = DEFAULT_LIMIT): Promise<AggregatedHistory> {
  const [phonics, comprehension, visualization, audiobook] = await Promise.allSettled([
    listPhonicsHistory(limit),
    listComprehensionHistory(limit),
    listVisualizationHistory(limit),
    listAudiobookHistory(limit),
  ]);
  return mergeHistoryResponses([
    { feature: 'phonics',       result: phonics       },
    { feature: 'comprehension', result: comprehension },
    { feature: 'visualization', result: visualization },
    { feature: 'audiobook',     result: audiobook     },
  ]);
}
