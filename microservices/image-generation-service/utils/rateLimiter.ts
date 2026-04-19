import { RateLimitError } from '../errors/ImageGenerationError';

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig = { maxRequests: 100, windowMs: 60000 }) {
    this.config = config;
  }

  async checkLimit(identifier: string = 'global'): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    this.requests = this.requests.filter(timestamp => timestamp > windowStart);

    if (this.requests.length >= this.config.maxRequests) {
      throw new RateLimitError(
        `Rate limit exceeded: ${this.config.maxRequests} requests per ${this.config.windowMs}ms`
      );
    }

    this.requests.push(now);
  }

  reset(): void {
    this.requests = [];
  }
}
