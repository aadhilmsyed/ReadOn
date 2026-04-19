import type { PhoneticsLookupResult } from '@phonics/types';

/**
 * Adapter-facing phonetics provider contract.
 * Implementations must not throw for "word not found" — return empty entries.
 * Systemic failures (HTTP 429, 5xx, invalid key) should throw PhoneticsProviderError.
 */
export interface PhoneticsProvider {
  lookupWord(displayWord: string, normalizedWord: string): Promise<PhoneticsLookupResult>;
}

export class PhoneticsProviderError extends Error {
  constructor(
    message: string,
    readonly code: 'RATE_LIMIT' | 'INVALID_KEY' | 'PROVIDER_OUTAGE' | 'UNKNOWN',
    readonly httpStatus?: number,
    readonly providerBody?: string,
  ) {
    super(message);
    this.name = 'PhoneticsProviderError';
  }
}
