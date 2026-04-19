import { buildMerriamWebsterAudioUrl } from '@phonics/utils/audioUrl';
import { finalizePronunciationBreakdown } from '@phonics/utils/breakdown';
import type { PhoneticsEntry, PhoneticsLookupResult } from '@phonics/types';
import { PhoneticsProvider, PhoneticsProviderError } from '@phonics/providers/phoneticsProvider';
import type { MwIntermediateEntry } from '@phonics/adapters/merriamWebsterIntermediate.types';

const SD3_JSON = 'https://www.dictionaryapi.com/api/v3/references/sd3/json';

/**
 * Merriam-Webster Intermediate Dictionary (sd3) — provider-specific HTTP + mapping.
 * TODO: Branding / logo / attribution compliance for any UI that surfaces MW data
 * (follow Merriam-Webster API license terms before shipping production polish).
 */
export class MerriamWebsterIntermediateAdapter implements PhoneticsProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error('Merriam-Webster API key is required');
    }
  }

  async lookupWord(displayWord: string, _normalizedWord: string): Promise<PhoneticsLookupResult> {
    const q = encodeURIComponent(displayWord.trim());
    const url = `${SD3_JSON}/${q}?key=${encodeURIComponent(this.apiKey)}`;

    let res: Response;
    try {
      res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new PhoneticsProviderError(
        `Merriam-Webster request failed: ${msg}`,
        'PROVIDER_OUTAGE',
        undefined,
        msg,
      );
    }

    const rawText = await res.text();
    if (res.status === 404) {
      return { entries: [] };
    }
    this.throwIfSystemicHttpError(res, rawText);

    let data: unknown;
    try {
      data = JSON.parse(rawText) as unknown;
    } catch {
      throw new PhoneticsProviderError(
        'Merriam-Webster returned non-JSON',
        'PROVIDER_OUTAGE',
        res.status,
        rawText.slice(0, 500),
      );
    }

    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
      return { entries: [] };
    }

    if (!Array.isArray(data)) {
      return { entries: [] };
    }

    const entries: PhoneticsEntry[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const mapped = mapEntry(item as MwIntermediateEntry);
      if (mapped) entries.push(mapped);
    }

    return { entries };
  }

  private throwIfSystemicHttpError(res: Response, body: string): void {
    if (res.status === 429) {
      throw new PhoneticsProviderError(
        body.trim() || 'Merriam-Webster rate limit',
        'RATE_LIMIT',
        429,
        body,
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new PhoneticsProviderError(
        body.trim() || 'Merriam-Webster authentication failed',
        'INVALID_KEY',
        res.status,
        body,
      );
    }
    if (res.status >= 500 || res.status === 408) {
      throw new PhoneticsProviderError(
        body.trim() || 'Merriam-Webster service error',
        'PROVIDER_OUTAGE',
        res.status,
        body,
      );
    }
    if (!res.ok) {
      throw new PhoneticsProviderError(
        body.trim() || `Merriam-Webster error (${res.status})`,
        'UNKNOWN',
        res.status,
        body,
      );
    }
  }
}

function stripHwMarks(hw: string): string {
  return hw.replace(/\*/g, '');
}

/** Pronunciation only — mw then ipa. Never use definition text here. */
function pickPronunciationBreakdown(hwi: MwIntermediateEntry['hwi']): string | null {
  const prs = hwi?.prs;
  if (!prs?.length) return null;
  for (const p of prs) {
    if (p.mw?.trim()) return p.mw.trim();
  }
  for (const p of prs) {
    if (p.ipa?.trim()) return p.ipa.trim();
  }
  return null;
}

function pickAudioUrl(hwi: MwIntermediateEntry['hwi']): string | null {
  const prs = hwi?.prs;
  if (!prs?.length) return null;
  for (const p of prs) {
    const a = p.sound?.audio;
    const url = buildMerriamWebsterAudioUrl(a);
    if (url) return url;
  }
  return null;
}

function mapEntry(entry: MwIntermediateEntry): PhoneticsEntry | null {
  const shortdef = entry.shortdef?.find((s) => s && s.trim());
  if (!shortdef) return null;

  const meaning = shortdef.trim();
  const rawPron = pickPronunciationBreakdown(entry.hwi);
  const breakdown = finalizePronunciationBreakdown(meaning, rawPron);
  const audioUrl = pickAudioUrl(entry.hwi);
  const head = entry.hwi?.hw ? stripHwMarks(entry.hwi.hw) : '';

  return {
    headwordDisplay: head,
    meaning,
    breakdown,
    audioUrl,
    functionalLabel: entry.fl ?? null,
  };
}
