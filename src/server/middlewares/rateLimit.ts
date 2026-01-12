/**
 * Lightweight in-memory rate limiting per IP
 */

import { NextRequest } from 'next/server';
import { RateLimitError } from './errors';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxRequests: number = 100, windowMs: number = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry && entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  private getClientId(request: NextRequest): string {
    // Try to get IP from various headers (for proxies/load balancers)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }
    
    // Fallback to a default (in development)
    return 'default';
  }

  check(request: NextRequest): void {
    const clientId = this.getClientId(request);
    const now = Date.now();
    
    const entry = this.store.get(clientId);
    
    if (!entry || entry.resetAt < now) {
      // Create new window
      this.store.set(clientId, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return;
    }
    
    if (entry.count >= this.maxRequests) {
      throw new RateLimitError(
        `Rate limit exceeded. Maximum ${this.maxRequests} requests per ${this.windowMs / 1000} seconds.`
      );
    }
    
    entry.count++;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Default rate limiter: 100 requests per minute
export const defaultRateLimiter = new RateLimiter(100, 60 * 1000);

// More restrictive limiter for expensive operations (e.g., image generation)
export const strictRateLimiter = new RateLimiter(20, 60 * 1000);

