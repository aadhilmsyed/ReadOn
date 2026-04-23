import { createHash } from 'node:crypto';

import type { AudiobookSpeechResult } from './googleTtsSynthesis';

export type AudiobookTtsCacheStatus = 'HIT' | 'MISS' | 'BYPASS';

interface AudiobookTtsCacheEntry extends AudiobookSpeechResult {
  readonly createdAtMs: number;
}

export interface AudiobookTtsCacheConfig {
  readonly enabled: boolean;
  readonly ttlMs: number;
  readonly maxEntries: number;
}

export interface AudiobookTtsCacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return fallback;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getEffectiveVoiceConfig(): { languageCode: string; voiceName: string; speakingRate: string } {
  return {
    languageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE ?? 'en-US',
    voiceName: process.env.GOOGLE_TTS_VOICE_NAME ?? 'en-US-Neural2-J',
    speakingRate: process.env.GOOGLE_TTS_SPEAKING_RATE ?? '1',
  };
}

export function buildAudiobookTtsCacheKey(sourceText: string): string {
  const normalizedText = sourceText.trim().replace(/\s+/g, ' ');
  const voice = getEffectiveVoiceConfig();
  const cacheKeySource = JSON.stringify({
    sourceText: normalizedText,
    languageCode: voice.languageCode,
    voiceName: voice.voiceName,
    speakingRate: voice.speakingRate,
  });
  return createHash('sha256').update(cacheKeySource).digest('hex');
}

export class InMemoryAudiobookTtsCache {
  private readonly store = new Map<string, AudiobookTtsCacheEntry>();
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(private readonly config: AudiobookTtsCacheConfig) {}

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getStats(): AudiobookTtsCacheStats {
    return { ...this.stats };
  }

  clear(): void {
    this.store.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  get(key: string): AudiobookSpeechResult | null {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses += 1;
      return null;
    }

    const now = Date.now();
    if (now - entry.createdAtMs > this.config.ttlMs) {
      this.store.delete(key);
      this.stats.misses += 1;
      return null;
    }

    this.store.delete(key);
    this.store.set(key, entry);
    this.stats.hits += 1;
    return {
      audioBuffer: Buffer.from(entry.audioBuffer),
      mimeType: entry.mimeType,
    };
  }

  set(key: string, value: AudiobookSpeechResult): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.store.has(key)) {
      this.store.delete(key);
    }

    if (this.store.size >= this.config.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (typeof oldestKey === 'string') {
        this.store.delete(oldestKey);
        this.stats.evictions += 1;
      }
    }

    this.store.set(key, {
      audioBuffer: Buffer.from(value.audioBuffer),
      mimeType: value.mimeType,
      createdAtMs: Date.now(),
    });
  }
}

export function resolveAudiobookTtsCacheConfig(): AudiobookTtsCacheConfig {
  return {
    enabled: parseBoolean(process.env.AUDIOBOOK_TTS_CACHE_ENABLED, true),
    ttlMs: parsePositiveInt(process.env.AUDIOBOOK_TTS_CACHE_TTL_MS, 3_600_000),
    maxEntries: parsePositiveInt(process.env.AUDIOBOOK_TTS_CACHE_MAX_ENTRIES, 100),
  };
}

export const audiobookTtsCache = new InMemoryAudiobookTtsCache(resolveAudiobookTtsCacheConfig());

export function resetAudiobookTtsCacheForTests(): void {
  audiobookTtsCache.clear();
}
