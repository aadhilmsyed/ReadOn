/**
 * Ensure Breakdown is pronunciation-only and never duplicates Meaning.
 */
export function finalizePronunciationBreakdown(meaning: string, rawBreakdown: string | null | undefined): string | null {
  const m = meaning.trim();
  const b = (rawBreakdown ?? '').trim();
  if (!b) return null;
  if (b === m) return null;
  return b;
}
