/**
 * Resolves the `src/*` path alias at runtime for the compiled output, so that
 * `import { X } from 'src/shared/...'` keeps working under `node dist/main.js`
 * without pulling in `tsconfig-paths` at boot.
 *
 * Imported first from `main.ts` and `database/data-source.ts`.
 */
import Module from 'node:module';
import { join } from 'node:path';

type ResolveFilename = (
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
  options?: unknown,
) => string;

const moduleWithResolver = Module as typeof Module & {
  _resolveFilename: ResolveFilename;
};
const originalResolveFilename = moduleWithResolver._resolveFilename;

moduleWithResolver._resolveFilename = function resolveAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (request === 'src' || request.startsWith('src/')) {
    const resolvedRequest =
      request === 'src' ? __dirname : join(__dirname, request.slice(4));
    return originalResolveFilename.call(
      this,
      resolvedRequest,
      parent,
      isMain,
      options,
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
