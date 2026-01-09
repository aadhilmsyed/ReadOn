/**
 * Questions domain models and types
 */

export interface Choice {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  question: string;
  choices: Choice[];
}

export interface QuestionsRequest {
  text: string;
}

export interface QuestionsResponse {
  questions: Question[];
}

