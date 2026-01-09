/**
 * Visualization service - business logic for image generation
 */

import { VisualizationRequest, VisualizationResponse, VisualizationResult } from '../models/visualization';
import { openAIClient } from '../clients/openai';
import { visualizationCache, getCachedVisualization } from '../../utils/caches';
import { logger } from '../middlewares/logging';
import { ExternalServiceError } from '../middlewares/errors';

/**
 * Splits text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n/).filter((p) => p.trim());
}

/**
 * Splits text into sentences
 */
function splitIntoSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
}

/**
 * Fetches an image from a URL with timeout
 */
async function fetchImageWithTimeout(url: string, timeout: number = 8000): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image fetch timeout');
    }
    throw error;
  }
}

/**
 * Converts image buffer to base64 data URL
 */
function imageBufferToDataUrl(buffer: ArrayBuffer): string {
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:image/png;base64,${base64}`;
}

/**
 * Generates visualizations for text segments
 */
export async function generateVisualizations(
  request: VisualizationRequest
): Promise<VisualizationResponse> {
  const { text } = request;

  // Check cache first
  const cached = getCachedVisualization(text);
  if (cached) {
    logger.debug('Using cached visualization', { textLength: text.length });
    return cached;
  }

  // Split text into segments
  let segments = splitIntoParagraphs(text);
  let segmentType: 'paragraph' | 'sentence' = 'paragraph';

  if (segments.length <= 1) {
    segments = splitIntoSentences(text);
    segmentType = 'sentence';
  }

  // Limit segments to prevent timeout (max 3)
  segments = Array.from(new Set(segments.filter((s) => s.trim()))).slice(0, 3);

  if (segments.length === 0) {
    throw new Error('No valid segments found in text');
  }

  logger.info('Generating visualizations', {
    segmentCount: segments.length,
    segmentType,
  });

  // Process segments concurrently
  const results: (VisualizationResult | undefined)[] = new Array(segments.length);

  await Promise.all(
    segments.map(async (segment, i) => {
      try {
        // Create prompt with context for subsequent segments
        const prompt =
          i === 0
            ? `Starting ${segmentType}: ${segment}
               Generate a detailed, realistic image that best represents this ${segmentType}.
               Create a cohesive visual that captures the main elements and mood.
               Do not include any text in the image.`
            : `Context: ${segments.slice(0, i).join(' ')}
               Current ${segmentType}: ${segment}
               Generate an image that continues the story, focusing on the current ${segmentType}
               while maintaining visual consistency with the previous context.
               Create a cohesive scene that flows naturally from the previous segments.
               Do not include any text in the image.`;

        // Generate image
        const imageUrl = await openAIClient.generateImage(prompt);

        // Fetch and convert to base64
        const imageBuffer = await fetchImageWithTimeout(imageUrl);
        const imageData = imageBufferToDataUrl(imageBuffer);

        results[i] = {
          segment,
          image_data: imageData,
          segment_type: segmentType,
        };

        logger.debug(`Generated visualization for segment ${i + 1}/${segments.length}`);
      } catch (error) {
        logger.error(`Error processing segment ${i}:`, error, { segmentIndex: i });
        // Continue processing other segments even if one fails
      }
    })
  );

  // Filter out failed generations
  const validResults = results.filter(
    (result): result is VisualizationResult => result !== undefined
  );

  if (validResults.length === 0) {
    throw new ExternalServiceError(
      'Failed to generate any valid images',
      'OpenAI'
    );
  }

  const response: VisualizationResponse = {
    results: validResults,
  };

  // Cache the result
  visualizationCache.put(text, response);

  return response;
}

