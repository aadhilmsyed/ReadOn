import { describe, expect, it } from 'vitest';

import { extractStoryParagraphFromIllustrationPrompt } from '@/lib/visualization/extractStoryParagraphFromPrompt';

describe('extractStoryParagraphFromIllustrationPrompt', () => {
  it('returns only the story line, not trailing instruction lines', () => {
    const prompt = [
      "Create a single children's storybook illustration for one paragraph.",
      'Story context: The turtle walked.',
      'Paragraph 1 scene to illustrate: Once upon a time there was a brave turtle.',
      'Focus on the most important action, emotion, location, and objects from this paragraph.',
      'Style: polished picture-book art, soft natural lighting, rich but balanced colors, safe for children.',
    ].join('\n');

    expect(extractStoryParagraphFromIllustrationPrompt(prompt)).toBe(
      'Once upon a time there was a brave turtle.',
    );
  });

  it('handles CRLF after the illustrated line', () => {
    const p =
      'Paragraph 2 scene to illustrate: Second scene text here.\r\nFocus on something.\r\nStyle: x';
    expect(extractStoryParagraphFromIllustrationPrompt(p)).toBe('Second scene text here.');
  });
});
