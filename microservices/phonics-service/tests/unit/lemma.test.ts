import { describe, expect, it } from 'vitest';
import {
  deriveLookupHint,
  looksAdverbLy,
  looksPluralNoun,
  looksVerbInflection,
} from '@phonics/utils/lemma';

describe('deriveLookupHint', () => {
  it('maps irregular past tense to lemma for verb lookup', () => {
    expect(deriveLookupHint('found', 'verb')).toBe('find');
    expect(deriveLookupHint('held', 'verb')).toBe('hold');
    expect(deriveLookupHint('spun', 'verb')).toBe('spin');
  });

  it('singularizes regular plural nouns for lookup', () => {
    expect(deriveLookupHint('flowers', 'noun')).toBe('flower');
    expect(deriveLookupHint('roots', 'noun')).toBe('root');
  });

  it('returns surface lowercased for adjective/adverb (no aggressive stem)', () => {
    expect(deriveLookupHint('wildly', 'adverb')).toBe('wildly');
    expect(deriveLookupHint('wooden', 'adjective')).toBe('wooden');
  });
});

describe('surface heuristics', () => {
  it('looksPluralNoun', () => {
    expect(looksPluralNoun('flowers')).toBe(true);
    expect(looksPluralNoun('roots')).toBe(true);
    expect(looksPluralNoun('box')).toBe(false);
  });

  it('looksVerbInflection', () => {
    expect(looksVerbInflection('turned')).toBe(true);
    expect(looksVerbInflection('walked')).toBe(true);
    expect(looksVerbInflection('running')).toBe(true);
    // Irregular pasts like "found" are handled via IRREGULAR_VERB_TO_LEMMA, not this heuristic.
    expect(looksVerbInflection('found')).toBe(false);
  });

  it('looksAdverbLy', () => {
    expect(looksAdverbLy('wildly')).toBe(true);
    expect(looksAdverbLy('slowly')).toBe(true);
    expect(looksAdverbLy('box')).toBe(false);
  });
});
