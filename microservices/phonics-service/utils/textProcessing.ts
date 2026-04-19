import type { TokenCandidate } from '@phonics/types';
import { isStopword } from '@phonics/utils/stopwords';

const TOKEN_SPLIT = /[\s\u00A0]+/;

/** Strip surrounding Unicode punctuation; keep internal apostrophes for contractions. */
export function stripOuterPunctuation(raw: string): string {
  let s = raw.trim();
  // trim common quotes and punctuation from both ends
  s = s.replace(/^[\s"'“”‘’«»()[\]{}.,;:!?…–—-]+/, '');
  s = s.replace(/[\s"'“”‘’«»()[\]{}.,;:!?…–—-]+$/, '');
  return s;
}

/**
 * Heuristic: strip trailing possessive ('s or ') for dedupe / lookup.
 * TODO: Revisit edge cases for names and classical forms if content quality requires it.
 */
export function stripPossessiveForNormalize(s: string): string {
  let t = s;
  if (t.endsWith("'s") || t.endsWith('’s')) {
    t = t.slice(0, -2);
  } else if (t.endsWith("'") || t.endsWith('’')) {
    t = t.slice(0, -1);
  }
  return t;
}

/**
 * Normalized key: lowercase, possessive stripped, outer punctuation stripped,
 * internal apostrophe kept for common contractions.
 */
export function normalizeWordForDedupe(displayToken: string): string {
  let s = stripOuterPunctuation(displayToken);
  s = stripPossessiveForNormalize(s);
  s = s.toLowerCase();
  s = stripOuterPunctuation(s);
  return s;
}

/** Title-case token (all letters) may be normalized to lowercase for storage when not acronym. */
export function toDisplayForm(rawToken: string): string {
  const stripped = stripOuterPunctuation(rawToken);
  if (!stripped) return '';
  const letters = stripped.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ']/g, '');
  if (!letters) return stripped;

  const isAllCapsAcronym =
    letters === letters.toUpperCase() &&
    letters.length >= 2 &&
    /^[A-Z]+$/.test(letters.replace(/'/g, ''));

  if (isAllCapsAcronym) {
    return stripped;
  }

  // Simple title case heuristic: "Dragon" stays; we lowercase for flashcards readability
  if (
    stripped[0] === stripped[0]!.toUpperCase() &&
    stripped.slice(1) === stripped.slice(1).toLowerCase() &&
    stripped.length > 1
  ) {
    return stripped.toLowerCase();
  }

  return stripped;
}

export function isNoiseToken(normalized: string, display: string): boolean {
  if (!normalized || normalized.length < 2) return true;
  if (/\d/.test(display)) return true;
  // obvious symbol-heavy tokens
  if (/[^A-Za-zÀ-ÖØ-öø-ÿ'\-]/.test(normalized.replace(/['’]/g, ''))) return true;
  return false;
}

export function isAcronymStyleToken(raw: string): boolean {
  const inner = stripOuterPunctuation(raw).replace(/[^A-Za-z]/g, '');
  return inner.length >= 2 && inner === inner.toUpperCase() && /^[A-Z]+$/.test(inner);
}

/**
 * Dedupe key: surface + acronym/plain so ACT vs act stay separate per requirements.
 */
export function tokenDedupeKey(displayWord: string, normalizedWord: string): string {
  const ac = isAcronymStyleToken(displayWord);
  return `${normalizedWord}__${ac ? 'acronym' : 'plain'}`;
}

/**
 * Extract ordered unique candidates: dedupe by (normalized + acronym/plain), preserve first display.
 */
export function extractStoryTokenCandidates(storyText: string): {
  candidates: TokenCandidate[];
  totalAfterDedupe: number;
} {
  const parts = storyText.split(TOKEN_SPLIT).filter(Boolean);
  const seen = new Set<string>();
  const candidates: TokenCandidate[] = [];

  for (const part of parts) {
    const display = toDisplayForm(part);
    if (!display) continue;
    const normalized = normalizeWordForDedupe(display);
    if (isNoiseToken(normalized, display)) continue;
    if (isStopword(normalized)) continue;
    const key = tokenDedupeKey(display, normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ displayWord: display, normalizedWord: normalized });
  }

  return { candidates, totalAfterDedupe: candidates.length };
}
