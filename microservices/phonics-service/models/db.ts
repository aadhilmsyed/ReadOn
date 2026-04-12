import { Pool, type PoolConfig } from 'pg';

let pool: import('pg').Pool | null = null;

function buildPoolConfig(): PoolConfig {
  const url = process.env.PHONICS_DATABASE_URL?.trim();
  if (url) {
    return {
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      // Cloud SQL often uses TLS; proxy may still accept local socket without verify
      ssl: process.env.PHONICS_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  const host = process.env.PHONICS_DB_HOST;
  const database = process.env.PHONICS_DB_NAME ?? 'phonics';
  const user = process.env.PHONICS_DB_USER;
  const password = process.env.PHONICS_DB_PASSWORD;
  const port = parseInt(process.env.PHONICS_DB_PORT ?? '5432', 10);

  if (!host || !user || password === undefined) {
    throw new Error(
      'Phonics DB not configured: set PHONICS_DATABASE_URL or PHONICS_DB_HOST, PHONICS_DB_USER, PHONICS_DB_PASSWORD',
    );
  }

  return {
    host,
    port,
    database,
    user,
    password,
    max: 10,
    ssl: process.env.PHONICS_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

export function getPhonicsPool(): import('pg').Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }
  return pool;
}

export async function closePhonicsPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
