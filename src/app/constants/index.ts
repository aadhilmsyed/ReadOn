/**
 * Application constants
 */

export const CHARACTER_LIMIT = 3500;

export const ROUTES = {
  HOME: '/',
  PHONICS: '/phonics',
  COMPREHENSION: '/comprehension',
  VISUALIZATION: '/visualization',
  AUDIOBOOK: '/audiobook',
  INTERACTIVE: '/interactive',
} as const;

export const API_ENDPOINTS = {
  QUESTIONS: '/api/generateQuestions',
  VISUALIZATION: '/api/visualization',
  PHONETICS: '/api/phonetics',
  TEXT_TO_SPEECH: '/api/text-to-speech',
} as const;

