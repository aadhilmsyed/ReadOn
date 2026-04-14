import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';
import { ImageGenerationController } from './controllers/imageGenerationController';
import { ImageGenerationProxy } from './services/ImageGenerationProxy';
import { RealImageGenerationService } from './services/RealImageGenerationService';
import { InMemoryImageCache } from './cache/InMemoryImageCache';
import { InMemoryImageMetadataRepository } from './repositories/InMemoryImageMetadataRepository';
import { PostgresImageMetadataRepository } from './repositories/PostgresImageMetadataRepository';
import { IImageMetadataRepository } from './repositories/IImageMetadataRepository';
import { RateLimiter } from './utils/rateLimiter';
import { Logger } from './utils/logger';

const logger = new Logger('Server');
validateConfig();

const repository = createRepository();

function createController(): ImageGenerationController {
  const cache = new InMemoryImageCache(config.cache.ttlSeconds);
  const rateLimiter = new RateLimiter(config.rateLimit);
  const realService = new RealImageGenerationService();

  const proxy = new ImageGenerationProxy(
    realService,
    cache,
    repository,
    rateLimiter
  );

  return new ImageGenerationController(proxy);
}

function createRepository(): IImageMetadataRepository {
  if (config.storage.driver === 'memory') {
    logger.warn('Using in-memory metadata repository');
    return new InMemoryImageMetadataRepository();
  }

  return new PostgresImageMetadataRepository(config.database);
}

const app = express();
const controller = createController();

app.use(cors());
app.use(express.json({ limit: config.security.jsonLimit }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'image-generation-service' });
});

// Readiness check
app.get('/ready', async (req: Request, res: Response) => {
  try {
    if ('checkConnection' in repository && typeof repository.checkConnection === 'function') {
      await repository.checkConnection();
    }

    res.json({
      status: 'ready',
      service: 'image-generation-service',
      storage: config.storage.driver,
    });
  } catch (error) {
    logger.error('Readiness check failed', error as Error);
    res.status(503).json({
      status: 'not_ready',
      service: 'image-generation-service',
      storage: config.storage.driver,
    });
  }
});

// Generate image endpoint
app.post('/images/generate', async (req: Request, res: Response) => {
  try {
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

app.listen(config.port, () => {
  logger.info(`Image Generation Service running on port ${config.port}`);
  logger.info(`Health check: http://localhost:${config.port}/health`);
  logger.info(`Readiness check: http://localhost:${config.port}/ready`);
  logger.info(`Generate: POST http://localhost:${config.port}/images/generate`);
  logger.info(`Status: GET http://localhost:${config.port}/images/:requestId`);
});
