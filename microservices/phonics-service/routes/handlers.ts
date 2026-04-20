import { getStoryPhonicsController, postProcessPhonicsController } from '@phonics/controllers/phonicsController';

/**
 * Thin HTTP-agnostic entrypoints for the Next.js Route Handlers (or future standalone server).
 */

export async function handlePostProcessPhonics(body: unknown) {
  return postProcessPhonicsController(body);
}

export async function handleGetStoryPhonics(storyId: string) {
  return getStoryPhonicsController(storyId);
}
