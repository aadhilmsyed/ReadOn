import { Pool } from 'pg';

let pool: Pool | null | undefined;

/**
 * Returns a shared `pg` pool when Cloud SQL env vars are set, otherwise `null`.
 * Supports either `DATABASE_URL` or socket/TCP settings for Cloud SQL Postgres.
 */
export function getCloudSqlPool(): Pool | null {
  if (pool !== undefined) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.CLOUDSQL_POOL_MAX ?? 5),
    });
    return pool;
  }

  const user = process.env.CLOUDSQL_DB_USER?.trim();
  const database = process.env.CLOUDSQL_DB_NAME?.trim();
  const instance = process.env.CLOUDSQL_INSTANCE_CONNECTION_NAME?.trim();

  if (!user || !database) {
    pool = null;
    return pool;
  }

  const password = process.env.CLOUDSQL_DB_PASSWORD ?? '';
  const host = instance ? `/cloudsql/${instance}` : (process.env.CLOUDSQL_DB_HOST?.trim() ?? '127.0.0.1');
  const port = Number(process.env.CLOUDSQL_DB_PORT ?? 5432);
  const max = Number(process.env.CLOUDSQL_POOL_MAX ?? 5);

  pool = instance
    ? new Pool({ user, password, database, host, max })
    : new Pool({ user, password, database, host, port, max });

  return pool;
}
