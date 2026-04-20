import type { ImageGenerationProxy } from './ImageGenerationProxy';
import type { GenerateImageResponseDTO } from '../types/dtos';
import { splitIllustrationParagraphs } from '../utils/splitIllustrationParagraphs';

const MAX_PROMPT_PARAGRAPH_CHARS = 900;
const MAX_CONTEXT_CHARS = 700;

function compactText(text: string, limit: number): string {
  const compacted = text.replace(/\s+/g, ' ').trim();
  if (compacted.length <= limit) {
    return compacted;
  }
  return `${compacted.slice(0, limit).trim()}...`;
}

function buildIllustrationPrompt(paragraph: string, fullStory: string, paragraphIndex: number): string {
  const storyContext = compactText(fullStory, MAX_CONTEXT_CHARS);
  const sceneText = compactText(paragraph, MAX_PROMPT_PARAGRAPH_CHARS);

  return [
    'Create a single children\'s storybook illustration for one paragraph.',
    'Use warm, readable, age-appropriate visual storytelling with expressive characters and a clear setting.',
    'Keep character appearance consistent with the story context.',
    'Do not include written words, captions, speech bubbles, logos, watermarks, UI, or book-page text in the image.',
    'Use a rectangular storybook composition that fits a 4:3 illustration frame.',
    `Story context: ${storyContext}`,
    `Paragraph ${paragraphIndex + 1} scene to illustrate: ${sceneText}`,
    'Focus on the most important action, emotion, location, and objects from this paragraph.',
    'Style: polished picture-book art, soft natural lighting, rich but balanced colors, safe for children.',
  ].join('\n');
}

export interface StorybookFromStoryInput {
  storyId: string;
  storyText: string;
  userId?: string;
}

export interface StorybookFromStoryResult {
  success: boolean;
  scenes: Array<{
    paragraph: string;
    paragraphIndex: number;
    response: GenerateImageResponseDTO;
  }>;
  error?: string;
}

/**
 * Runs sentence-aware paragraph chunking, then one image generation per chunk via the proxy
 * (cache, metadata, rate limit) before the external provider is invoked.
 */
export async function generateStorybookFromStory(
  proxy: ImageGenerationProxy,
  input: StorybookFromStoryInput,
): Promise<StorybookFromStoryResult> {
  const fullStory = input.storyText.trim();
  const chunks = splitIllustrationParagraphs(fullStory);
  const scenes: StorybookFromStoryResult['scenes'] = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const paragraph = chunks[i];
    const prompt = buildIllustrationPrompt(paragraph, fullStory, i);
    const response = await proxy.generateImage({
      storyId: input.storyId,
      userId: input.userId,
      prompt,
      style: 'storybook illustration',
      theme: 'reading visualization',
      ageGroup: 'children',
      numImages: 1,
    });
    scenes.push({ paragraph, paragraphIndex: i, response });
    if (!response.success) {
      return {
        success: false,
        scenes,
        error: response.error?.message || 'image_generation_failed',
      };
    }
  }

  return { success: true, scenes };
}
