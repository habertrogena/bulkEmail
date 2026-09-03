import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

const ALLOWED_ORIGINS =
  process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ??
  (process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3200', 'http://127.0.0.1:3200']
    : []);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const origin = req.headers?.origin;
    if (
      origin &&
      (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse = isHttpException ? exception.getResponse() : null;
    const message =
      typeof rawResponse === 'string'
        ? rawResponse
        : ((rawResponse as { message?: string | string[] })?.message ??
          (exception instanceof Error
            ? exception.message
            : 'Internal server error'));

    const safeMessage =
      status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : Array.isArray(message)
          ? message.join(', ')
          : message;

    if (status >= 500) {
      this.logger.error(
        { err: exception, status },
        exception instanceof Error ? exception.message : 'Unhandled error',
      );
    }

    res.status(status).json({
      statusCode: status,
      message: safeMessage,
    });
  }
}
