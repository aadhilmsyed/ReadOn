import { describe, expect, it } from 'vitest';
import { preprocessStoryForPhonics } from '@phonics/utils/preprocessStory';
import { isLowValueLexeme } from '@phonics/utils/vocabularyExclusions';

/** Fixture aligned with classroom story vocabulary checks; compromise tags are sentence-level. */
const SAMPLE_STORY = `
The wooden box sat near the garden full of flowers. She felt fear as the wind shook the air.
He turned and ran wildly. He found a compass by the roots. Roots spread under the soil.
Whenever one walks toward the cliff until dusk, stay along the trail.
`.trim();

describe('vocabulary pipeline (preprocess + filters)', () => {
  it('excludes low-value function lexemes from flashcard candidates', () => {
    expect(isLowValueLexeme('whenever')).toBe(true);
    expect(isLowValueLexeme('one')).toBe(true);
    expect(isLowValueLexeme('toward')).toBe(true);
    expect(isLowValueLexeme('until')).toBe(true);
    expect(isLowValueLexeme('along')).toBe(true);
  });

  it('sample story: bounded candidate count and key contextual POS', () => {
    const { tokens, totalCandidates } = preprocessStoryForPhonics(SAMPLE_STORY);

    expect(totalCandidates).toBeLessThan(40);
    expect(totalCandidates).toBeGreaterThan(8);

    const byNorm = Object.fromEntries(tokens.map((t) => [t.normalizedWord, t.wordType]));

    expect(byNorm['box']).toBe('noun');
    expect(byNorm['compass']).toBe('noun');
    expect(byNorm['wildly']).toBe('adverb');
    expect(byNorm['found']).toBe('verb');
    expect(byNorm['turned']).toBe('verb');
    expect(byNorm['flowers']).toBe('noun');
    expect(byNorm['garden']).toBe('noun');
    expect(byNorm['fear']).toBe('noun');
    expect(byNorm['roots']).toBe('noun');

    for (const low of ['whenever', 'one', 'toward', 'until', 'along'] as const) {
      expect(tokens.some((t) => t.normalizedWord === low)).toBe(false);
    }
  });

  it('omits proper nouns (not flashcard candidates)', () => {
    const { tokens } = preprocessStoryForPhonics('Alice went to the store near Boston.');
    expect(tokens.some((t) => t.normalizedWord === 'alice')).toBe(false);
    expect(tokens.some((t) => t.normalizedWord === 'boston')).toBe(false);
  });

  it('does not emit unknown-class tokens as candidates', () => {
    const { tokens } = preprocessStoryForPhonics('the and or but');
    expect(tokens).toHaveLength(0);
  });
});
