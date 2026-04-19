import { describe, expect, it } from 'vitest';
import { processPhonicsBodySchema } from '@phonics/validators/phonicsSchemas';

describe('processPhonicsBodySchema', () => {
  it('accepts valid body', () => {
    const r = processPhonicsBodySchema.safeParse({ storyId: 's1', storyText: 'hello world' });
    expect(r.success).toBe(true);
  });

  it('rejects empty storyId', () => {
    const r = processPhonicsBodySchema.safeParse({ storyId: '', storyText: 'a' });
    expect(r.success).toBe(false);
  });
});
