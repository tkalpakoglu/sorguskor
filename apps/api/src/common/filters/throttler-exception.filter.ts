// apps/api/src/common/filters/throttler-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception.getStatus?.() ?? 429;
    const retryAfter = res.getHeader('Retry-After');
    const limit = res.getHeader('X-RateLimit-Limit');
    const remaining = res.getHeader('X-RateLimit-Remaining');

    res.status(status).json({
      statusCode: status,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please retry later.',
      retryAfterSec: retryAfter !== undefined ? Number(retryAfter) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      remaining: remaining !== undefined ? Number(remaining) : undefined,
      path: req.originalUrl ?? req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
