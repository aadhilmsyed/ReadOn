/**
 * Questions service - business logic for question generation
 */

import { QuestionsRequest, QuestionsResponse, Question } from '../models/questions';
import { geminiClient } from '../clients/gemini';
import { comprehensionCache, getCachedQuestions } from '../../utils/caches';
import { logger } from '../middlewares/logging';
import { ExternalServiceError } from '../middlewares/errors';

/**
 * Cleans JSON response from markdown formatting
 */
function cleanJsonResponse(response: string): string {
  return response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
}

/**
 * Validates and parses questions from Gemini response
 */
function parseQuestionsResponse(response: string): QuestionsResponse {
  const cleaned = cleanJsonResponse(response);

  try {
    const parsed = JSON.parse(cleaned);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response structure: missing questions array');
    }

    // Validate each question
    parsed.questions.forEach((q: any, index: number) => {
      if (!q.question || typeof q.question !== 'string') {
        throw new Error(`Invalid question structure at index ${index}: missing or invalid question field`);
      }
      if (!Array.isArray(q.choices) || q.choices.length !== 4) {
        throw new Error(`Invalid question structure at index ${index}: choices must be an array of 4 items`);
      }
      q.choices.forEach((choice: any, choiceIndex: number) => {
        if (!choice.text || typeof choice.text !== 'string') {
          throw new Error(
            `Invalid choice structure at question ${index}, choice ${choiceIndex}: missing or invalid text field`
          );
        }
        if (typeof choice.isCorrect !== 'boolean') {
          throw new Error(
            `Invalid choice structure at question ${index}, choice ${choiceIndex}: isCorrect must be a boolean`
          );
        }
      });
    });

    return parsed as QuestionsResponse;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ExternalServiceError(
        'Failed to parse JSON response from Gemini',
        'Gemini',
        { response: cleaned.substring(0, 200) } // First 200 chars for debugging
      );
    }
    throw error;
  }
}

/**
 * Generates comprehension questions for text
 */
export async function generateQuestions(
  request: QuestionsRequest
): Promise<QuestionsResponse> {
  const { text } = request;

  // Check cache first
  const cached = getCachedQuestions(text);
  if (cached) {
    logger.debug('Using cached questions', { textLength: text.length });
    return cached;
  }

  // Calculate number of questions based on text length
  const questionsCount = Math.min(Math.max(1, Math.ceil(text.length / 200)), 15);

  logger.info('Generating questions', {
    textLength: text.length,
    questionsCount,
  });

  const prompt = `Generate exactly ${questionsCount} multiple-choice comprehension questions for the following text: ${text}. 
    The questions should cover different aspects of the text and vary in difficulty.
    Format the output as a valid JSON object with this structure:
    {
      "questions": [
        {
          "question": "What is the main idea of the text?",
          "choices": [
            { "text": "Choice A", "isCorrect": false },
            { "text": "Choice B", "isCorrect": true },
            { "text": "Choice C", "isCorrect": false },
            { "text": "Choice D", "isCorrect": false }
          ]
        }
      ]
    }
    Important: Return only the JSON object, without any markdown formatting or backticks.`;

  // Generate questions using Gemini
  const response = await geminiClient.generateContent(prompt);

  // Parse and validate response
  const questions = parseQuestionsResponse(response);

  logger.info('Questions generated successfully', {
    questionCount: questions.questions.length,
  });

  // Cache the result
  comprehensionCache.put(text, questions);

  return questions;
}

