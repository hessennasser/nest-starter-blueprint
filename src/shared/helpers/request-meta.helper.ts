import type { Request } from 'express';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export function extractRequestMeta(request: Request): RequestMeta {
  const userAgent = request.get('user-agent') || undefined;
  // Express resolves the real IP from X-Forwarded-For once `trust proxy` is set.
  const ip = request.ip || undefined;
  return { ip, userAgent };
}
