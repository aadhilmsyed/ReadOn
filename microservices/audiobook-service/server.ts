import dotenv from 'dotenv';
import express from 'express';

import { handleAudiobookRequest } from './controllers/audiobookController';
import { consumeRecentNarrationCacheStatus } from './services/audiobookService';

dotenv.config();

const SERVICE_NAME = process.env.SERVICE_NAME || 'audiobook-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION || 'local-dev';
const PORT = Number(process.env.PORT || 3004);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.use(express.json({ limit: '512kb' }));

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

/** Same contract as Next.js `POST /api/audiobook/tts`: JSON body `{ text, storyId? }` → audio/mpeg. */
app.post('/tts', async (req, res) => {
  try {
    const result = await handleAudiobookRequest(req.body);
    const cacheStatus = consumeRecentNarrationCacheStatus(result.sourceText);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('TTS-Cache', cacheStatus);
    res.status(200).send(result.audioBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Read-aloud failed.';
    const status =
      message.includes('required') || message.includes('too long') || message.includes('max ')
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
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
