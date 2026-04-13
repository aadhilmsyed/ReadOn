import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { ImageGenerationController } from './controllers/imageGenerationController';
import { ImageGenerationProxy } from './services/ImageGenerationProxy';
import { RealImageGenerationService } from './services/RealImageGenerationService';
import { InMemoryImageCache } from './cache/InMemoryImageCache';
import { PostgresImageMetadataRepository } from './repositories/PostgresImageMetadataRepository';
import { RateLimiter } from './utils/rateLimiter';
import { Logger } from './utils/logger';

const logger = new Logger('Server');

function createController(): ImageGenerationController {
  const cache = new InMemoryImageCache(3600);
  const repository = new PostgresImageMetadataRepository();
  const rateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
  const realService = new RealImageGenerationService();

  const proxy = new ImageGenerationProxy(
    realService,
    cache,
    repository,
    rateLimiter
  );

  return new ImageGenerationController(proxy);
}

const app = express();
const controller = createController();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'image-generation-service' });
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Image Generation Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Generate: POST http://localhost:${PORT}/images/generate`);
  logger.info(`Status: GET http://localhost:${PORT}/images/:requestId`);
});
