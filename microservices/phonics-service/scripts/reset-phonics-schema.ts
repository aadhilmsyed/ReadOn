/**
 * Destructive: DROP phonics tables and recreate current schema. Clears all phonics data.
 * Loads .env from repo root (same as bootstrap).
 *
 * Usage: npm run phonics:db:reset
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

import { pathToInitMigrationSql, pathToResetMigrationSql } from '../utils/phonicsPaths';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(scriptDir, '..');
const repoRoot = process.cwd();
loadEnv({ path: resolve(serviceRoot, '.env') });
loadEnv({ path: resolve(repoRoot, '.env') });
loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });

function buildPool(): Pool {
  const url = process.env.PHONICS_DATABASE_URL?.trim();
  if (url) {
    return new Pool({
      connectionString: url,
      ssl: process.env.PHONICS_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }
  const host = process.env.PHONICS_DB_HOST;
  const database = process.env.PHONICS_DB_NAME ?? 'phonics';
  const user = process.env.PHONICS_DB_USER;
  const password = process.env.PHONICS_DB_PASSWORD;
  const port = parseInt(process.env.PHONICS_DB_PORT ?? '5432', 10);
  if (!host || !user || password === undefined) {
    throw new Error('Set PHONICS_DATABASE_URL or PHONICS_DB_HOST/USER/PASSWORD');
  }
  return new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: process.env.PHONICS_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
}

async function main(): Promise<void> {
  const pool = buildPool();
  const safeCount = async (table: string): Promise<string> => {
    try {
      const r = await pool.query(`SELECT COUNT(*)::bigint AS n FROM ${table}`);
      return String(r.rows[0]?.n ?? '0');
    } catch {
      return '0';
    }
  };
  try {
    const storyLinksBefore = await safeCount('"Story_Phonics_Words"');
    const wordsBefore = await safeCount('"Phonics_Words"');
    // eslint-disable-next-line no-console
    console.error(
      `[phonics reset] Row counts before: Story_Phonics_Words=${storyLinksBefore}, Phonics_Words=${wordsBefore}`,
    );

    const resetSql = readFileSync(pathToResetMigrationSql(), 'utf-8');
    const initSql = readFileSync(pathToInitMigrationSql(), 'utf-8');
    await pool.query(resetSql);
    await pool.query(initSql);
    // eslint-disable-next-line no-console
    console.error('[phonics reset] Dropped and recreated Phonics_Words + Story_Phonics_Words.');
    // eslint-disable-next-line no-console
    console.log('Phonics schema reset complete.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
