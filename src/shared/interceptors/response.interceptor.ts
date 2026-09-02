import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from 'src/types';
import { ResponseHelper } from 'src/shared/helpers/response.helper';
import {
  getRequestLanguage,
  translateResponseMessage,
} from 'src/shared/i18n/api-message-localizer';

type ResponseEnvelope<T> = ApiResponse<T> & { success: true };

const isEnvelope = <T>(value: unknown): value is ResponseEnvelope<T> =>
  typeof value === 'object' &&
  value !== null &&
  'success' in value &&
  (value as { success?: unknown }).success === true;

/**
 * Guarantees every success response is the standard envelope and localizes its
 * `message`. A handler that already returned a `ResponseHelper.*` result is
 * passed through (message still localized); a bare value gets wrapped.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly i18n?: I18nService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const lang = getRequestLanguage(request);

    return next.handle().pipe(
      map((data: unknown) => {
        const envelope = isEnvelope<T>(data)
          ? data
          : ResponseHelper.success(data as T);
        return {
          ...envelope,
          message: this.i18n
            ? translateResponseMessage(this.i18n, envelope.message, lang)
            : envelope.message,
        };
      }),
    );
  }
}
