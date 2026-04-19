export interface GenerateImageClientRequest {
  prompt: string;
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

/** Same-origin BFF proxy — keeps service URL and keys on the server. */
function getImageServiceUrl(): string {
  if (typeof window === 'undefined') {
    return '/api/images/generate';
  }
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function generateImage(
  request: GenerateImageClientRequest,
  config: ImageGenerationClientConfig = {}
): Promise<GeneratedImageClientResult> {
  const baseUrl = config.baseUrl || getImageServiceUrl();
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await postWithTimeout(`${baseUrl}/images/generate`, request, timeoutMs);
      const data = (await response.json()) as GeneratedImageClientResult;

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
