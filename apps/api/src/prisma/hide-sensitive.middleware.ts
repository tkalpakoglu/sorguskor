// apps/api/src/prisma/hide-sensitive.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Response JSON içindeki hassas alanları temizler:
 * - passwordHash
 * - refreshHash
 */
@Injectable()
export class HideSensitiveMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json.bind(res);

    const strip = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map((item) => strip(item));
      }
      if (obj && typeof obj === 'object') {
        // belirtilen alanları kopar
        const { passwordHash, refreshHash, ...rest } = obj as Record<string, any>;
        // çocukları da temizle
        for (const key of Object.keys(rest)) {
          rest[key] = strip(rest[key]);
        }
        return rest;
      }
      return obj;
    };

    res.json = (body?: any): Response => {
      try {
        const cleaned = strip(body);
        return originalJson(cleaned);
      } catch {
        // bir şey olursa orijinal body ile devam et
        return originalJson(body);
      }
    };

    next();
  }
}
