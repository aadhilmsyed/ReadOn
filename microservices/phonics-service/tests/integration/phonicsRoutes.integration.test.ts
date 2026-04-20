import { describe, expect, it, vi } from 'vitest';
import { handlePostProcessPhonics } from '@phonics/routes/handlers';
import * as svc from '@phonics/services/phonicsService';

vi.mock('@phonics/services/phonicsService', async (orig) => {
  const actual = await orig<typeof import('@phonics/services/phonicsService')>();
  return {
    ...actual,
    processStoryPhonics: vi.fn(),
    getStoryPhonicsData: vi.fn(),
  };
});

describe('routes handlers integration', () => {
  it('handlePostProcessPhonics delegates to controller stack', async () => {
    vi.mocked(svc.processStoryPhonics).mockResolvedValue({
      success: true,
      storyId: 'x',
      totalCandidateWords: 0,
      existingWordsLinked: 0,
      newWordsFetched: 0,
      skippedWords: 0,
      entriesCreated: 0,
      message: 'ok',
      data: [],
    });

    const res = await handlePostProcessPhonics({ storyId: 'x', storyText: 'hello' });
    expect(res.status).toBe(200);
    expect(svc.processStoryPhonics).toHaveBeenCalled();
  });
});
