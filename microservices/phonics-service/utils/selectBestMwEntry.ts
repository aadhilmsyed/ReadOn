import type { PhoneticsEntry, WordTypeTag } from '@phonics/types';
import {
  looksAdverbLy,
  looksPluralNoun,
  looksVerbInflection,
} from '@phonics/utils/lemma';

function normFl(fl: string | null | undefined): string {
  return (fl ?? '').toLowerCase();
}

function flMatchesWordType(fl: string | null | undefined, want: WordTypeTag): boolean {
  const x = normFl(fl);
  if (!x) return false;
  if (want === 'noun') return x.includes('noun');
  if (want === 'verb') return x.includes('verb') && !x.includes('adjective');
  if (want === 'adjective') return x.includes('adjective');
  if (want === 'adverb') return x.includes('adverb');
  return false;
}

function isAbbreviationStyleEntry(e: PhoneticsEntry): boolean {
  const fl = normFl(e.functionalLabel);
  if (fl.includes('abbrev') || fl.includes('symbol')) return true;
  const hw = e.headwordDisplay ?? '';
  if (hw.length >= 2 && hw === hw.toUpperCase() && /^[A-Z0-9.-]+$/.test(hw.replace(/\s/g, ''))) return true;
  return false;
}

function meaningLengthScore(meaning: string): number {
  const len = meaning.trim().length;
  if (len <= 55) return 8;
  if (len <= 95) return 4;
  if (len <= 140) return 0;
  return -6;
}

/** Penalize rare/specialized vibes when a simpler child-friendly sense is desired. */
function specializedPenalty(meaning: string, normalizedWord: string): number {
  const m = meaning.toLowerCase();
  let p = 0;
  if (/\b(circumference|boundary|periphery|geometric)\b/i.test(m)) p -= 18;
  if (/\b(establish|founding|institute)\b/i.test(m) && normalizedWord === 'found') p -= 25;
  if (/\b(plant|sow|till)\b/i.test(m) && /flowers|garden/i.test(normalizedWord)) p -= 12;
  return p;
}

/** Boost likely “everyday” senses for known polysemes (very heuristic). */
function domainBoost(meaning: string, normalizedWord: string, want: WordTypeTag): number {
  const m = meaning.toLowerCase();
  if (normalizedWord === 'compass' && want === 'noun') {
    if (/\b(direction|navigate|navigation|map|bearing|magnet)\b/i.test(m)) return 22;
    if (/\b(boundary|circumference|limit|extent)\b/i.test(m)) return -25;
  }
  if (normalizedWord === 'wind' && want === 'noun') {
    if (/\b(air|blow|breeze)\b/i.test(m)) return 12;
  }
  return 0;
}

export type SelectBestMwParams = {
  displayWord: string;
  normalizedWord: string;
  wordType: WordTypeTag;
  /** Lemma or alternate lookup form; empty if same as surface. */
  lookupHint?: string;
  /** Short sentence/context for heuristic boosts. */
  contextSnippet?: string;
  entries: PhoneticsEntry[];
};

/**
 * Score MW entries and return exactly one best, or null.
 * Higher score = better fit for contextual POS + child-friendly definition.
 */
export function selectBestMwEntry(params: SelectBestMwParams): PhoneticsEntry | null {
  const { displayWord, normalizedWord, wordType, lookupHint, contextSnippet, entries } = params;
  const valid = entries.filter((e) => e.meaning && e.meaning.trim().length > 0);
  if (valid.length === 0) return null;

  const dw = displayWord.trim().toLowerCase();
  const hint = (lookupHint ?? '').trim().toLowerCase();
  const ctx = (contextSnippet ?? '').toLowerCase();

  let best: PhoneticsEntry | null = null;
  let bestScore = -Infinity;

  for (const e of valid) {
    let s = 0;
    const fl = e.functionalLabel ?? '';
    const hw = (e.headwordDisplay ?? '').toLowerCase();
    const mean = e.meaning.trim();

    if (wordType === 'acronym') {
      if (isAbbreviationStyleEntry(e)) s += 80;
      else s += 10;
    } else {
      const posMatch = flMatchesWordType(fl, wordType);
      const posConflict =
        (wordType === 'noun' &&
          normFl(fl).includes('verb') &&
          !normFl(fl).includes('noun')) ||
        (wordType === 'verb' &&
          normFl(fl).includes('noun') &&
          !normFl(fl).includes('verb')) ||
        (wordType === 'adverb' &&
          normFl(fl).includes('adjective') &&
          !normFl(fl).includes('adverb')) ||
        (wordType === 'adjective' && normFl(fl).includes('adverb'));

      if (posMatch) s += 45;
      if (posConflict) s -= 38;

      if (wordType === 'adverb' && looksAdverbLy(displayWord)) {
        if (normFl(fl).includes('adverb')) s += 25;
        if (normFl(fl).includes('adjective') && !normFl(fl).includes('adverb')) s -= 35;
      }

      if (wordType === 'noun' && looksPluralNoun(displayWord)) {
        if (normFl(fl).includes('noun')) s += 18;
        if (normFl(fl).includes('verb') && !normFl(fl).includes('noun')) s -= 28;
      }

      if (wordType === 'verb' && looksVerbInflection(displayWord)) {
        if (normFl(fl).includes('verb')) s += 20;
        if (normFl(fl).includes('noun') && !normFl(fl).includes('verb')) s -= 22;
      }

      if (hint && (hw === hint || hw.startsWith(hint) || hint.startsWith(hw))) {
        s += 22;
      }
      if (hw === dw || hw === normalizedWord) {
        s += 28;
      }

      if (ctx.includes(' fear ') || ctx.endsWith(' fear') || ctx.startsWith('fear ')) {
        if (normalizedWord === 'fear' && normFl(fl).includes('noun')) s += 15;
      }

      s += meaningLengthScore(mean);
      s += specializedPenalty(mean, normalizedWord);
      s += domainBoost(mean, normalizedWord, wordType);
    }

    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }

  return best;
}
