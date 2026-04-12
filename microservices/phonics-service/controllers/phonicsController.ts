import { processPhonicsBodySchema } from '@phonics/validators/phonicsSchemas';
import { getStoryPhonicsData, processStoryPhonics, PhoneticsProviderError } from '@phonics/services/phonicsService';
import type { PhonicsErrorBody, ProcessPhonicsSuccess, StoryPhonicsSuccess } from '@phonics/types';

export type ControllerResult =
  | { status: 200; body: ProcessPhonicsSuccess | StoryPhonicsSuccess }
  | { status: 400; body: PhonicsErrorBody }
  | { status: 404; body: PhonicsErrorBody }
  | { status: 429; body: PhonicsErrorBody }
  | { status: 500; body: PhonicsErrorBody };

function err(
  status: 400 | 404 | 429 | 500,
  error: string,
  detail?: string,
): { status: typeof status; body: PhonicsErrorBody } {
  return { status, body: { success: false, error, detail } };
}

export async function postProcessPhonicsController(rawBody: unknown): Promise<ControllerResult> {
  const parsed = processPhonicsBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return err(400, 'Invalid request body', msg);
  }

  const { storyId, storyText } = parsed.data;

  try {
    const body = await processStoryPhonics(storyId, storyText);
    return { status: 200, body };
  } catch (e) {
    if (e instanceof PhoneticsProviderError) {
      if (e.code === 'RATE_LIMIT') {
        return err(429, 'Merriam-Webster rate limit', e.message);
      }
      if (e.code === 'INVALID_KEY') {
        return err(500, 'Merriam-Webster authentication failed', e.message);
      }
      return err(500, 'Merriam-Webster provider error', e.message);
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Phonics DB not configured') || msg.includes('ECONNREFUSED')) {
      return err(500, 'Database error', msg);
    }
    return err(500, 'Internal error', msg);
  }
}

export async function getStoryPhonicsController(storyId: string): Promise<ControllerResult> {
  if (!storyId?.trim()) {
    return err(400, 'storyId is required');
  }

  try {
    const { found, data } = await getStoryPhonicsData(storyId.trim());
    if (!found) {
      return err(404, 'No phonics data found for this story');
    }
    return {
      status: 200,
      body: {
        success: true,
        storyId: storyId.trim(),
        count: data.length,
        data,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(500, 'Database error', msg);
  }
}
