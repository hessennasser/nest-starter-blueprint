import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Thin wrapper over `@nestjs/throttler` so call sites read as intent
 * (`@RateLimit(5, 60)`) rather than config. `limit` requests per `ttlSeconds`.
 */
export const RateLimit = (limit: number, ttlSeconds: number) =>
  applyDecorators(Throttle({ default: { limit, ttl: ttlSeconds * 1000 } }));
