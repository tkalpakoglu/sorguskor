import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<any>();
    const res = ctx.getResponse<any>();

    const status = exception.getStatus();
    const resp = exception.getResponse() as any;

    // class-validator array mesajı olabilir; değilse düz metin
    const message = Array.isArray(resp?.message)
      ? resp.message
      : (resp?.message ?? exception.message);

    res.status(status).json({
      statusCode: status,
      message,
      path: req?.url,
      requestId: req?.id || req?.headers?.['x-request-id'] || undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
