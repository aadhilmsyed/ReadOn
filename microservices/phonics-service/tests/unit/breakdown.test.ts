import { describe, expect, it } from 'vitest';
import { finalizePronunciationBreakdown } from '@phonics/utils/breakdown';

describe('finalizePronunciationBreakdown', () => {
  it('returns null when pronunciation missing', () => {
    expect(finalizePronunciationBreakdown('hello', '')).toBeNull();
    expect(finalizePronunciationBreakdown('hello', null)).toBeNull();
  });

  it('returns null when breakdown equals meaning', () => {
    expect(finalizePronunciationBreakdown('same text', 'same text')).toBeNull();
  });

  it('keeps real pronunciation', () => {
    expect(finalizePronunciationBreakdown('a mythical animal', 'DRA-gun')).toBe('DRA-gun');
  });
});
