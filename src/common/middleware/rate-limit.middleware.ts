import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly requests = new Map<string, RateLimitInfo>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;
  private readonly maxRequestsPerMinute: number;

  constructor() {
    /**
     * Rate Limiting Configuration (via environment variables):
     * 
     * RATE_LIMIT_MAX_REQUESTS - Maximum requests allowed per time window (default: 100)
     * RATE_LIMIT_WINDOW_MS - Time window in milliseconds (default: 60000 = 1 minute)
     * RATE_LIMIT_BLOCK_DURATION_MS - How long to block IP after exceeding limit (default: 300000 = 5 minutes)
     * RATE_LIMIT_MAX_PER_MINUTE - Stricter per-minute limit for additional protection (default: 60)
     * 
     * Example .env configuration:
     * RATE_LIMIT_MAX_REQUESTS=100
     * RATE_LIMIT_WINDOW_MS=60000
     * RATE_LIMIT_BLOCK_DURATION_MS=300000
     * RATE_LIMIT_MAX_PER_MINUTE=60
     */
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
    this.blockDurationMs = parseInt(process.env.RATE_LIMIT_BLOCK_DURATION_MS || '300000', 10);
    this.maxRequestsPerMinute = parseInt(process.env.RATE_LIMIT_MAX_PER_MINUTE || '60', 10);

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    
    if (!ip) {
      return next();
    }

    const now = Date.now();
    const info = this.requests.get(ip);

    // Check if IP is blocked
    if (info?.blockedUntil && now < info.blockedUntil) {
      const remainingSeconds = Math.ceil((info.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', remainingSeconds);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests. IP blocked for ${remainingSeconds} seconds.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Reset if window expired
    if (!info || now >= info.resetTime) {
      this.requests.set(ip, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      this.setRateLimitHeaders(res, 1, this.maxRequests, this.windowMs);
      return next();
    }

    // Increment request count
    info.count++;

    // Check if exceeded limit
    if (info.count > this.maxRequests) {
      // Block the IP
      info.blockedUntil = now + this.blockDurationMs;
      const remainingSeconds = Math.ceil(this.blockDurationMs / 1000);
      res.setHeader('Retry-After', remainingSeconds);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Too many requests from this IP. Blocked for ${remainingSeconds} seconds.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check stricter per-minute limit for additional protection
    if (info.count > this.maxRequestsPerMinute && this.windowMs >= 60000) {
      info.blockedUntil = now + this.blockDurationMs;
      const remainingSeconds = Math.ceil(this.blockDurationMs / 1000);
      res.setHeader('Retry-After', remainingSeconds);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Too many requests per minute. Blocked for ${remainingSeconds} seconds.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.setRateLimitHeaders(res, info.count, this.maxRequests, Math.ceil((info.resetTime - now) / 1000));
    next();
  }

  private getClientIp(req: Request): string | null {
    // Check various headers for real IP (useful behind proxies/load balancers)
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      const ips = forwarded.split(',').map((ip) => ip.trim());
      return ips[0] || null;
    }

    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    return req.ip || req.socket.remoteAddress || null;
  }

  private setRateLimitHeaders(
    res: Response,
    remaining: number,
    limit: number,
    resetInSeconds: number,
  ): void {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - remaining).toString());
    res.setHeader('X-RateLimit-Reset', resetInSeconds.toString());
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, info] of this.requests.entries()) {
      // Remove entries that are expired and not blocked
      if (now >= info.resetTime && (!info.blockedUntil || now >= info.blockedUntil)) {
        this.requests.delete(ip);
      }
    }
  }

  // Method to manually clear rate limit for an IP (useful for admin operations)
  clearRateLimit(ip: string): void {
    this.requests.delete(ip);
  }

  // Method to get current rate limit status for an IP
  getRateLimitStatus(ip: string): RateLimitInfo | null {
    return this.requests.get(ip) || null;
  }
}

