/**
 * Domain shapes and parsing for audiobook / read-aloud narration.
 * Aligns with `POST /api/audiobook/tts` body: `{ text?, storyId? }`.
 */

export interface AudiobookNarrationRequest {
  readonly sourceText: string;
  readonly storyId: number | null;
}

export interface AudiobookNarrationResult {
  readonly sourceText: string;
  readonly storyId: number | null;
  readonly audioBuffer: Buffer;
  readonly mimeType: string;
}

function parseOptionalStoryId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalizes JSON body into a narration request. Does not enforce TTS byte limits;
 * synthesis throws with the same messages as the Google TTS path.
 */
export function parseAudiobookNarrationRequest(body: unknown): AudiobookNarrationRequest {
  if (body === null || typeof body !== 'object') {
    throw new Error('Narration request body must be a JSON object.');
  }

  const record = body as Record<string, unknown>;
  const text = typeof record.text === 'string' ? record.text : '';

  return {
    sourceText: text,
    storyId: parseOptionalStoryId(record.storyId),
  };
}

export function buildAudiobookNarrationResult(
  request: AudiobookNarrationRequest,
  audioBuffer: Buffer,
  mimeType: string,
): AudiobookNarrationResult {
  return {
    sourceText: request.sourceText,
    storyId: request.storyId,
    audioBuffer,
    mimeType,
  };
}
