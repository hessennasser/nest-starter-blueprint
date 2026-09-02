import type { Request } from 'express';
import { extractRequestMeta } from './request-meta.helper';
import type { AuthenticatedUser } from 'src/modules/auth/strategies/jwt.strategy';

export interface RequestContext {
  requestId?: string;
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Bundle who/where/what-request for audit rows and structured logs. */
export function extractRequestContext(request: Request): RequestContext {
  const { ip, userAgent } = extractRequestMeta(request);
  const actor = request.user as AuthenticatedUser | undefined;
  const requestId =
    request.get('x-request-id') || request.get('x-correlation-id') || undefined;

  return { requestId, actorId: actor?.id, ipAddress: ip, userAgent };
}
