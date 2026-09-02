import { Transform } from 'class-transformer';

/**
 * `multipart/form-data` and query strings deliver everything as strings. These
 * `class-transformer` decorators coerce those into the types the DTO declares,
 * while leaving invalid input untouched so `class-validator` can report it.
 */

/** String → number. `''`/null/undefined become `undefined`. */
export function TransformToNumber() {
  return Transform(({ value }) => {
    const raw: unknown = value;
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed === '') return undefined;
      const num = Number(trimmed);
      return isNaN(num) ? trimmed : num;
    }
    if (typeof raw === 'number') return raw;
    return raw;
  });
}

/** Comma-separated string or array → number[]. */
export function TransformToNumberArray() {
  return Transform(({ value }) => {
    const raw: unknown = value;
    if (!raw) return undefined;
    if (Array.isArray(raw)) {
      return raw.map((item: unknown) => {
        if (typeof item === 'number') return item;
        if (typeof item === 'string') {
          const num = Number(item);
          return isNaN(num) ? item : num;
        }
        return item;
      });
    }
    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '')
        .map((s) => {
          const num = Number(s);
          return isNaN(num) ? s : num;
        });
    }
    if (typeof raw === 'number') return [raw];
    return raw;
  });
}

/**
 * String → boolean, without class-transformer's footgun of turning every
 * non-empty string into `true`. Only `'true'`/`'false'` (any case) convert.
 */
export function TransformToBoolean() {
  return Transform(({ value, obj, key }) => {
    const rawInput: unknown = value;
    const raw =
      obj && typeof key === 'string'
        ? (obj as Record<string, unknown>)[key]
        : rawInput;

    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw === 'string') {
      const t = raw.trim().toLowerCase();
      if (t === '') return undefined;
      if (t === 'true') return true;
      if (t === 'false') return false;
      return t;
    }
    if (typeof raw === 'boolean') return raw;
    return rawInput;
  });
}

/** Trim a string; collapse `''` to `undefined`. */
export function TrimString() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  });
}
