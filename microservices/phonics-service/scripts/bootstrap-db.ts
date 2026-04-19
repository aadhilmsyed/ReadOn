/**
 * Applies phonics DDL to the configured database (idempotent).
 * Run from repo root: `npm run phonics:db:bootstrap`
 *
 * Requires PHONICS_DATABASE_URL or PHONICS_DB_* variables in the environment.
 * Unlike Next.js, plain `tsx` does not load `.env` — we load repo-root env files here.
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Pool } from 'pg';

const repoRoot = process.cwd();
loadEnv({ path: resolve(repoRoot, '.env') });
loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });

const debug =
  process.env.PHONICS_BOOTSTRAP_DEBUG === '1' || process.env.PHONICS_BOOTSTRAP_DEBUG === 'true';

/** Logs host / db / user only — never the password. */
function logSafeUrlDiagnostics(connectionString: string): void {
  try {
    const normalized = connectionString.trim().replace(/^postgresql:/i, 'postgres:');
    const u = new URL(normalized);
    const db = u.pathname.replace(/^\//, '') || '(default)';
    // eslint-disable-next-line no-console
    console.error(
      '[phonics bootstrap] Parsed PHONICS_DATABASE_URL →',
      `host=${u.hostname}`,
      `port=${u.port || '5432'}`,
      `database=${db}`,
      `user=${decodeURIComponent(u.username || '(none)')}`,
      `passwordChars=${u.password ? u.password.length : 0}`,
    );
  } catch {
    // eslint-disable-next-line no-console
    console.error(
      '[phonics bootstrap] Could not parse PHONICS_DATABASE_URL as a URL. Special characters in the password must be percent-encoded (e.g. @ → %40, # → %23).',
    );
  }
}

function loadSql(): string {
  const p = join(process.cwd(), 'microservices/phonics-service/db/migrations/001_init_phonics.sql');
  return readFileSync(p, 'utf-8');
}

function buildPool(): Pool {
  const url = process.env.PHONICS_DATABASE_URL?.trim();
  if (url) {
    if (debug) {
      logSafeUrlDiagnostics(url);
    }
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
  try {
    const sql = loadSql();
    await pool.query(sql);
    // eslint-disable-next-line no-console
    console.log('Phonics schema applied successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  const errObj = typeof e === 'object' && e ? (e as { code?: string; errno?: number }) : {};
  const code = errObj.code ? String(errObj.code) : '';
  if (code === 'ECONNREFUSED' || errObj.errno === -61) {
    // eslint-disable-next-line no-console
    console.error(
      '\n[phonics bootstrap] Nothing is accepting TCP connections on your DB host/port (connection refused).\n' +
        '  • If PHONICS_DATABASE_URL uses 127.0.0.1, start the Cloud SQL Auth Proxy for the **readon** instance first, e.g.:\n' +
        '      cloud-sql-proxy readon-492106:us-central1:readon-sql --port 5432\n' +
        '    (Use another --port if 5432 is busy; then set PHONICS_DATABASE_URL to that port.)\n' +
        '  • Only one proxy should listen on a given port — a second database’s proxy on the same port will break connections.\n',
    );
  }
  if (code === '28P01') {
    // eslint-disable-next-line no-console
    console.error(
      '\n[phonics bootstrap] Password authentication failed. Common fixes:\n' +
        '  • Confirm the password is the Cloud SQL / Postgres user password (reset in GCP Console → SQL → Users if unsure).\n' +
        '  • If the password contains @ # : / % or spaces, either percent-encode it in PHONICS_DATABASE_URL\n' +
        '    or avoid the URL form: set PHONICS_DB_HOST, PHONICS_DB_PORT, PHONICS_DB_NAME, PHONICS_DB_USER, PHONICS_DB_PASSWORD instead.\n' +
        '  • Check .env.local does not override PHONICS_DATABASE_URL with an empty or old value.\n' +
        '  • Run with PHONICS_BOOTSTRAP_DEBUG=1 to print host/db/user (not the password).\n',
    );
  }
  process.exit(1);
});
