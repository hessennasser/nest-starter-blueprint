import { existsSync, readFileSync } from 'fs';
import path from 'path';

/**
 * Minimal `.env` reader with no dependency on `dotenv`. Used by the standalone
 * scripts (`data-source.ts`, seeds) which run outside the Nest DI container and
 * therefore outside `@nestjs/config`. Never overrides an already-set variable.
 */
const parseEnvValue = (raw: string): string => {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const loadEnvFile = (
  envFilePath = path.resolve(process.cwd(), '.env'),
): void => {
  if (!existsSync(envFilePath)) return;

  const contents = readFileSync(envFilePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const normalized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;

    const eq = normalized.indexOf('=');
    if (eq === -1) continue;

    const key = normalized.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = parseEnvValue(normalized.slice(eq + 1));
  }
};
