import type { AudiobookNarrationRequest, AudiobookNarrationResult } from '../models/audiobookModel';
import { buildAudiobookNarrationResult } from '../models/audiobookModel';
import { synthesizeGoogleTts, type AudiobookSpeechResult } from './googleTtsSynthesis';
import {
  audiobookTtsCache,
  buildAudiobookTtsCacheKey,
  type AudiobookTtsCacheStatus,
} from './audiobookTtsCache';

export interface NarrationDependencies {
  synthesize: (sourceText: string) => Promise<AudiobookSpeechResult>;
}

const defaultDependencies: NarrationDependencies = {
  synthesize: synthesizeGoogleTts,
};

const recentCacheStatuses = new Map<string, AudiobookTtsCacheStatus>();

function setRecentCacheStatus(cacheKey: string, status: AudiobookTtsCacheStatus): void {
  recentCacheStatuses.set(cacheKey, status);
}

export function consumeRecentNarrationCacheStatus(sourceText: string): AudiobookTtsCacheStatus {
  const cacheKey = buildAudiobookTtsCacheKey(sourceText);
  const status = recentCacheStatuses.get(cacheKey) ?? 'BYPASS';
  recentCacheStatuses.delete(cacheKey);
  return status;
}

/**
 * Runs Google Cloud TTS for the given narration request.
 * `storyId` is carried through for downstream logging or caching; synthesis uses `sourceText` only.
 */
export async function synthesizeNarration(
  request: AudiobookNarrationRequest,
  dependencies: NarrationDependencies = defaultDependencies,
): Promise<AudiobookNarrationResult> {
  const cacheKey = buildAudiobookTtsCacheKey(request.sourceText);
  if (audiobookTtsCache.isEnabled()) {
    const cached = audiobookTtsCache.get(cacheKey);
    if (cached) {
      setRecentCacheStatus(cacheKey, 'HIT');
      const stats = audiobookTtsCache.getStats();
      console.info(
        JSON.stringify({ level: 'INFO', message: 'tts_cache_hit', cacheKey, hits: stats.hits, misses: stats.misses }),
      );
      return buildAudiobookNarrationResult(request, cached.audioBuffer, cached.mimeType);
    }
    setRecentCacheStatus(cacheKey, 'MISS');
    const generated = await dependencies.synthesize(request.sourceText);
    audiobookTtsCache.set(cacheKey, generated);
    const stats = audiobookTtsCache.getStats();
    console.info(
      JSON.stringify({
        level: 'INFO',
        message: 'tts_cache_miss',
        cacheKey,
        hits: stats.hits,
        misses: stats.misses,
        evictions: stats.evictions,
      }),
    );
    return buildAudiobookNarrationResult(request, generated.audioBuffer, generated.mimeType);
  }

  setRecentCacheStatus(cacheKey, 'BYPASS');
  const { audioBuffer, mimeType } = await dependencies.synthesize(request.sourceText);
  return buildAudiobookNarrationResult(request, audioBuffer, mimeType);
}
