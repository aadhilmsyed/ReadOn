import dotenv from 'dotenv';
import express from 'express';

import { getStoryPhonicsController, postProcessPhonicsController } from './controllers/phonicsController';

dotenv.config();

const SERVICE_NAME = process.env.SERVICE_NAME || 'phonics-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION || 'local-dev';
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    now: new Date().toISOString(),
  });
});

app.get('/live', (_req, res) => {
  res.json({
    status: 'ok',
    path: '/live',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    now: new Date().toISOString(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({
    status: 'ready',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    now: new Date().toISOString(),
  });
});

app.get('/meta', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: process.env.NODE_ENV || 'development',
    now: new Date().toISOString(),
  });
});

/** Body matches Next `/api/phonics/process`: `{ storyText, storyId? }` after Next assigns storyId. */
app.post('/process', async (req, res) => {
  const result = await postProcessPhonicsController(req.body);
  res.status(result.status).json(result.body);
});

app.get('/story/:storyId', async (req, res) => {
  const result = await getStoryPhonicsController(req.params.storyId);
  res.status(result.status).json(result.body);
});

app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: 'INFO',
      message: 'service_listening',
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      host: HOST,
      port: PORT,
    }),
  );
});
