/**
 * Phonetics service - business logic for word data retrieval
 */

import { PhoneticsRequest, PhoneticsResponse, WordData } from '../models/phonetics';
import { merriamWebsterClient } from '../clients/merriam-webster';
import { phoneticsCache, getCachedPhonetics } from '../../utils/caches';
import { logger } from '../middlewares/logging';

/**
 * Gets the base form of a word by removing common suffixes
 */
function getBaseForm(word: string): string {
  word = word.toLowerCase();

  // Irregular plurals
  const irregularPlurals: { [key: string]: string } = {
    children: 'child',
    mice: 'mouse',
    feet: 'foot',
    teeth: 'tooth',
    geese: 'goose',
    men: 'man',
    women: 'woman',
    lives: 'life',
    leaves: 'leaf',
    wolves: 'wolf',
  };

  if (word in irregularPlurals) {
    return irregularPlurals[word];
  }

  // Regular plural forms and other word forms
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('es') && word.length > 4) {
    if (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('sses')) {
      return word.slice(0, -2);
    }
    return word.slice(0, -1);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) {
    return word.slice(0, -1);
  }
  if (word.endsWith('ing') && word.length > 5) {
    return word.slice(0, -3);
  }
  if (word.endsWith('ed') && word.length > 4) {
    return word.slice(0, -2);
  }
  if (word.endsWith('ly') && word.length > 4) {
    return word.slice(0, -2);
  }

  return word;
}

/**
 * Filters out common words
 */
function filterCommonWords(words: string[]): string[] {
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'up',
    'about',
    'into',
    'over',
    'after',
    'beneath',
    'under',
    'above',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'shall',
    'should',
    'can',
    'could',
    'may',
    'might',
    'must',
    'ought',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'them',
    'their',
    'this',
    'that',
    'these',
    'those',
    'as',
    'if',
    'when',
    'where',
    'why',
    'how',
    'all',
    'any',
    'some',
    'no',
    'not',
    'yes',
    'him',
    'his',
    'her',
    'mine',
    'yours',
    'ours',
    'theirs',
    'my',
    'your',
    'our',
    'its',
    'here',
    'there',
    'now',
    'then',
  ]);

  const processedWords: { [key: string]: string } = {};

  for (const word of words) {
    if (!commonWords.has(word.toLowerCase())) {
      const baseForm = getBaseForm(word);
      if (!(baseForm in processedWords) || word.length < processedWords[baseForm].length) {
        processedWords[baseForm] = word;
      }
    }
  }

  return Object.values(processedWords);
}

/**
 * Processes text and returns word data
 */
export async function getPhoneticsData(
  request: PhoneticsRequest
): Promise<PhoneticsResponse> {
  const { text } = request;

  // Check cache first
  const cached = getCachedPhonetics(text);
  if (cached) {
    logger.debug('Using cached phonetics data', { textLength: text.length });
    return cached;
  }

  // Split text into words and remove punctuation
  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/[.,!?()[\]{}":;]/g, ''));

  // Filter out common words and get unique base forms
  const uniqueWords = filterCommonWords(words);

  logger.info('Fetching phonetics data', {
    wordCount: uniqueWords.length,
    uniqueWords: uniqueWords.slice(0, 10), // Log first 10 for debugging
  });

  // Get dictionary data for each word concurrently
  const results = await Promise.all(
    uniqueWords.map(async (word) => {
      const wordData = await merriamWebsterClient.getWordData(word);
      return wordData;
    })
  );

  // Filter out null results
  const validResults = results.filter((result): result is WordData => result !== null);

  logger.info('Phonetics data fetched', {
    totalWords: uniqueWords.length,
    foundWords: validResults.length,
  });

  // Cache the result
  phoneticsCache.put(text, validResults);

  return validResults;
}

