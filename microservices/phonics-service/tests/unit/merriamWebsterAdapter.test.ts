import { describe, expect, it, vi, afterEach } from 'vitest';
import { MerriamWebsterIntermediateAdapter } from '@phonics/adapters/merriamWebsterAdapter';
import { PhoneticsProviderError } from '@phonics/providers/phoneticsProvider';

describe('MerriamWebsterIntermediateAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps dictionary entries; breakdown is pronunciation only', async () => {
    const payload = [
      {
        meta: { uuid: 'u1', id: 'dragon' },
        hwi: {
          hw: 'drag*on',
          prs: [{ mw: 'DRA-gun', sound: { audio: 'dragon001' } }],
        },
        fl: 'noun',
        shortdef: ['a mythical animal'],
      },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload),
      }),
    );

    const a = new MerriamWebsterIntermediateAdapter('test-key');
    const r = await a.lookupWord('dragon', 'dragon');
    expect(r.entries.length).toBe(1);
    expect(r.entries[0]!.meaning).toContain('mythical');
    expect(r.entries[0]!.breakdown).toContain('DRA-gun');
    expect(r.entries[0]!.meaning).not.toBe(r.entries[0]!.breakdown);
    expect(r.entries[0]!.audioUrl).toContain('dragon001.mp3');
  });

  it('does not copy meaning into breakdown when pronunciation missing', async () => {
    const payload = [
      {
        hwi: { hw: 'plain', prs: [{}] },
        fl: 'noun',
        shortdef: ['only definition'],
      },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload),
      }),
    );

    const a = new MerriamWebsterIntermediateAdapter('test-key');
    const r = await a.lookupWord('plain', 'plain');
    expect(r.entries[0]!.breakdown).toBeNull();
  });

  it('returns empty entries for stem suggestions (string array)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(['xyzplq', 'xyz']),
      }),
    );

    const a = new MerriamWebsterIntermediateAdapter('test-key');
    const r = await a.lookupWord('xyzplq', 'xyzplq');
    expect(r.entries.length).toBe(0);
  });

  it('throws PhoneticsProviderError on 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Too Many Requests',
      }),
    );

    const a = new MerriamWebsterIntermediateAdapter('test-key');
    await expect(a.lookupWord('a', 'a')).rejects.toBeInstanceOf(PhoneticsProviderError);
  });
});
