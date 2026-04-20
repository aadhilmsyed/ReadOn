export interface GenerateImageClientRequest {
  prompt: string;
  storyId?: string;
  paragraphIndex?: number;
  style?: string;
  theme?: string;
  ageGroup?: string;
  numImages?: number;
}

export interface GeneratedImageClientResult {
  success: boolean;
  requestId: string;
  images?: Array<{ url: string; provider: string }>;
  cached: boolean;
  error?: {
    message: string;
  };
}

export interface ImageGenerationClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_MAX_RETRIES = 1;

/** Same-origin BFF — full path to the Next route handler `POST /api/images/generate` (do not append `/images/generate` again). */
function getImageBffUrl(): string {
  return '/api/images/generate';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function postWithTimeout(url: string, body: unknown, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function parseJsonResponse(
  response: Response,
  requestUrl: string,
): Promise<GeneratedImageClientResult> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!contentType.includes('application/json')) {
    const preview = text.trim().slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(
      `Image BFF ${requestUrl} returned non-JSON (${contentType || 'unknown type'}, status ${response.status}). ` +
        `Expected JSON from /api/images/generate. Preview: ${preview || '(empty)'}`,
    );
  }

  try {
    return JSON.parse(text) as GeneratedImageClientResult;
  } catch {
    throw new Error(
      `Image BFF ${requestUrl} returned invalid JSON (status ${response.status}). Preview: ${text.slice(0, 120)}`,
    );
  }
}

export async function generateImage(
  request: GenerateImageClientRequest,
  config: ImageGenerationClientConfig = {},
): Promise<GeneratedImageClientResult> {
  const url = config.baseUrl || getImageBffUrl();
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await postWithTimeout(url, request, timeoutMs);
      const data = await parseJsonResponse(response, url);

      if (!response.ok || !data.success || !data.images?.[0]?.url) {
        throw new Error(data.error?.message || 'Image generation failed for this paragraph.');
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Image generation failed.');

      if (attempt < maxRetries) {
        await sleep(500 * (attempt + 1));
      }
    }
  }

  throw lastError || new Error('Image generation failed.');
}
