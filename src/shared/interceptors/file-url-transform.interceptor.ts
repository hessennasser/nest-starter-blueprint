import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type PlainRecord = Record<string, unknown>;

const isPlainRecord = (v: unknown): v is PlainRecord =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

const isString = (v: unknown): v is string => typeof v === 'string';

/**
 * Registered globally (APP_INTERCEPTOR). Walks every response body and rewrites
 * known file-path fields to absolute URLs, so entities/presenters can persist
 * and pass around a bare relative path (`uploads/x/y.jpg`) and clients still
 * get something they can fetch. Add field names to `FILE_FIELDS`.
 */
@Injectable()
export class FileUrlTransformInterceptor implements NestInterceptor {
  private readonly baseUrl =
    process.env.BACKEND_DOMAIN || 'http://localhost:3000';
  private readonly FILE_FIELDS = ['avatar', 'image', 'logo', 'relativePath'];

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data: unknown) => this.walk(data)));
  }

  private walk(data: unknown): unknown {
    if (!data) return data;
    if (Array.isArray(data)) return data.map((item) => this.walk(item));
    if (!isPlainRecord(data)) return data;

    const out: PlainRecord = { ...data };
    for (const field of this.FILE_FIELDS) {
      if (isString(out[field])) out[field] = this.toUrl(out[field]);
    }
    for (const [key, value] of Object.entries(out)) {
      if (Array.isArray(value) || isPlainRecord(value)) {
        out[key] = this.walk(value);
      }
    }
    return out;
  }

  private toUrl(pathValue: string): string {
    if (/^https?:\/\//.test(pathValue)) return pathValue;
    const normalized = pathValue.startsWith('uploads/')
      ? pathValue
      : `uploads/${pathValue.replace(/^\/+/, '')}`;
    return `${this.baseUrl}/${normalized}`;
  }
}
