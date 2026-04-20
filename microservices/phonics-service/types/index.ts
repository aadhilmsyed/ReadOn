/** Stored / API word classification */
export type WordTypeTag = 'acronym' | 'noun' | 'verb' | 'adjective' | 'adverb' | 'unknown';

/** Request DTO — process story */
export type ProcessPhonicsBody = {
  storyId: string;
  storyText: string;
};

/** Flashcard returned to clients */
export type PhonicsFlashcardDto = {
  wordId: number;
  word: string;
  meaning: string;
  breakdown: string | null;
  audioUrl: string | null;
  displayOrder: number;
  wordType: WordTypeTag;
};

export type ProcessPhonicsSuccess = {
  success: true;
  storyId: string;
  totalCandidateWords: number;
  existingWordsLinked: number;
  newWordsFetched: number;
  skippedWords: number;
  entriesCreated: number;
  message: string;
  data: PhonicsFlashcardDto[];
};

export type StoryPhonicsSuccess = {
  success: true;
  storyId: string;
  count: number;
  data: PhonicsFlashcardDto[];
};

export type PhonicsErrorBody = {
  success: false;
  error: string;
  /** Provider/system message when safe to expose */
  detail?: string;
};

/** DB row — Phonics_Words */
export type PhonicsWordRow = {
  Word_ID: number;
  Word: string;
  Normalized_Word: string;
  Word_Type: WordTypeTag;
  Meaning: string;
  Breakdown: string | null;
  Audio_URL: string | null;
  Created_At: Date;
  Updated_At: Date;
};

/** Legacy tokenizer output (tests / helpers) */
export type TokenCandidate = {
  displayWord: string;
  normalizedWord: string;
};

/** One token after preprocessing (one per normalized word per story) */
export type ProcessedStoryToken = {
  displayWord: string;
  normalizedWord: string;
  wordType: WordTypeTag;
  /** Lemma / base form hint for MW lookup & ranking (display stays `displayWord`) */
  lookupHint: string;
  /** Sentence (or truncated paragraph) for sense ranking */
  contextSnippet: string;
};

/** One resolved row ready to persist */
export type ResolvedPhonicsEntry = {
  displayWord: string;
  normalizedWord: string;
  wordType: WordTypeTag;
  meaning: string;
  breakdown: string | null;
  audioUrl: string | null;
};

/** Provider-neutral dictionary entry (MW adapter maps into this) */
export type PhoneticsEntry = {
  headwordDisplay: string;
  meaning: string;
  /** Pronunciation string only; never duplicate Meaning */
  breakdown: string | null;
  audioUrl: string | null;
  functionalLabel: string | null;
};

export type PhoneticsLookupResult = {
  /** Raw entries from provider; service selects exactly one */
  entries: PhoneticsEntry[];
};
