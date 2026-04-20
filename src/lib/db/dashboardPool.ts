import { Pool } from 'pg';

let pool: Pool | undefined;

/** Pool for the dashboard logical DB (`DASHBOARD_DATABASE_URL` in root `.env`). */
export function getDashboardPool(): Pool {
  if (pool) return pool;
  const url = process.env.DASHBOARD_DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DASHBOARD_DATABASE_URL is not configured');
  }
  pool = new Pool({
    connectionString: url,
    max: Number(process.env.DASHBOARD_POOL_MAX ?? 10),
  });
  return pool;
}

export async function closeDashboardPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
