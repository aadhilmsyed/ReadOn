import { describe, expect, it, vi, beforeEach } from 'vitest';
import { processStoryPhonics, type PhonicsServiceDeps } from '@phonics/services/phonicsService';
import type { PhoneticsProvider } from '@phonics/providers/phoneticsProvider';
import * as model from '@phonics/models/phonicsModel';

vi.mock('@phonics/models/phonicsModel', async (orig) => {
  const actual = await orig<typeof import('@phonics/models/phonicsModel')>();
  return {
    ...actual,
    ensurePhonicsSchema: vi.fn().mockResolvedValue(undefined),
    deleteStoryLinks: vi.fn().mockResolvedValue(undefined),
    findWordByNormalized: vi.fn(),
    upsertPhonicsWord: vi.fn(),
    insertStoryWordLink: vi.fn().mockResolvedValue(undefined),
    fetchStoryFlashcards: vi.fn(),
    storyHasLinks: vi.fn(),
  };
});

describe('processStoryPhonics', () => {
  beforeEach(() => {
    vi.mocked(model.findWordByNormalized).mockReset();
    vi.mocked(model.upsertPhonicsWord).mockReset();
    vi.mocked(model.insertStoryWordLink).mockReset();
    vi.mocked(model.deleteStoryLinks).mockClear();
    vi.mocked(model.findWordByNormalized).mockResolvedValue(null);
    vi.mocked(model.upsertPhonicsWord).mockResolvedValue(42);
  });

  it('produces at most one flashcard per preprocessed token', async () => {
    const provider: PhoneticsProvider = {
      lookupWord: vi.fn().mockResolvedValue({
        entries: [
          {
            headwordDisplay: 'dragon',
            meaning: 'a creature',
            breakdown: 'DRA-gun',
            audioUrl: null,
            functionalLabel: 'noun',
          },
        ],
      }),
    };

    const res = await processStoryPhonics('s1', 'dragon dragon dragon', { provider });
    expect(res.data.length).toBeLessThanOrEqual(res.totalCandidateWords);
    expect(res.data.length).toBe(1);
  });

  it('uses cache without calling provider', async () => {
    vi.mocked(model.findWordByNormalized).mockResolvedValue({
      Word_ID: 7,
      Word: 'dragon',
      Normalized_Word: 'dragon',
      Word_Type: 'noun',
      Meaning: 'creature',
      Breakdown: 'DRA-gun',
      Audio_URL: null,
      Created_At: new Date(),
      Updated_At: new Date(),
    });

    const provider: PhoneticsProvider = {
      lookupWord: vi.fn().mockRejectedValue(new Error('no')),
    };

    const res = await processStoryPhonics('s1', 'dragon', { provider });
    expect(provider.lookupWord).not.toHaveBeenCalled();
    expect(res.data).toHaveLength(1);
    expect(res.data[0]!.wordType).toBe('noun');
  });

  it('skips when provider returns no selectable entry', async () => {
    const provider: PhoneticsProvider = {
      lookupWord: vi.fn().mockResolvedValue({ entries: [] }),
    };

    const res = await processStoryPhonics('s1', 'The xqzzzzunknown999 word.', { provider });
    expect(res.skippedWords).toBeGreaterThanOrEqual(1);
  });

  it('merges lemma lookup when hint differs from surface (e.g. found → find)', async () => {
    const entry = {
      headwordDisplay: 'key',
      meaning: 'a small metal object',
      breakdown: null,
      audioUrl: null,
      functionalLabel: 'noun',
    };
    const provider: PhoneticsProvider = {
      lookupWord: vi
        .fn()
        .mockResolvedValueOnce({
          entries: [
            {
              headwordDisplay: 'found',
              meaning: 'to establish',
              breakdown: null,
              audioUrl: null,
              functionalLabel: 'verb',
            },
          ],
        })
        .mockResolvedValueOnce({
          entries: [
            {
              headwordDisplay: 'find',
              meaning: 'to discover',
              breakdown: null,
              audioUrl: null,
              functionalLabel: 'verb',
            },
          ],
        })
        .mockResolvedValue({ entries: [entry] }),
    };

    const res = await processStoryPhonics('s1', 'She found the key.', { provider });
    expect(provider.lookupWord).toHaveBeenCalledWith('found', 'found');
    expect(provider.lookupWord).toHaveBeenCalledWith('find', 'find');
    expect(res.entriesCreated).toBe(2);
    expect(res.data).toHaveLength(2);
  });
});
