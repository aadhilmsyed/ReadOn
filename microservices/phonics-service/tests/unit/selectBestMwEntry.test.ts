import { describe, expect, it } from 'vitest';
import { selectBestMwEntry } from '@phonics/utils/selectBestMwEntry';
import type { PhoneticsEntry } from '@phonics/types';

function e(p: Partial<PhoneticsEntry> & Pick<PhoneticsEntry, 'meaning'>): PhoneticsEntry {
  return {
    headwordDisplay: 'x',
    breakdown: null,
    audioUrl: null,
    functionalLabel: null,
    ...p,
  };
}

describe('selectBestMwEntry', () => {
  it('returns exactly one entry', () => {
    const entries: PhoneticsEntry[] = [
      e({ meaning: 'a', functionalLabel: 'noun' }),
      e({ meaning: 'b', functionalLabel: 'verb' }),
    ];
    const one = selectBestMwEntry({
      displayWord: 'lead',
      normalizedWord: 'lead',
      wordType: 'verb',
      lookupHint: 'lead',
      contextSnippet: '',
      entries,
    });
    expect(one).not.toBeNull();
    expect(one!.functionalLabel).toMatch(/verb/i);
  });

  it('prefers abbreviation sense for acronym tag', () => {
    const entries: PhoneticsEntry[] = [
      e({ meaning: 'to lead', functionalLabel: 'verb', headwordDisplay: 'lead' }),
      e({ meaning: 'the metal', functionalLabel: 'noun', headwordDisplay: 'Pb' }),
    ];
    const one = selectBestMwEntry({
      displayWord: 'NASA',
      normalizedWord: 'nasa',
      wordType: 'acronym',
      lookupHint: 'nasa',
      contextSnippet: '',
      entries,
    });
    expect(one).not.toBeNull();
  });

  it('falls back to first valid entry', () => {
    const entries: PhoneticsEntry[] = [e({ meaning: 'only', functionalLabel: 'unknown' })];
    const one = selectBestMwEntry({
      displayWord: 'zzz',
      normalizedWord: 'zzz',
      wordType: 'noun',
      lookupHint: 'zzz',
      contextSnippet: '',
      entries,
    });
    expect(one!.meaning).toBe('only');
  });

  it('prefers navigation sense for compass (noun) over boundary/circumference', () => {
    const entries: PhoneticsEntry[] = [
      e({
        meaning: 'the boundary or circumference of something',
        functionalLabel: 'noun',
        headwordDisplay: 'compass',
      }),
      e({
        meaning: 'a device for finding direction',
        functionalLabel: 'noun',
        headwordDisplay: 'compass',
      }),
    ];
    const one = selectBestMwEntry({
      displayWord: 'compass',
      normalizedWord: 'compass',
      wordType: 'noun',
      lookupHint: 'compass',
      contextSnippet: 'The compass pointed north.',
      entries,
    });
    expect(one!.meaning).toContain('direction');
  });

  it('strongly prefers adverb sense for -ly adverbs', () => {
    const entries: PhoneticsEntry[] = [
      e({ meaning: 'full of wild growth', functionalLabel: 'adjective', headwordDisplay: 'wild' }),
      e({ meaning: 'in a wild manner', functionalLabel: 'adverb', headwordDisplay: 'wildly' }),
    ];
    const one = selectBestMwEntry({
      displayWord: 'wildly',
      normalizedWord: 'wildly',
      wordType: 'adverb',
      lookupHint: 'wildly',
      contextSnippet: 'He ran wildly.',
      entries,
    });
    expect(one!.functionalLabel).toMatch(/adverb/i);
  });

  it('penalizes “establish” style definitions for surface “found”', () => {
    const entries: PhoneticsEntry[] = [
      e({
        meaning: 'to establish or set up',
        functionalLabel: 'verb',
        headwordDisplay: 'found',
      }),
      e({
        meaning: 'past tense of find',
        functionalLabel: 'verb',
        headwordDisplay: 'find',
      }),
    ];
    const one = selectBestMwEntry({
      displayWord: 'found',
      normalizedWord: 'found',
      wordType: 'verb',
      lookupHint: 'find',
      contextSnippet: 'She found the key.',
      entries,
    });
    expect(one!.meaning.toLowerCase()).not.toContain('establish');
  });

  it('prefers noun sense for plural noun “flowers” over verb-only gloss', () => {
    const entries: PhoneticsEntry[] = [
      e({ meaning: 'to plant flowers', functionalLabel: 'verb', headwordDisplay: 'flower' }),
      e({ meaning: 'the showy part of a plant', functionalLabel: 'noun', headwordDisplay: 'flower' }),
    ];
    const one = selectBestMwEntry({
      displayWord: 'flowers',
      normalizedWord: 'flowers',
      wordType: 'noun',
      lookupHint: 'flower',
      contextSnippet: 'The garden full of flowers.',
      entries,
    });
    expect(one!.functionalLabel).toMatch(/noun/i);
  });
});
