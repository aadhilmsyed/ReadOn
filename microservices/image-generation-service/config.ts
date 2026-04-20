export type StorageDriver = 'postgres' | 'memory';

export interface AppConfig {
  port: number;
  aiProvider: {
    apiKey: string;
    endpoint: string;
    timeoutMs: number;
  };
  cache: {
    ttlSeconds: number;
  };
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  storage: {
    driver: StorageDriver;
  };
  security: {
    jsonLimit: string;
  };
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a valid integer`);
  }

  return value;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;

  return raw.toLowerCase() === 'true';
}

function readStorageDriver(): StorageDriver {
  const raw = process.env.STORAGE_DRIVER || 'postgres';

  if (raw !== 'postgres' && raw !== 'memory') {
    throw new Error('STORAGE_DRIVER must be either "postgres" or "memory"');
  }

  return raw;
}

export const config: AppConfig = {
  port: readInt('PORT', 3003),
  aiProvider: {
    apiKey: process.env.AI_IMAGE_API_KEY || '',
    endpoint: process.env.AI_IMAGE_API_ENDPOINT || 'https://api.openai.com/v1/images/generations',
    timeoutMs: readInt('AI_TIMEOUT', 30000),
  },
  cache: {
    ttlSeconds: readInt('CACHE_TTL', 3600),
  },
  rateLimit: {
    maxRequests: readInt('RATE_LIMIT_MAX', 100),
    windowMs: readInt('RATE_LIMIT_WINDOW', 60000),
  },
  database: {
    host: process.env.DB_HOST || '',
    port: readInt('DB_PORT', 5432),
    name: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    ssl: readBool('DB_SSL', true),
  },
  storage: {
    driver: readStorageDriver(),
  },
  security: {
    jsonLimit: process.env.JSON_BODY_LIMIT || '1mb',
  },
};

/** Lists env vars required before image generation can succeed (used by `/health` and `/ready`). */
export function listMissingGenerationConfig(appConfig: AppConfig = config): string[] {
  const missing: string[] = [];

  if (!appConfig.aiProvider.apiKey) missing.push('AI_IMAGE_API_KEY');
  if (!appConfig.aiProvider.endpoint) missing.push('AI_IMAGE_API_ENDPOINT');

  if (appConfig.storage.driver === 'postgres') {
    if (!appConfig.database.host) missing.push('DB_HOST');
    if (!appConfig.database.name) missing.push('DB_NAME');
    if (!appConfig.database.user) missing.push('DB_USER');
    if (!appConfig.database.password) missing.push('DB_PASSWORD');
  }

  return missing;
}

export function validateConfig(appConfig: AppConfig = config): void {
  const missing = listMissingGenerationConfig(appConfig);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
