export interface CachedImageResult {
  requestId: string;
  imageUrls: string[];
  provider: string;
  cachedAt: Date;
}

export interface IImageGenerationCache {
  get(key: string): Promise<CachedImageResult | null>;
  set(key: string, value: CachedImageResult, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
