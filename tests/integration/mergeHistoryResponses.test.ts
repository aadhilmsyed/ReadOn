import { describe, expect, it } from 'vitest';

import { mergeHistoryResponses } from '@orchestrators/dashboard/composition/mergeHistoryResponses';

describe('mergeHistoryResponses', () => {
  it('returns empty slices when all feature requests reject', () => {
    const agg = mergeHistoryResponses([
      { feature: 'phonics', result: { status: 'rejected', reason: new Error('offline') } },
      { feature: 'comprehension', result: { status: 'rejected', reason: new Error('offline') } },
      { feature: 'visualization', result: { status: 'rejected', reason: new Error('offline') } },
      { feature: 'audiobook', result: { status: 'rejected', reason: new Error('offline') } },
    ]);
    expect(agg.phonics.items).toEqual([]);
    expect(agg.phonics.error).toBeDefined();
    expect(agg.comprehension.items).toEqual([]);
  });
});
