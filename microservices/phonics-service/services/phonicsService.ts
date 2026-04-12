import { MerriamWebsterIntermediateAdapter } from '@phonics/adapters/merriamWebsterAdapter';
import type { PhonicsFlashcardDto, ProcessPhonicsSuccess, ResolvedPhonicsEntry } from '@phonics/types';
import type { PhoneticsEntry } from '@phonics/types';
import type { PhoneticsProvider } from '@phonics/providers/phoneticsProvider';
import { PhoneticsProviderError } from '@phonics/providers/phoneticsProvider';
import {
  deleteStoryLinks,
  ensurePhonicsSchema,
  fetchStoryFlashcards,
  findWordByNormalized,
  insertStoryWordLink,
  storyHasLinks,
  upsertPhonicsWord,
} from '@phonics/models/phonicsModel';
import { preprocessStoryForPhonics } from '@phonics/utils/preprocessStory';
import { selectBestMwEntry } from '@phonics/utils/selectBestMwEntry';
import { finalizePronunciationBreakdown } from '@phonics/utils/breakdown';

const BETWEEN_CALL_MS = 120;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toResolvedFromLookup(
  best: import('@phonics/types').PhoneticsEntry,
  token: import('@phonics/types').ProcessedStoryToken,
): ResolvedPhonicsEntry {
  return {
    displayWord: token.displayWord,
    normalizedWord: token.normalizedWord,
    wordType: token.wordType,
    meaning: best.meaning.trim(),
    breakdown: finalizePronunciationBreakdown(best.meaning, best.breakdown),
    audioUrl: best.audioUrl,
  };
}

/**
 * Lookup surface form first, then lemma/hint if different — merge entries for a single scoring pass.
 */
async function fetchMergedMwEntries(
  provider: PhoneticsProvider,
  token: import('@phonics/types').ProcessedStoryToken,
): Promise<PhoneticsEntry[]> {
  const primary = await provider.lookupWord(token.displayWord, token.normalizedWord);
  let merged: PhoneticsEntry[] = [...primary.entries];

  const hint = token.lookupHint.trim().toLowerCase();
  const surf = token.displayWord.trim().toLowerCase();
  const norm = token.normalizedWord.trim().toLowerCase();

  if (hint && hint !== norm && hint !== surf) {
    await delay(BETWEEN_CALL_MS);
    const secondary = await provider.lookupWord(hint, hint);
    for (const e of secondary.entries) {
      const dup = merged.some(
        (m) => m.headwordDisplay === e.headwordDisplay && m.meaning === e.meaning,
      );
      if (!dup) merged.push(e);
    }
  }

  return merged;
}

export type PhonicsServiceDeps = {
  provider: PhoneticsProvider;
};

export function createDefaultProvider(): PhoneticsProvider {
  const key = process.env.MERRIAM_WEBSTER_API_KEY?.trim();
  if (!key) {
    throw new Error('MERRIAM_WEBSTER_API_KEY is not set');
  }
  return new MerriamWebsterIntermediateAdapter(key);
}

export async function getStoryPhonicsData(storyId: string): Promise<{
  found: boolean;
  data: PhonicsFlashcardDto[];
}> {
  await ensurePhonicsSchema();
  const has = await storyHasLinks(storyId);
  if (!has) {
    return { found: false, data: [] };
  }
  const data = await fetchStoryFlashcards(storyId);
  return { found: true, data };
}

export async function processStoryPhonics(
  storyId: string,
  storyText: string,
  deps?: PhonicsServiceDeps,
): Promise<ProcessPhonicsSuccess> {
  await ensurePhonicsSchema();
  const provider = deps?.provider ?? createDefaultProvider();

  const { tokens, totalCandidates } = preprocessStoryForPhonics(storyText);

  await deleteStoryLinks(storyId);

  let displayOrder = 0;
  const flashcards: PhonicsFlashcardDto[] = [];

  let existingWordsLinked = 0;
  let newWordsFetched = 0;
  let skippedWords = 0;
  let entriesCreated = 0;

  let needDelayBeforeNextApi = false;

  for (const t of tokens) {
    const cached = await findWordByNormalized(t.normalizedWord);

    if (cached) {
      existingWordsLinked += 1;
      displayOrder += 1;
      flashcards.push({
        wordId: Number(cached.Word_ID),
        word: cached.Word,
        meaning: cached.Meaning,
        breakdown: cached.Breakdown,
        audioUrl: cached.Audio_URL,
        displayOrder,
        wordType: cached.Word_Type,
      });
      await insertStoryWordLink(storyId, Number(cached.Word_ID), displayOrder);
      continue;
    }

    if (needDelayBeforeNextApi) {
      await delay(BETWEEN_CALL_MS);
    }
    needDelayBeforeNextApi = true;

    newWordsFetched += 1;
    const entries = await fetchMergedMwEntries(provider, t);

    const best = selectBestMwEntry({
      displayWord: t.displayWord,
      normalizedWord: t.normalizedWord,
      wordType: t.wordType,
      lookupHint: t.lookupHint,
      contextSnippet: t.contextSnippet,
      entries,
    });

    if (!best) {
      skippedWords += 1;
      continue;
    }

    const resolved = toResolvedFromLookup(best, t);
    const wordId = await upsertPhonicsWord(resolved);
    entriesCreated += 1;
    displayOrder += 1;
    flashcards.push({
      wordId,
      word: resolved.displayWord,
      meaning: resolved.meaning,
      breakdown: resolved.breakdown,
      audioUrl: resolved.audioUrl,
      displayOrder,
      wordType: resolved.wordType,
    });
    await insertStoryWordLink(storyId, wordId, displayOrder);
  }

  return {
    success: true,
    storyId,
    totalCandidateWords: totalCandidates,
    existingWordsLinked,
    newWordsFetched,
    skippedWords,
    entriesCreated,
    message: `Processed ${totalCandidates} vocabulary candidates for story ${storyId}.`,
    data: flashcards,
  };
}

export { PhoneticsProviderError };
