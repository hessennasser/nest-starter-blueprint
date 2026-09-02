import type { Request } from 'express';
import type { I18nService } from 'nestjs-i18n';
import {
  resolveLanguage,
  type SupportedLanguage,
} from 'src/shared/helpers/language.helper';

/**
 * Bridges English literals in code to i18n keys at the edge, so services can
 * `throw new NotFoundException('User not found')` and clients still get a
 * localized string. Three ways a message is resolved, in order:
 *
 *   1. it already looks like a key (`errors.not_found`) → translate directly
 *   2. it's in an exact-match table below → translate that key
 *   3. it matches a regex rule → translate with captured args
 *   4. none match → return the literal unchanged
 *
 * The real app's table has hundreds of entries; keep yours close to where the
 * literals are thrown and let this file grow with the codebase.
 */

type TranslateArgs = Record<string, string | number | boolean | null>;

type PatternRule = {
  pattern: RegExp;
  key: string;
  args: (match: RegExpMatchArray) => TranslateArgs;
};

const RESPONSE_MESSAGE_KEYS: Record<string, string> = {
  'Operation completed successfully': 'responses.operation_completed',
  'Data retrieved successfully': 'responses.data_retrieved',
  'Resource created successfully': 'responses.resource_created',
  'Resource updated successfully': 'responses.resource_updated',
  'Resource deleted successfully': 'responses.resource_deleted',
  'Authentication successful': 'responses.authentication_successful',
};

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  Unauthorized: 'errors.unauthorized',
  Forbidden: 'errors.forbidden',
  'Not Found': 'errors.not_found',
  'Bad Request': 'errors.bad_request',
  'Too Many Requests': 'errors.too_many_requests',
  'Internal server error': 'errors.internal',
  'Missing required permissions': 'errors.missing_required_permissions',
  'Insufficient scope': 'errors.insufficient_scope',
  'Invalid credentials': 'errors.invalid_credentials',
  'Invalid refresh token': 'errors.invalid_refresh_token',
  'User not found': 'errors.user_not_found',
  'Email already in use': 'errors.email_already_in_use',
  'Role not found': 'errors.role_not_found',
  'Article not found': 'errors.article_not_found',
};

const ERROR_PATTERNS: PatternRule[] = [
  {
    pattern: /^(.+) must be an email$/,
    key: 'errors.validation_email',
    args: (m) => ({ field: m[1] }),
  },
  {
    pattern: /^(.+) should not be empty$/,
    key: 'errors.validation_not_empty',
    args: (m) => ({ field: m[1] }),
  },
  {
    pattern: /^(.+) must be a string$/,
    key: 'errors.validation_string',
    args: (m) => ({ field: m[1] }),
  },
];

export function getRequestLanguage(request?: Request): SupportedLanguage {
  const withI18n = request as (Request & { i18nLang?: string }) | undefined;
  return resolveLanguage(
    withI18n?.i18nLang ?? request?.headers?.['accept-language'],
  ) as SupportedLanguage;
}

function translate(
  i18n: I18nService,
  message: string,
  lang: string,
  opts: { exact?: Record<string, string>; patterns?: PatternRule[] } = {},
): string {
  const looksLikeKey = /^[a-z]+(?:\.[a-z0-9_]+)+$/.test(message);
  const key = opts.exact?.[message] ?? (looksLikeKey ? message : undefined);

  if (key) return i18n.t(key, { lang, defaultValue: message });

  for (const rule of opts.patterns ?? []) {
    const match = message.match(rule.pattern);
    if (match) {
      return i18n.t(rule.key, {
        lang,
        args: rule.args(match),
        defaultValue: message,
      });
    }
  }
  return message;
}

export function translateResponseMessage(
  i18n: I18nService,
  message: string,
  lang: string,
): string {
  return translate(i18n, message, lang, { exact: RESPONSE_MESSAGE_KEYS });
}

export function translateErrorMessage(
  i18n: I18nService,
  message: string,
  lang: string,
): string {
  return translate(i18n, message, lang, {
    exact: ERROR_MESSAGE_KEYS,
    patterns: ERROR_PATTERNS,
  });
}

export function translateMessageValue(
  i18n: I18nService,
  value: string | string[],
  lang: string,
  translator: (i18n: I18nService, message: string, lang: string) => string,
): string | string[] {
  return Array.isArray(value)
    ? value.map((m) => translator(i18n, m, lang))
    : translator(i18n, value, lang);
}
