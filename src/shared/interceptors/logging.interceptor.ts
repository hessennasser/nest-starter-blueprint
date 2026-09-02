import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { redactSensitiveUrl } from 'src/shared/helpers/safe-url.helper';

type RecordBody = Record<string, unknown>;

const REDACTED = '***';
const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'confirmPassword',
  'currentPassword',
  'refreshToken',
  'accessToken',
  'token',
  'authorization',
  'secret',
  'apiKey',
  'api_key',
  'otp',
]);

const isRecordBody = (v: unknown): v is RecordBody =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (isRecordBody(value)) {
    const out: RecordBody = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k) ? REDACTED : sanitize(v);
    }
    return out;
  }
  return value;
};

/**
 * One `log` line per request in, one per response out (with status + duration),
 * `error` on failure. Request bodies for write methods are logged at `debug`
 * with sensitive keys stripped; the URL is run through `redactSensitiveUrl`.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method } = request;
    const url = redactSensitiveUrl(request.originalUrl || request.url);
    const ip =
      (request.headers['x-forwarded-for'] as string | undefined) ??
      request.socket.remoteAddress ??
      'unknown';

    this.logger.log(`--> ${method} ${url} (${ip})`);

    if (
      ['POST', 'PUT', 'PATCH'].includes(method) &&
      isRecordBody(request.body)
    ) {
      this.logger.debug(`    body: ${JSON.stringify(sanitize(request.body))}`);
    }

    const startedAt = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = context.switchToHttp().getResponse<Response>();
          this.logger.log(
            `<-- ${method} ${url} ${statusCode} ${Date.now() - startedAt}ms`,
          );
        },
        error: (error: unknown) => {
          const status =
            (error as { status?: number })?.status ?? 500;
          const message =
            (error as { message?: string })?.message ?? 'error';
          this.logger.error(
            `<-- ${method} ${url} ${status} ${Date.now() - startedAt}ms — ${message}`,
          );
        },
      }),
    );
  }
}
