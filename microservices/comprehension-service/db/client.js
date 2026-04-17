const { Pool } = require('pg');

let pool;

function databaseUrl() {
  return process.env.DATABASE_URL || '';
}

function createMissingDatabaseUrlError() {
  const err = new Error('DATABASE_URL is required for Comprehension persistence.');
  err.code = 'DATABASE_URL_MISSING';
  return err;
}

function getPool() {
  if (!databaseUrl()) {
    throw createMissingDatabaseUrlError();
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
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
  if (!databaseUrl()) {
    return {
      ok: false,
      code: 'DATABASE_URL_MISSING',
      message: 'DATABASE_URL is not configured; Comprehension persistence endpoints will return persistence_error.',
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
  getPool,
  query,
  transaction,
  verifyDatabaseConnection,
};
