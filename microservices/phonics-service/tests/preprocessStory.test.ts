import { describe, expect, it } from 'vitest';
import { isAcronymCandidate, preprocessStoryForPhonics } from '@phonics/utils/preprocessStory';

describe('preprocessStoryForPhonics', () => {
  it('detects acronyms before POS', () => {
    expect(isAcronymCandidate('NASA')).toBe(true);
    expect(isAcronymCandidate('nasa')).toBe(false);
  });

  it('removes stopwords', () => {
    const { tokens } = preprocessStoryForPhonics('the and or but');
    expect(tokens.length).toBe(0);
  });

  it('dedupes by normalized word', () => {
    const { tokens, totalCandidates } = preprocessStoryForPhonics('dragon dragon dragon');
    expect(totalCandidates).toBe(1);
    expect(tokens[0]!.normalizedWord).toBe('dragon');
  });

  it('tags common words in a short sentence', () => {
    const { tokens } = preprocessStoryForPhonics('Monday is great.');
    expect(tokens.some((t) => t.normalizedWord === 'great')).toBe(true);
  });

  it('keeps content words for a short paragraph with bounded candidate count', () => {
    const text =
      'The small boy walked slowly through the deep forest. He turned to look at an old wooden box.';
    const { tokens, totalCandidates } = preprocessStoryForPhonics(text);
    expect(totalCandidates).toBeLessThan(25);
    expect(totalCandidates).toBeGreaterThan(3);
  });
});
