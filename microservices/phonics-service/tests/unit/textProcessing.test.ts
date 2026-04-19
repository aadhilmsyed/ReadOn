import { describe, expect, it } from 'vitest';
import {
  extractStoryTokenCandidates,
  isAcronymStyleToken,
  isNoiseToken,
  normalizeWordForDedupe,
  stripOuterPunctuation,
  toDisplayForm,
} from '@phonics/utils/textProcessing';

describe('normalizeWordForDedupe', () => {
  it('lowercases and strips outer punctuation', () => {
    expect(normalizeWordForDedupe('Hello,')).toBe('hello');
    expect(normalizeWordForDedupe('"Dragon"')).toBe('dragon');
  });

  it('strips possessive for cache key', () => {
    expect(normalizeWordForDedupe("dragon's")).toBe('dragon');
  });
});

describe('toDisplayForm', () => {
  it('preserves all-caps acronyms', () => {
    expect(toDisplayForm('NASA')).toBe('NASA');
  });

  it('lowercases simple title case', () => {
    expect(toDisplayForm('Dragon')).toBe('dragon');
  });
});

describe('isNoiseToken', () => {
  it('skips digits', () => {
    expect(isNoiseToken('x', 'x3')).toBe(true);
  });
});

describe('isAcronymStyleToken', () => {
  it('detects NASA-style tokens', () => {
    expect(isAcronymStyleToken('NASA')).toBe(true);
    expect(isAcronymStyleToken('dragon')).toBe(false);
  });
});

describe('extractStoryTokenCandidates', () => {
  it('dedupes and removes stopwords', () => {
    const { candidates, totalAfterDedupe } = extractStoryTokenCandidates(
      'The dragon flew. The dragon slept.',
    );
    expect(totalAfterDedupe).toBeGreaterThan(0);
    const words = candidates.map((c) => c.normalizedWord);
    expect(words.filter((w) => w === 'dragon').length).toBe(1);
    expect(words).not.toContain('the');
  });

  it('treats ACT and act as distinct candidates', () => {
    const { candidates, totalAfterDedupe } = extractStoryTokenCandidates('ACT act');
    expect(totalAfterDedupe).toBe(2);
    const displays = candidates.map((c) => c.displayWord).sort();
    expect(displays).toEqual(['ACT', 'act']);
  });
});

describe('stripOuterPunctuation', () => {
  it('removes surrounding quotes', () => {
    expect(stripOuterPunctuation('"hello"')).toBe('hello');
  });
});
