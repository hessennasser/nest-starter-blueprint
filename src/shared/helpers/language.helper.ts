import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Localized-content toolkit. Entities store user-facing text as a JSONB map
 * `{ en: '...', ar: '...' }`; DTOs accept either a plain string or that map;
 * presenters call `localizeString(value, lang)` to collapse it for a response.
 *
 * Add a language by extending `SUPPORTED_LANGS`.
 */
export const SUPPORTED_LANGS = ['en', 'ar'] as const;
export const DEFAULT_LANG = 'en';

export type SupportedLanguage = (typeof SUPPORTED_LANGS)[number];
export type LocalizedString = Record<SupportedLanguage, string>;
export type LocalizedStringInput =
  | string
  | Partial<Record<SupportedLanguage, string>>;

type NormalizeLocalizedOptions = {
  required?: boolean;
  nullable?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGS.includes(value as SupportedLanguage);
}

function isLocalizedStringMap(
  value: Record<string, unknown>,
): value is Partial<Record<SupportedLanguage, string>> {
  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((k) => isSupportedLanguage(k)) &&
    keys.every((k) => typeof value[k] === 'string')
  );
}

export function isLocalizedStringInput(
  value: unknown,
  options: NormalizeLocalizedOptions = {},
): value is LocalizedStringInput {
  if (value === null || value === undefined) return options.nullable === true;
  if (typeof value === 'string') {
    return !options.required || value.trim().length > 0;
  }
  if (!isRecord(value) || !isLocalizedStringMap(value)) return false;
  if (!options.required) return true;
  return SUPPORTED_LANGS.some((lang) => value[lang]?.trim().length);
}

/** Parse a JSON-encoded localized map (multipart sends it as a string). */
function parseLocalizedMap(
  value: string,
): Partial<Record<SupportedLanguage, string>> | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isRecord(parsed) && isLocalizedStringMap(parsed)) return parsed;
  } catch {
    // not JSON — treat as a plain string
  }
  return null;
}

function resolveNested(value: unknown, lang: SupportedLanguage): string {
  if (typeof value !== 'string') return '';
  const parsed = parseLocalizedMap(value);
  if (!parsed) return value.trim();
  return resolveNested(
    parsed[lang] ?? parsed[DEFAULT_LANG] ?? Object.values(parsed)[0] ?? '',
    lang,
  );
}

/** Any accepted input → a fully-populated `{ en, ar }` map (missing langs fall back). */
export function normalizeLocalizedString(
  value: LocalizedStringInput,
): LocalizedString {
  if (typeof value === 'string') {
    const parsed = parseLocalizedMap(value);
    if (parsed) {
      value = parsed;
    } else {
      const trimmed = value.trim();
      return SUPPORTED_LANGS.reduce((acc, lang) => {
        acc[lang] = trimmed;
        return acc;
      }, {} as LocalizedString);
    }
  }

  const normalized = SUPPORTED_LANGS.reduce((acc, lang) => {
    acc[lang] = resolveNested(value[lang], lang);
    return acc;
  }, {} as LocalizedString);

  const fallback =
    normalized[DEFAULT_LANG] ||
    SUPPORTED_LANGS.map((lang) => normalized[lang]).find(Boolean) ||
    '';
  for (const lang of SUPPORTED_LANGS) {
    if (!normalized[lang]) normalized[lang] = fallback;
  }
  return normalized;
}

export function normalizeOptionalLocalizedString(
  value: LocalizedStringInput | null | undefined,
): LocalizedString | null {
  if (value === null || value === undefined) return null;
  const normalized = normalizeLocalizedString(value);
  return SUPPORTED_LANGS.some((lang) => normalized[lang]) ? normalized : null;
}

/** Resolve a best-matching language code from an `Accept-Language` header. */
export function resolveLanguage(acceptLanguage?: string | string[]): string {
  if (Array.isArray(acceptLanguage)) acceptLanguage = acceptLanguage.join(',');
  if (!acceptLanguage) return DEFAULT_LANG;

  const candidates = acceptLanguage
    .split(',')
    .map((entry) => entry.trim().split(';')[0].trim().toLowerCase().slice(0, 2));

  for (const candidate of candidates) {
    if (isSupportedLanguage(candidate)) return candidate;
  }
  return DEFAULT_LANG;
}

/** Pick one string from a localized map with an `en` fallback chain. */
export function pickLocalized(
  map: Record<string, string> | string | null | undefined,
  lang: string,
): string | null {
  if (map == null) return null;
  if (typeof map === 'string') {
    const parsed = parseLocalizedMap(map);
    if (!parsed) return map;
    map = parsed;
  }
  const fallbacks = lang !== DEFAULT_LANG ? [lang, DEFAULT_LANG] : [DEFAULT_LANG];
  for (const l of fallbacks) {
    const value = map[l];
    if (value) return pickLocalized(value, lang);
  }
  const first = Object.values(map)[0];
  return first != null ? pickLocalized(first, lang) : null;
}

export function localizeString(
  value: Record<string, string> | string | null | undefined,
  lang: string = DEFAULT_LANG,
): string | null {
  return pickLocalized(value, lang);
}

/**
 * class-validator decorator: field must be a non-empty string or a
 * `{ en, ar }` map. `@IsLocalizedString({ required: false })` relaxes it.
 */
export function IsLocalizedString(
  options: NormalizeLocalizedOptions = { required: true },
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isLocalizedString',
      target: object.constructor,
      propertyName,
      constraints: [options],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [opts] = args.constraints as [NormalizeLocalizedOptions];
          return isLocalizedStringInput(value, opts);
        },
        defaultMessage(args: ValidationArguments) {
          const [opts] = args.constraints as [NormalizeLocalizedOptions];
          const shape = `{ ${SUPPORTED_LANGS.join(', ')} }`;
          return opts?.required
            ? `${args.property} must be a non-empty string or localized ${shape} object`
            : `${args.property} must be a string or localized ${shape} object`;
        },
      },
    });
  };
}
