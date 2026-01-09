/**
 * Phonetics domain models and types
 */

export interface WordData {
  word: string;
  phonetic: string;
  audio_url: string | null;
  definition: string;
}

export interface PhoneticsRequest {
  text: string;
}

export type PhoneticsResponse = WordData[];

