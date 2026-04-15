// dashboard-service entry point.
//
// Owns story-metadata CRUD across all four feature databases (phonics,
// comprehension, images, audiobook). Existing feature microservices are
// unaffected; their teams keep their own architectural patterns.
//
// Read path (dashboard) and write path (home button click) both go through
// this service. Composition happens one layer up, in the Next.js
// orchestrators/dashboard layer.

require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const { closeAllPools } = require('./db/pools');
const historyRouter = require('./routes/history');
const creditsRouter = require('./routes/credits');

const SERVICE_NAME = process.env.SERVICE_NAME || 'dashboard-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION || 'local-dev';
const PORT = Number(process.env.PORT || 4100);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  res.set('access-control-allow-origin', process.env.CORS_ORIGIN || '*');
  res.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.set('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: SERVICE_NAME, version: SERVICE_VERSION, now: new Date().toISOString() }),
);
app.get('/live', (_req, res) =>
  res.json({ status: 'ok', service: SERVICE_NAME, version: SERVICE_VERSION, now: new Date().toISOString() }),
);
app.get('/ready', (_req, res) =>
  res.json({ status: 'ready', service: SERVICE_NAME, version: SERVICE_VERSION, now: new Date().toISOString() }),
);
app.get('/meta', (_req, res) =>
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: process.env.NODE_ENV || 'development',
    features: ['phonics', 'comprehension', 'visualization', 'audiobook'],
  }),
);

app.use('/history', historyRouter);
app.use('/credits', creditsRouter);

app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

const server = app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    level: 'INFO',
    message: 'service_listening',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    host: HOST,
    port: PORT,
  }));
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'INFO', message: 'shutdown_start', signal }));
  server.close(async () => {
    await closeAllPools();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
