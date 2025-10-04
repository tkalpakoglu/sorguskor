import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();

    // pino-http varsa req.id olur; yoksa üret
    let requestId = req?.id || req?.headers?.['x-request-id'];
    if (!requestId) {
      requestId = randomUUID();
      (req as any).id = requestId;
    }

    // her yanıta geri yaz
    res.setHeader('x-request-id', requestId);

    return next.handle();
  }
}
