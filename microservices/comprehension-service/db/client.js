const { Pool } = require('pg');

let pool;

function readEnv(name) {
  const value = process.env[name] || '';
  return value === 'REPLACE_ME' ? '' : value;
}

function readNumberEnv(name, defaultValue) {
  const value = Number(readEnv(name));
  return Number.isFinite(value) ? value : defaultValue;
}

function databaseConfig() {
  const cloudSqlConnectionName = readEnv('CLOUDSQL_CONNECTION_NAME');
  const host = readEnv('READON_DATABASE_HOST') || process.env.PGHOST || (
    cloudSqlConnectionName ? `/cloudsql/${cloudSqlConnectionName}` : ''
  );
  const database = readEnv('READON_DATABASE_NAME');

  if (database) {
    return {
      database,
      host: host || undefined,
      port: readNumberEnv('READON_DATABASE_PORT', Number(process.env.PGPORT || 5432)),
      user: readEnv('READON_DATABASE_USER') || process.env.PGUSER || undefined,
      password: readEnv('READON_DATABASE_PASSWORD') || process.env.PGPASSWORD || undefined,
    };
  }

  const connectionString = readEnv('DATABASE_URL');

  return connectionString ? { connectionString } : null;
}

function createMissingDatabaseConfigError() {
  const err = new Error('READON_DATABASE_NAME or DATABASE_URL is required for Comprehension persistence.');
  err.code = 'DATABASE_CONFIG_MISSING';
  return err;
}

function getPool() {
  const config = databaseConfig();

  if (!config) {
    throw createMissingDatabaseConfigError();
  }

  if (!pool) {
    pool = new Pool({
      ...config,
      max: Number(process.env.READON_DATABASE_POOL_SIZE || 5),
      connectionTimeoutMillis: Number(process.env.READON_DATABASE_CONNECT_TIMEOUT_MS || 10000),
    });
  }

  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function transaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function verifyDatabaseConnection() {
  if (!databaseConfig()) {
    return {
      ok: false,
      code: 'DATABASE_CONFIG_MISSING',
      message: 'READON_DATABASE_NAME or DATABASE_URL is not configured; Comprehension persistence endpoints will return persistence_error.',
    };
  }

  try {
    const result = await query('SELECT current_database() AS database_name, current_user AS database_user');
    return {
      ok: true,
      databaseName: result.rows[0].database_name,
      databaseUser: result.rows[0].database_user,
    };
  } catch (err) {
    return {
      ok: false,
      code: err.code || 'DATABASE_CONNECTION_FAILED',
      message: err.message,
    };
  }
}

module.exports = {
  databaseConfig,
  getPool,
  query,
  transaction,
  verifyDatabaseConnection,
};
