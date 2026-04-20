/**
 * Extra blocklist beyond stopwords: function words / pronouns / connectives that often
 * slip past POS taggers but are poor flashcard targets. Keep small and intentional.
 * TODO: Tune per curriculum if needed.
 */
export const LOW_VALUE_LEXEMES = new Set([
  'whenever',
  'wherever',
  'whatever',
  'whichever',
  'whoever',
  'one',
  'two',
  'three',
  'toward',
  'towards',
  'until',
  'along',
  'although',
  'though',
  'while',
  'whether',
  'unless',
  'since',
  'within',
  'without',
  'among',
  'between',
  'beyond',
  'something',
  'nothing',
  'everything',
  'anything',
  'everyone',
  'someone',
  'anyone',
  'nobody',
  'everybody',
  'somebody',
  'anybody',
  'somewhere',
  'anywhere',
  'everywhere',
  'nowhere',
]);

export function isLowValueLexeme(normalized: string): boolean {
  return LOW_VALUE_LEXEMES.has(normalized);
}
