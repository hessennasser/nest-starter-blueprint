import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import { ErrorResponse } from 'src/types';
import { redactSensitiveUrl } from 'src/shared/helpers/safe-url.helper';
import {
  getRequestLanguage,
  translateErrorMessage,
  translateMessageValue,
} from 'src/shared/i18n/api-message-localizer';

/**
 * The single place an error becomes an HTTP response. Registered globally
 * (APP_FILTER). Produces the failure envelope:
 *   { success:false, message, error, statusCode, code?, errors? }
 *
 *  - `HttpException`      → its status + message (validation arrays preserved)
 *  - `QueryFailedError`   → 400, generic message; full error logged, never sent
 *  - anything else        → 500, generic message; full stack logged
 *
 * Client errors (<500) log at `warn`, server faults at `error`.
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const lang = getRequestLanguage(request);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = this.i18n.t('errors.internal', { lang });
    let error: string | string[] = message;
    let code: string | undefined;
    let validationErrors: unknown[] | undefined;

    if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      message = this.i18n.t('errors.bad_request', { lang });
      error = this.i18n.t('errors.validation', { lang });
      this.logger.error(`DB error: ${exception.message}`, exception.stack);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        if (Array.isArray(obj.errors)) validationErrors = obj.errors;
        if (typeof obj.code === 'string') code = obj.code;

        const resMessage = obj.message;
        if (
          Array.isArray(resMessage) &&
          resMessage.every((m) => typeof m === 'string')
        ) {
          message = resMessage;
          error = resMessage;
        } else if (typeof resMessage === 'string') {
          message = resMessage;
          error = resMessage;
        } else {
          message = exception.message;
          error = exception.message;
        }
      } else {
        message = exception.message;
        error = exception.message;
      }

      if (exception instanceof UnauthorizedException) {
        const current = Array.isArray(message) ? message.join(', ') : `${message}`;
        if (!current || current === 'Unauthorized') {
          message = this.i18n.t('errors.unauthorized', { lang });
          error = message;
        }
      }

      message = translateMessageValue(this.i18n, message, lang, translateErrorMessage);
      error = translateMessageValue(this.i18n, error, lang, translateErrorMessage);
    } else if (exception instanceof Error) {
      this.logger.error('Unexpected error', exception.stack);
    } else {
      this.logger.error('Unexpected non-error thrown', String(exception));
    }

    const body: ErrorResponse = {
      success: false,
      message,
      error,
      statusCode: status,
      ...(code ? { code } : {}),
      ...(validationErrors ? { errors: validationErrors } : {}),
    };

    const label = `${request.method} ${redactSensitiveUrl(request.url)}`;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        label,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${label} - ${status} - ${String(message)}`);
    }

    response.status(status).json(body);
  }
}
