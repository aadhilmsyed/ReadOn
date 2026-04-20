import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { config, listMissingGenerationConfig, validateConfig } from './config';
import { ImageGenerationController } from './controllers/imageGenerationController';
import { ImageGenerationProxy } from './services/ImageGenerationProxy';
import { RealImageGenerationService } from './services/RealImageGenerationService';
import { InMemoryImageCache } from './cache/InMemoryImageCache';
import { InMemoryImageMetadataRepository } from './repositories/InMemoryImageMetadataRepository';
import { PostgresImageMetadataRepository } from './repositories/PostgresImageMetadataRepository';
import { IImageMetadataRepository } from './repositories/IImageMetadataRepository';
import { RateLimiter } from './utils/rateLimiter';
import { Logger } from './utils/logger';
import { generateStorybookFromStory } from './services/storybookFromStoryService';

const logger = new Logger('Server');

const repository = createRepository();

function createController(): { controller: ImageGenerationController; proxy: ImageGenerationProxy } {
  const cache = new InMemoryImageCache(config.cache.ttlSeconds);
  const rateLimiter = new RateLimiter(config.rateLimit);
  const realService = new RealImageGenerationService();

  const proxy = new ImageGenerationProxy(
    realService,
    cache,
    repository,
    rateLimiter
  );

  return { controller: new ImageGenerationController(proxy), proxy };
}

function createRepository(): IImageMetadataRepository {
  if (config.storage.driver === 'memory') {
    logger.warn('Using in-memory metadata repository');
    return new InMemoryImageMetadataRepository();
  }

  return new PostgresImageMetadataRepository(config.database);
}

const app = express();
const { controller, proxy } = createController();

app.use(cors());
app.use(express.json({ limit: config.security.jsonLimit }));

const HOST = process.env.HOST || '0.0.0.0';

app.get('/health', (_req: Request, res: Response) => {
  const missing = listMissingGenerationConfig();
  res.json({
    status: 'ok',
    service: 'image-generation-service',
    generationReady: missing.length === 0,
    missingEnv: missing.length ? missing : undefined,
  });
});

app.get('/live', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    path: '/live',
    service: 'image-generation-service',
    now: new Date().toISOString(),
  });
});

app.get('/meta', (_req: Request, res: Response) => {
  res.json({
    service: 'image-generation-service',
    environment: process.env.NODE_ENV || 'development',
    storage: config.storage.driver,
    now: new Date().toISOString(),
  });
});

app.get('/ready', async (_req: Request, res: Response) => {
  const missing = listMissingGenerationConfig();
  if (missing.length > 0) {
    return res.status(503).json({
      status: 'not_ready',
      service: 'image-generation-service',
      missingEnv: missing,
    });
  }
  try {
    if ('checkConnection' in repository && typeof repository.checkConnection === 'function') {
      await repository.checkConnection();
    }

    return res.json({
      status: 'ready',
      service: 'image-generation-service',
      storage: config.storage.driver,
    });
  } catch (error) {
    logger.error('Readiness check failed', error as Error);
    return res.status(503).json({
      status: 'not_ready',
      service: 'image-generation-service',
      storage: config.storage.driver,
    });
  }
});

app.get('/images/story/:storyId', async (req: Request, res: Response) => {
  try {
    const storyId = typeof req.params.storyId === 'string' ? req.params.storyId.trim() : '';
    if (!storyId) {
      return res.status(400).json({ success: false, error: { message: 'storyId is required' } });
    }
    const rows = await repository.findByStoryId(storyId);
    const scenes = rows.map((row) => ({
      generationId: row.id,
      storyId: row.storyId,
      imageUrls: row.imageUrls || [],
      prompt: row.prompt,
      status: row.status,
      cached: row.cached,
    }));
    return res.json({ success: true, storyId, scenes });
  } catch (error) {
    logger.error('Error in /images/story/:storyId', error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

app.post('/images/storybook', async (req: Request, res: Response) => {
  try {
    try {
      validateConfig();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'configuration_error';
      return res.status(503).json({
        success: false,
        error: { code: 'SERVICE_MISCONFIGURED', message: msg },
      });
    }
    const body = req.body as { storyId?: unknown; storyText?: unknown; userId?: unknown };
    const storyId = typeof body.storyId === 'string' ? body.storyId.trim() : '';
    const storyText = typeof body.storyText === 'string' ? body.storyText : '';
    const userId = typeof body.userId === 'string' ? body.userId.trim() : undefined;
    if (!storyId || !storyText.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'storyId and storyText are required' },
      });
    }
    const result = await generateStorybookFromStory(proxy, { storyId, storyText, userId });
    return res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    logger.error('Error in /images/storybook', error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

app.post('/images/generate', async (req: Request, res: Response) => {
  try {
    try {
      validateConfig();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'configuration_error';
      return res.status(503).json({
        success: false,
        error: { code: 'SERVICE_MISCONFIGURED', message: msg },
      });
    }
    const result = await controller.handleGenerateImage({
      body: req.body,
      params: {},
    });
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error('Error in /images/generate', error as Error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// Get generation status endpoint
app.get('/images/:requestId', async (req: Request, res: Response) => {
  try {
    const result = await controller.handleGetStatus({
      body: {},
      params: { requestId: req.params.requestId },
    });
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error('Error in /images/:requestId', error as Error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

app.listen(config.port, HOST, () => {
  logger.info(`Image Generation Service listening on ${HOST}:${config.port}`);
  logger.info(`Health: http://127.0.0.1:${config.port}/health`);
  logger.info(`Generate: POST http://127.0.0.1:${config.port}/images/generate`);
});
