// apps/api/src/common/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const status = exception.getStatus();
    const payload = exception.getResponse() as any;

    // class-validator mesajları veya generic HttpException mesajı
    const message =
      (Array.isArray(payload?.message) ? payload.message : payload?.message) ??
      exception.message;

    res.status(status).json({
      statusCode: status,
      message,
    });
  }
}
