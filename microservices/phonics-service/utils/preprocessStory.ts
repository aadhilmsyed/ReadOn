import nlp from 'compromise';
import type { ProcessedStoryToken, WordTypeTag } from '@phonics/types';
import { deriveLookupHint } from '@phonics/utils/lemma';
import { isStopword } from '@phonics/utils/stopwords';
import { isLowValueLexeme } from '@phonics/utils/vocabularyExclusions';
import {
  isAcronymStyleToken,
  isNoiseToken,
  normalizeWordForDedupe,
  stripOuterPunctuation,
  toDisplayForm,
} from '@phonics/utils/textProcessing';

type JsonTerm = {
  text: string;
  tags?: string[] | Record<string, boolean>;
};

function normalizeTags(raw: JsonTerm['tags']): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return Object.keys(raw).filter((k) => (raw as Record<string, boolean>)[k]);
}

/**
 * compromise sentence-level tags → coarse POS. Returns:
 * - omit: proper noun / skip
 * - unknown: function word etc. (caller excludes from flashcards)
 */
function contextualWordType(tags: string[]): WordTypeTag | 'omit' | 'unknown' {
  const t = tags.join('|');
  if (/ProperNoun|Person|Place/i.test(t)) return 'omit';

  if (
    tags.some((x) =>
      /^(Pronoun|Determiner|Preposition|Conjunction|QuestionWord|Expression|Value|Article)$/i.test(x),
    )
  ) {
    return 'unknown';
  }

  if (tags.includes('Verb') || tags.includes('PastTense') || tags.includes('Gerund') || tags.includes('Infinitive')) {
    return 'verb';
  }
  if (tags.includes('Adverb')) return 'adverb';
  if (tags.includes('Adjective')) return 'adjective';
  if (tags.includes('Noun') || tags.includes('Plural') || tags.includes('Singular')) {
    return 'noun';
  }
  return 'unknown';
}

function splitSentences(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const parts = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [t];
}

/**
 * Acronym: all caps, alphabetic, length >= 2.
 */
export function isAcronymCandidate(raw: string): boolean {
  return isAcronymStyleToken(raw);
}

/**
 * Full-story preprocessing: sentence-level compromise POS, acronym-first, no unknown flashcards.
 */
export function preprocessStoryForPhonics(storyText: string): {
  tokens: ProcessedStoryToken[];
  totalCandidates: number;
} {
  const seenNorm = new Set<string>();
  const tokens: ProcessedStoryToken[] = [];

  const sentences = splitSentences(storyText);

  for (const sentence of sentences) {
    const normalizedSentence = sentence.replace(/\s+/g, ' ').trim();
    if (!normalizedSentence) continue;

    const doc = nlp(normalizedSentence);
    const first = doc.json()[0] as { terms?: JsonTerm[] } | undefined;
    const terms = first?.terms ?? [];

    for (const term of terms) {
      const rawText = term.text ?? '';
      const display = toDisplayForm(rawText);
      if (!display) continue;

      const normalized = normalizeWordForDedupe(display);
      if (isNoiseToken(normalized, display)) continue;
      if (isStopword(normalized)) continue;
      if (isLowValueLexeme(normalized)) continue;
      if (seenNorm.has(normalized)) continue;

      const contextSnippet = normalizedSentence.length > 280 ? normalizedSentence.slice(0, 277) + '…' : normalizedSentence;

      if (isAcronymCandidate(display)) {
        seenNorm.add(normalized);
        tokens.push({
          displayWord: display,
          normalizedWord: normalized,
          wordType: 'acronym',
          lookupHint: deriveLookupHint(display, 'acronym'),
          contextSnippet,
        });
        continue;
      }

      const tags = normalizeTags(term.tags);
      const wt = contextualWordType(tags);
      if (wt === 'omit' || wt === 'unknown') continue;

      seenNorm.add(normalized);
      tokens.push({
        displayWord: display,
        normalizedWord: normalized,
        wordType: wt,
        lookupHint: deriveLookupHint(display, wt),
        contextSnippet,
      });
    }
  }

  return { tokens, totalCandidates: tokens.length };
}
