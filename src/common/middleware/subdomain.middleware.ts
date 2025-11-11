import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SubdomainMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1️⃣ Try from header first
    let subdomain = req.headers['x-tenant-subdomain'] as string;

    // 2️⃣ Fallback: extract from host if header not provided
    if (!subdomain && req.headers.host) {
      const hostname = req.headers.host.split(':')[0];
      const parts = hostname.split('.');
      if (parts.length > 2) subdomain = parts[0];
    }

    if (subdomain) {
      (req as any).tenantSubdomain = subdomain.toLowerCase();
    }

    next();
  }
}
