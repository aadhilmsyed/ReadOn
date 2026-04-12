import { describe, expect, it, vi } from 'vitest';
import { postProcessPhonicsController } from '@phonics/controllers/phonicsController';
import * as svc from '@phonics/services/phonicsService';

vi.mock('@phonics/services/phonicsService', () => ({
  processStoryPhonics: vi.fn(),
  getStoryPhonicsData: vi.fn(),
  PhoneticsProviderError: class extends Error {
    code = 'RATE_LIMIT';
  },
}));

describe('postProcessPhonicsController', () => {
  it('returns 400 on invalid body', async () => {
    const r = await postProcessPhonicsController({});
    expect(r.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    vi.mocked(svc.processStoryPhonics).mockResolvedValue({
      success: true,
      storyId: 's',
      totalCandidateWords: 1,
      existingWordsLinked: 0,
      newWordsFetched: 1,
      skippedWords: 0,
      entriesCreated: 1,
      message: 'ok',
      data: [],
    });

    const r = await postProcessPhonicsController({ storyId: 's', storyText: 'hello dragon' });
    expect(r.status).toBe(200);
  });
});
