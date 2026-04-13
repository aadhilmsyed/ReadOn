import { ImageGenerationController, HttpRequest } from '../controllers/imageGenerationController';
import { ImageGenerationProxy } from '../services/ImageGenerationProxy';
import { RealImageGenerationService } from '../services/RealImageGenerationService';
import { InMemoryImageCache } from '../cache/InMemoryImageCache';
import { PostgresImageMetadataRepository } from '../repositories/PostgresImageMetadataRepository';
import { RateLimiter } from '../utils/rateLimiter';

function createImageGenerationController(): ImageGenerationController {
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

const controller = createImageGenerationController();

export async function imageGenerationRoutes(
  method: 'POST' | 'GET',
  path: string,
  body?: unknown,
  params?: Record<string, string>
) {
  const request: HttpRequest = {
    body: body || {},
    params: params || {},
  };

  if (method === 'POST' && path === '/images/generate') {
    return controller.handleGenerateImage(request);
  }

  if (method === 'GET' && path.startsWith('/images/')) {
    const requestId = path.split('/images/')[1];
    request.params = { requestId };
    return controller.handleGetStatus(request);
  }

  return {
    status: 404,
    body: {
      success: false,
      requestId: '',
      status: 'FAILED',
      cached: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${method} ${path} not found`,
      },
    },
  };
}

export { ImageGenerationController };
