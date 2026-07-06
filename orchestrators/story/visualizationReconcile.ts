import { imageGenerationServiceBase } from './serviceBaseUrls';

/** True when the image-generation service has persisted one or more scenes for this story. */
export async function visualizationHasScenes(storyId: string): Promise<boolean> {
  const base = imageGenerationServiceBase();
  const timeoutMs = Number(process.env.READON_IMAGE_GEN_WARM_FETCH_TIMEOUT_MS ?? 30000);
  try {
    const res = await fetch(`${base}/images/story/${encodeURIComponent(storyId)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 30000),
    });
    if (!res.ok) return false;
    const j = (await res.json()) as { scenes?: unknown[] };
    return Array.isArray(j.scenes) && j.scenes.length > 0;
  } catch {
    return false;
  }
}
