import nlp from 'compromise';
import type { WordTypeTag } from '@phonics/types';
import { stripOuterPunctuation } from '@phonics/utils/textProcessing';

const IRREGULAR_VERB_TO_LEMMA: Record<string, string> = {
  found: 'find',
  held: 'hold',
  spun: 'spin',
  went: 'go',
  took: 'take',
  gave: 'give',
  came: 'come',
  began: 'begin',
  swam: 'swim',
  ran: 'run',
  ate: 'eat',
  drank: 'drink',
  wrote: 'write',
  drove: 'drive',
  knew: 'know',
  thought: 'think',
  bought: 'buy',
  brought: 'bring',
  caught: 'catch',
  taught: 'teach',
  sought: 'seek',
  fought: 'fight',
  built: 'build',
  sent: 'send',
  spent: 'spend',
  lost: 'lose',
  paid: 'pay',
  said: 'say',
  told: 'tell',
  sold: 'sell',
  stood: 'stand',
  understood: 'understand',
};

const IRREGULAR_NOUN_TO_SINGULAR: Record<string, string> = {
  teeth: 'tooth',
  feet: 'foot',
  geese: 'goose',
  mice: 'mouse',
  men: 'man',
  women: 'woman',
  children: 'child',
};

function lastToken(text: string): string {
  const parts = text.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? '').toLowerCase();
}

/**
 * Dictionary lookup hint (not necessarily the displayed flashcard headword).
 * Uses light compromise helpers: "they <verb>" / "the <noun>" wrappers work better than bare tokens.
 */
export function deriveLookupHint(displayWord: string, wordType: WordTypeTag): string {
  const stripped = stripOuterPunctuation(displayWord);
  const lower = stripped.toLowerCase();

  if (wordType === 'acronym') {
    return lower;
  }

  if (wordType === 'verb') {
    const ir = IRREGULAR_VERB_TO_LEMMA[lower];
    if (ir) return ir;
    const out = nlp(`they ${lower}`).verbs().toInfinitive().text();
    const lemma = lastToken(out);
    return lemma || lower;
  }

  if (wordType === 'noun') {
    const ir = IRREGULAR_NOUN_TO_SINGULAR[lower];
    if (ir) return ir;
    const out = nlp(`the ${lower}`).nouns().toSingular().text();
    const lemma = lastToken(out);
    return lemma || lower;
  }

  return lower;
}

export function looksPluralNoun(surface: string): boolean {
  const w = stripOuterPunctuation(surface).toLowerCase();
  if (w.length < 3) return false;
  if (/(ses|xes|zes|ches|shes)$/.test(w)) return true;
  if (w.endsWith('ies') && w.length > 4) return true;
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return true;
  return false;
}

export function looksVerbInflection(surface: string): boolean {
  const w = stripOuterPunctuation(surface).toLowerCase();
  if (/(?:[^aeiou]ed|ied)$/.test(w)) return true;
  if (w.endsWith('ing') && w.length > 4) return true;
  return false;
}

export function looksAdverbLy(surface: string): boolean {
  const w = stripOuterPunctuation(surface).toLowerCase();
  return w.length > 4 && w.endsWith('ly');
}
