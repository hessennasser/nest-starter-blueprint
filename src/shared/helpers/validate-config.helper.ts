import { plainToClass } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { ClassConstructor } from 'class-transformer/types/interfaces';

/**
 * Validates `process.env` against a decorated class at boot. Any failure throws
 * a single aggregated `Error`, so the process refuses to start with bad config
 * instead of failing deep in a request handler later.
 *
 * Called from every `*.config.ts` inside its `registerAs(...)` factory.
 */
export function validateConfig<T extends object>(
  config: Record<string, unknown>,
  envVariablesClass: ClassConstructor<T>,
) {
  const validatedConfig = plainToClass(envVariablesClass, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const flatten = (errs: ValidationError[]): string[] =>
      errs.flatMap((e) => {
        const msgs = Object.values(e.constraints ?? {});
        const childMsgs =
          e.children && e.children.length > 0 ? flatten(e.children) : [];
        return [...msgs, ...childMsgs].map((m) => `${e.property}: ${m}`);
      });
    throw new Error(flatten(errors).join('; '));
  }
  return validatedConfig;
}

export default validateConfig;
