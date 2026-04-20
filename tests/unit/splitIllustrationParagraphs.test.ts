import { describe, expect, it } from 'vitest';

import {
  splitIllustrationParagraphs,
  splitSentences,
} from '../../microservices/image-generation-service/utils/splitIllustrationParagraphs';

describe('splitIllustrationParagraphs', () => {
  it('leaves a short single paragraph unchanged', () => {
    const t = 'Hello world. This is two sentences.';
    expect(splitIllustrationParagraphs(t, 60)).toEqual([t]);
  });

  it('splits a long paragraph into multiple chunks and preserves all words (no mid-word cuts)', () => {
    const parts: string[] = [];
    for (let i = 0; i < 30; i += 1) {
      parts.push(`Sentence ${i} has ten words right here now today end.`);
    }
    const paragraph = parts.join(' ');
    const chunks = splitIllustrationParagraphs(paragraph, 60);
    expect(chunks.length).toBeGreaterThan(1);
    const joined = chunks.join(' ').replace(/\s+/g, ' ').trim();
    expect(joined).toContain('Sentence 0');
    expect(joined).toContain('Sentence 29');
    expect(joined.split(/\s+/).filter(Boolean).length).toBe(paragraph.split(/\s+/).filter(Boolean).length);
  });

  it('respects newline-separated paragraphs before sub-splitting', () => {
    const a = 'Short one.';
    const long = `${'Word '.repeat(80)}end.`;
    const chunks = splitIllustrationParagraphs(`${a}\n\n${long}`, 60);
    expect(chunks[0]).toBe(a);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('splitSentences', () => {
  it('splits on punctuation boundaries', () => {
    expect(splitSentences('A. B! C?')).toEqual(['A.', 'B!', 'C?']);
  });
});
