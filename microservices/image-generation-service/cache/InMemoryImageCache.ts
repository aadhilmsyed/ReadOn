import { IImageGenerationCache, CachedImageResult } from './IImageGenerationCache';

interface CacheEntry {
  value: CachedImageResult;
  expiresAt: number;
}

export class InMemoryImageCache implements IImageGenerationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 3600;

  constructor(defaultTTLSeconds?: number) {
    if (defaultTTLSeconds) {
      this.defaultTTL = defaultTTLSeconds;
    }
  }

  async get(key: string): Promise<CachedImageResult | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: CachedImageResult, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTTL;
    const expiresAt = Date.now() + (ttl * 1000);

    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}
