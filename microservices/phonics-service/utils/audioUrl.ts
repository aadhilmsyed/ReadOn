/**
 * Merriam-Webster audio URL construction (official JSON documentation).
 * @see https://dictionaryapi.com/products/json — "sound" / audio URL section
 *
 * TODO: Confirm any additional Intermediate-dictionary-specific audio rules with Merriam-Webster
 * if playback fails for edge-case filenames.
 */

const MW_MEDIA_BASE = 'https://media.merriam-webster.com/audio/prons';

export type MwAudioLocale = {
  languageCode: 'en' | 'es';
  countryCode: 'us' | 'me';
};

const DEFAULT_LOCALE: MwAudioLocale = { languageCode: 'en', countryCode: 'us' };

/**
 * Returns subdirectory per MW rules:
 * - audio starts with "bix" -> "bix"
 * - audio starts with "gg" -> "gg"
 * - audio starts with digit or punctuation -> "number"
 * - else first character of audio
 */
export function merriamWebsterAudioSubdirectory(audioId: string): string {
  if (!audioId) return 'number';
  const first = audioId[0]!;
  if (audioId.startsWith('bix')) return 'bix';
  if (audioId.startsWith('gg')) return 'gg';
  if (/^[0-9]/.test(audioId) || /^[^a-zA-Z]/.test(first)) return 'number';
  return first.toLowerCase();
}

/**
 * Builds full public MP3 URL for a given MW `sound.audio` identifier.
 */
export function buildMerriamWebsterAudioUrl(
  audioId: string | undefined | null,
  format: 'mp3' | 'wav' | 'ogg' = 'mp3',
  locale: MwAudioLocale = DEFAULT_LOCALE,
): string | null {
  if (!audioId || !audioId.trim()) return null;
  const sub = merriamWebsterAudioSubdirectory(audioId.trim());
  const base = audioId.trim();
  return `${MW_MEDIA_BASE}/${locale.languageCode}/${locale.countryCode}/${format}/${sub}/${base}.${format}`;
}

export function isProbablyValidHttpUrl(s: string | null | undefined): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
