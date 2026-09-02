/**
 * Redacts obvious secrets before a URL reaches a log line: any `token`,
 * `secret`, `api_key`, `access_token`, `signature` (or `*_token`) query
 * parameter value. Extend `SENSITIVE_QUERY_KEYS` or add a path rule if your
 * routes carry a secret in the path itself.
 */
const SENSITIVE_QUERY_KEYS = [
  'token',
  'secret',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'signature',
  'sig',
  'password',
];

export const redactSensitiveUrl = (url: string): string => {
  if (!url) return url;
  const [pathPart, queryPart] = url.split('?');
  if (!queryPart) return url;

  const redactedQuery = queryPart
    .split('&')
    .map((pair) => {
      const [key] = pair.split('=');
      const lowered = key.toLowerCase();
      const isSensitive =
        SENSITIVE_QUERY_KEYS.includes(lowered) || lowered.endsWith('_token');
      return isSensitive ? `${key}=[redacted]` : pair;
    })
    .join('&');

  return `${pathPart}?${redactedQuery}`;
};
