/**
 * Shared TypeScript types for the frontend
 */

export interface Choice {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  question: string;
  choices: Choice[];
}

export interface WordData {
  word: string;
  phonetic: string;
  audio_url: string | null;
  definition: string;
}

export interface VisualizationResult {
  segment: string;
  image_data: string;
  segment_type: 'paragraph' | 'sentence';
}

