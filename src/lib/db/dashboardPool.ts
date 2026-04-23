import { Pool } from 'pg';

let pool: Pool | undefined;

/** Pool for the dashboard logical DB (`DASHBOARD_DATABASE_URL` in root `.env`). */
export function getDashboardPool(): Pool {
  if (pool) return pool;
  const url = process.env.DASHBOARD_DATABASE_URL?.trim();
  if (url) {
    pool = new Pool({
      connectionString: url,
      max: Number(process.env.DASHBOARD_POOL_MAX ?? 10),
    });
    return pool;
  }

  const user = process.env.CLOUDSQL_DB_USER?.trim();
  const password = process.env.CLOUDSQL_DB_PASSWORD ?? '';
  const database = process.env.CLOUDSQL_DB_NAME?.trim() || 'dashboard';
  const instance = process.env.CLOUDSQL_INSTANCE_CONNECTION_NAME?.trim();
  const host = instance
    ? `/cloudsql/${instance}`
    : (process.env.CLOUDSQL_DB_HOST?.trim() || '127.0.0.1');
  const port = Number(process.env.CLOUDSQL_DB_PORT ?? 5432);

  if (!user) {
    throw new Error(
      'DASHBOARD_DATABASE_URL is not configured and fallback Cloud SQL vars are missing CLOUDSQL_DB_USER.',
    );
  }

  pool = instance
    ? new Pool({ user, password, database, host, max: Number(process.env.DASHBOARD_POOL_MAX ?? 10) })
    : new Pool({ user, password, database, host, port, max: Number(process.env.DASHBOARD_POOL_MAX ?? 10) });

  return pool;
}

export async function closeDashboardPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
