// Four named pg pools — one per feature database on the shared readon-sql
// instance. Maps the canonical FeatureKey ('phonics' | 'comprehension' |
// 'visualization' | 'audiobook') to its actual database name (note:
// 'visualization' currently maps to the legacy `images` database).

const { Pool } = require('pg');

const FEATURE_DB_ENV = {
  phonics:       'PHONICS_DB',
  comprehension: 'COMPREHENSION_DB',
  visualization: 'VISUALIZATION_DB',
  audiobook:     'AUDIOBOOK_DB',
};

const FEATURE_KEYS = Object.keys(FEATURE_DB_ENV);

const featurePools = {};
let dashboardPoolInstance = null;

function buildPool(database) {
  const p = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  p.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'pg_pool_error', database, err: err.message }));
  });
  return p;
}

function poolFor(feature) {
  if (!FEATURE_DB_ENV[feature]) {
    const err = new Error(`unknown_feature:${feature}`);
    err.code = 'UNKNOWN_FEATURE';
    throw err;
  }
  if (!featurePools[feature]) {
    const dbName = process.env[FEATURE_DB_ENV[feature]];
    if (!dbName) throw new Error(`missing_env:${FEATURE_DB_ENV[feature]}`);
    featurePools[feature] = buildPool(dbName);
  }
  return featurePools[feature];
}

// The `dashboard` logical DB hosts cross-feature, user-scoped data such as
// credits — anything that does not belong to a single feature service.
function dashboardPool() {
  if (!dashboardPoolInstance) {
    const dbName = process.env.DASHBOARD_DB;
    if (!dbName) throw new Error('missing_env:DASHBOARD_DB');
    dashboardPoolInstance = buildPool(dbName);
  }
  return dashboardPoolInstance;
}

async function closeAllPools() {
  const all = [...Object.values(featurePools), dashboardPoolInstance].filter(Boolean);
  await Promise.allSettled(all.map((p) => p.end()));
}

module.exports = { poolFor, dashboardPool, closeAllPools, FEATURE_KEYS };
