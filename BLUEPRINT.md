# Architecture Blueprint

This document is the "why" behind the folder layout. It is meant to be read
once, top to bottom, before you add your first feature — then kept as a
reference. The [`articles`](./src/modules/articles) module is the worked
example of every pattern described here.

- [1. Principles](#1-principles)
- [2. Directory map](#2-directory-map)
- [3. The request lifecycle](#3-the-request-lifecycle)
- [4. Layer responsibilities](#4-layer-responsibilities)
- [5. The response envelope](#5-the-response-envelope)
- [6. Error handling](#6-error-handling)
- [7. Configuration](#7-configuration)
- [8. Database](#8-database)
- [9. Auth & RBAC](#9-auth--rbac)
- [10. Internationalization](#10-internationalization)
- [11. The shared toolbox](#11-the-shared-toolbox)
- [12. Conventions](#12-conventions)
- [13. Extension points](#13-extension-points)
- [14. Intentionally left out](#14-intentionally-left-out)
- [15. Testing](#15-testing)

---

## 1. Principles

1. **The edges are strict, the inside is plain.** Validation, auth, the response
   shape and error translation are enforced globally and once. Business code
   underneath is ordinary typed TypeScript — it `throw`s `NotFoundException`,
   returns plain objects, and never touches the HTTP layer.
2. **One way to do a thing.** One response envelope. One error filter. One
   config mechanism. One pagination helper. One place an entity becomes JSON
   (the presenter). A reader should never have to ask "which pattern is this
   file using".
3. **Fail at boot, not in a handler.** Every config namespace is validated
   against a decorated class when the process starts. A missing `JWT_SECRET`
   crashes startup with a readable message, not a request three days later.
4. **The database schema is deliberate.** `synchronize` is off in every
   environment. Every change is a reviewed migration.
5. **Modules are vertical slices.** Everything a feature needs
   (`controller / service / entities / dto / policy / tests`) lives in its
   folder. `shared/` is only for things genuinely used by many modules.

---

## 2. Directory map

```
src/
├── main.ts                  Bootstrap: pipes, interceptors, CORS, Swagger, versioning
├── register-paths.ts        Runtime `src/*` alias for compiled output
├── app.module.ts            Wires infra (config, TypeORM, cache, bull, i18n) + feature modules
├── app.controller.ts        `/` and `/health`
│
├── config/                  One file pair per namespace
│   ├── config.type.ts         AllConfigType — the typed view of every namespace
│   ├── app.config.ts          registerAs('app', …) + EnvironmentVariablesValidator
│   ├── app-config.type.ts     the shape `app.*` resolves to
│   ├── auth.config.ts / auth-config.type.ts
│   ├── mail.config.ts / mail-config.type.ts
│   └── redis.config.ts / redis-config.type.ts
│
├── database/
│   ├── data-source.ts         Standalone DataSource for the TypeORM CLI (migrations)
│   ├── load-env-file.ts       Tiny .env reader for scripts that run outside Nest
│   ├── typeorm-config.service.ts   Runtime DataSource for the app (DI, validated config)
│   ├── config/database.config.ts / database-config.type.ts
│   ├── migrations/            Timestamped, hand-reviewed, never edited after running
│   └── seeds/seed-rbac.ts     Idempotent: permissions, roles, super admin
│
├── i18n/                     nestjs-i18n JSON: en/ + ar/, files = namespaces
│
├── types/                    Framework-free shared types (ApiResponse, PaginationResult…)
│
├── shared/                   Cross-cutting, feature-agnostic
│   ├── constants/            permission-keys.ts, role-keys.ts (the RBAC catalogue)
│   ├── decorators/           @Public, @RequirePermissions, @RequireUserTypes, @RateLimit, @CurrentUser
│   ├── dto/                  BaseDto, PaginationQueryDto, Swagger response DTOs
│   ├── enums/                UserType, UserStatus, RoleScope
│   ├── filters/              AllExceptionsFilter (global)
│   ├── guards/               PermissionsGuard, ScopeGuard
│   ├── helpers/              The toolbox — see §11
│   ├── i18n/                 api-message-localizer.ts — English literal → i18n key
│   ├── interceptors/         ResponseInterceptor, LoggingInterceptor, FileUrlTransformInterceptor
│   ├── mail/                 MailModule + MailService + Handlebars templates
│   └── pagination/           paginated-response.ts, pagination.util.ts
│
└── modules/                  One folder per feature — vertical slices
    ├── auth/                 login / register / refresh-rotation, JwtStrategy, JwtAuthGuard
    ├── users/                user CRUD (admin), presenter keeps the hash out of responses
    ├── rbac/                 role & permission CRUD, system roles are locked
    └── articles/             ← REFERENCE MODULE — copy this shape
        ├── articles.module.ts
        ├── articles.controller.ts        thin: HTTP → service → presenter → envelope
        ├── articles.service.ts           the facade the controller talks to
        ├── services/articles-query.service.ts   read side (lists, filters, status rollups)
        ├── policies/article-policy.service.ts   "may this actor do X" — throws
        ├── articles.presenter.ts         pure entity → DTO (the only place that happens)
        ├── dto/                          create / update / list-query / response
        ├── entities/article.entity.ts    extends EntityRelationalHelper; JSONB localized text
        ├── enums/article-status.enum.ts
        └── tests/articles.service.spec.ts
```

A large feature grows more sub-services (`*-creation.service`,
`*-lifecycle.service`, `*-inventory.service`, …) and more controllers
(`admin-*.controller`, `public-*.controller`). The facade stays thin and is the
only thing other modules import.

---

## 3. The request lifecycle

```
HTTP request
   │
   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Global ValidationPipe        body/query → DTO instance,               │
│  (main.ts)                    unknown props rejected, types coerced   │
├──────────────────────────────────────────────────────────────────────┤
│ Guards (per route/controller, in @UseGuards order)                    │
│   1. JwtAuthGuard        verifies bearer token; @Public() skips it;   │
│                          JwtStrategy.validate RE-LOADS the user +     │
│                          roles + permissions every request           │
│   2. PermissionsGuard    @RequirePermissions / @RequireAnyPermissions │
│   3. ScopeGuard          @RequireUserTypes                            │
│   (SUPER_ADMIN short-circuits guards 2 and 3)                         │
├──────────────────────────────────────────────────────────────────────┤
│ Controller method        no logic — calls the service facade, passes  │
│                          the presenter output to ResponseHelper.*     │
├──────────────────────────────────────────────────────────────────────┤
│ Service facade           orchestrates; owns the write path           │
│   ├── *-query.service    read path (query builders, pagination)      │
│   ├── *-policy.service   row-level authorization (throws)            │
│   └── Repository<Entity> TypeORM                                     │
├──────────────────────────────────────────────────────────────────────┤
│ Presenter (pure fn)      Entity → response DTO; collapses localized   │
│                          { en, ar } columns to one string            │
└──────────────────────────────────────────────────────────────────────┘
   │  returns { success, message, data }  OR  a bare value
   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ResponseInterceptor      wraps a bare value in the envelope;         │
│                          localizes `message` via api-message-localizer│
│ LoggingInterceptor       one line in, one line out (status + ms)     │
└──────────────────────────────────────────────────────────────────────┘
   │
   ▼   on any throw ↓
┌──────────────────────────────────────────────────────────────────────┐
│ AllExceptionsFilter      → { success:false, message, error,          │
│                              statusCode, code?, errors? }            │
│                          HttpException / QueryFailedError / unknown   │
│                          each handled; message localized; <500 warn  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Layer responsibilities

| Layer | May | May **not** |
| --- | --- | --- |
| **Controller** | read `@CurrentUser()` / headers, call the facade, wrap with `ResponseHelper`, declare Swagger | contain branching business logic, touch a repository, build a query |
| **Service facade** (`*.service.ts`) | orchestrate a use case, own transactions, call sub-services & policy & repos | be huge — split into sub-services past ~200 lines |
| **Query sub-service** | build `SelectQueryBuilder`s, paginate, compute status rollups | mutate data |
| **Policy service** | decide "may actor X do Y to row Z", `throw ForbiddenException` | load unrelated data, mutate |
| **Presenter** (`*.presenter.ts`) | map `Entity` → DTO, `localizeString`, shape nested output | inject anything, hit the DB, use `this` (they are pure functions) |
| **DTO** | declare shape + `class-validator` rules + `@ApiProperty` + `class-transformer` coercion | contain methods |
| **Entity** | columns, relations, indexes, computed getters | business methods, validation |

If you can't decide where code goes: **write logic in the facade, reads in a
query service, "can they?" in a policy, shaping in a presenter.**

---

## 5. The response envelope

Every success response is exactly:

```jsonc
{ "success": true, "message": "Data retrieved successfully", "data": <payload> }
```

Produced by `ResponseHelper` (`src/shared/helpers/response.helper.ts`):

```ts
return ResponseHelper.success(dto);            // 200, generic message
return ResponseHelper.created(dto);            // "Resource created successfully"
return ResponseHelper.updated(dto);
return ResponseHelper.deleted();               // data: null
return ResponseHelper.paginated(page);         // data: { items, meta, statusCounts? }
return ResponseHelper.authenticated(tokens);
```

`ResponseInterceptor` (global) does two things:

1. If a handler returns a bare value (not already an envelope), it wraps it.
2. It runs `message` through `translateResponseMessage` so the client gets it
   in their `Accept-Language`.

So a handler can `return dto;` and still get a correct localized envelope — but
prefer the explicit `ResponseHelper.*` call so the intent (created vs updated)
is visible.

**Pagination** payloads are `{ items, meta }` (`meta`:
`total, page, limit, totalPages, hasNext, hasPrev`), optionally plus
`statusCounts` — a zero-filled `{ [status]: number }` map so a list screen can
render tab counts. Build it with `paginateQuery(qb, query)` +
`buildStatusCounts(...)`.

---

## 6. Error handling

`AllExceptionsFilter` (`APP_FILTER`, in `app.module.ts`) is the single exit for
every failure. Output:

```jsonc
{ "success": false, "message": "…", "error": "…", "statusCode": 404,
  "code": "OPTIONAL_MACHINE_CODE", "errors": [ /* class-validator array */ ] }
```

- **`HttpException`** (and subclasses) → its status; a string message or the
  `class-validator` string array is preserved; an optional `code` /`errors`
  passed in the exception payload is forwarded.
- **`QueryFailedError`** → `400`, a generic message. The real DB error is
  **logged, never sent** (it leaks schema).
- **Anything else** → `500`, generic message, full stack logged.
- Messages are localized via `translateErrorMessage`. Client errors (`<500`)
  log at `warn`; server faults at `error`. The URL is run through
  `redactSensitiveUrl` before logging.

In services, just throw the semantic exception with an **English literal** —
the localizer maps it:

```ts
throw new NotFoundException('Article not found');   // → errors.article_not_found
throw new ConflictException(`Slug '${slug}' is already taken`);
```

---

## 7. Configuration

Each concern is a namespace registered with `registerAs`, and **validated in the
same file**:

```
src/config/redis.config.ts
  ├── class EnvironmentVariablesValidator   (class-validator decorators on RAW env names)
  ├── validateConfig(process.env, EnvironmentVariablesValidator)   ← throws at boot on bad env
  └── export default registerAs('redis', () => ({ host, port, ... }))   ← typed, defaulted
```

`config.type.ts` unions them into `AllConfigType`. Read config **only** through
the typed service:

```ts
constructor(private config: ConfigService<AllConfigType>) {}
// ...
this.config.getOrThrow('redis.host', { infer: true });
this.config.get('mail.enabled', { infer: true });
```

Never read `process.env` in feature code (the two exceptions —
`FileUploadHelper` and `FileUrlTransformInterceptor` — are instantiated outside
DI in `main.ts`/globally and are documented as such).

### Add a namespace

1. `src/config/x-config.type.ts` — the resolved shape.
2. `src/config/x.config.ts` — validator class + `registerAs('x', …)`.
3. Add `x: XConfig` to `AllConfigType`.
4. Add the loader to `ConfigModule.forRoot({ load: [...] })` in `app.module.ts`.
5. Document the new env vars in `.env.example`.

---

## 8. Database

- **ORM**: TypeORM 0.3, PostgreSQL. `type: 'postgres'`, pooled (`extra.max`).
- **Two DataSources, kept in sync by hand:**
  - `database/typeorm-config.service.ts` — used by the running app, reads
    **validated** config via DI.
  - `database/data-source.ts` — used by the TypeORM **CLI** (migrations); reads
    its own env with `load-env-file.ts` and resolves `src/*` with
    `register-paths.ts`. Both point at the same entity/migration globs.
- **`synchronize` is `false` everywhere.** Schema changes = migrations.
  - `pnpm migration:generate --name=add_x` — diffs entities, writes a migration.
    **Always read it.** Split `RENAME`/`ALTER TYPE`/large-table locks out;
    prefer `CREATE INDEX CONCURRENTLY`; keep each migration compatible with the
    previous release if you deploy without downtime.
  - `pnpm migration:create --name=add_x` — empty migration to hand-write.
  - Migrations run in the container `CMD` before the app boots.
- **Base entity**: every entity extends `EntityRelationalHelper` — `uuid` PK,
  `createdAt` / `updatedAt` as `timestamptz`, a `toJSON()` that honours
  `class-transformer` decorators.
- **Column style**: `camelCase` property, `snake_case` DB column via
  `@Column({ name: 'author_id' })`. Keep the scalar FK (`authorId`) next to the
  relation (`author`) so you can filter without a join.
- **Money** is always integer **minor units** (`priceMinorUnits: bigint/int`),
  never a `float`/`decimal` column. `decimal.helper.ts` converts for display
  only.
- **User-facing text** is a JSONB `{ en, ar }` map (`@Column({ type: 'jsonb' })`),
  not a `varchar`. DTOs accept a string *or* the map (`@IsLocalizedString()`),
  services normalize with `normalizeLocalizedString`, presenters collapse with
  `localizeString(value, lang)`.
- **Soft delete** where history matters: `@DeleteDateColumn()` +
  `repo.softRemove()` / `withDeleted: true`.
- **Seeds** live in `database/seeds/`, are **idempotent** (upsert, never
  duplicate), and export their `seed()` so e2e helpers can call them.

---

## 9. Auth & RBAC

Two independent axes, checked by two guards. Put `JwtAuthGuard` first.

### Axis 1 — identity: `UserType` + `ScopeGuard`

`UserType` (`SUPER_ADMIN | ADMIN | USER`) is the coarse "kind of account".
`@RequireUserTypes(UserType.ADMIN)` + `ScopeGuard` gates a route to it.

### Axis 2 — capability: permission codes + `PermissionsGuard`

Fine-grained. `PermissionKey` enum (`src/shared/constants/permission-keys.ts`)
is the catalogue; the seed creates one `permissions` row per entry and attaches
sets of them to `roles`. A user's effective codes = the union across their
roles, flattened by `JwtStrategy.validate` onto `request.user.permissionCodes`.

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.MANAGE_ARTICLES)          // must have ALL
@RequireAnyPermissions(PermissionKey.VIEW_ARTICLES,         // must have ANY
                       PermissionKey.MANAGE_ARTICLES)
```

`SUPER_ADMIN` bypasses **both** guards. **Row-level** rules ("edit only your own
article") are not guards — they live in a `*-policy.service.ts` the facade
calls.

### Tokens

- **Access token**: short-lived JWT (`JWT_EXPIRATION`, default `15m`). Claims
  are minimal (`sub`, `email`, `userType`); permissions are **not** trusted
  from the token — `JwtStrategy.validate` re-loads the user + roles on every
  request, so a disabled account or revoked role takes effect immediately.
- **Refresh token**: opaque random string. Only its SHA-256 hash is stored
  (`refresh_sessions`). `POST /auth/refresh` **rotates** — the presented row is
  revoked and a fresh one issued, so a replayed token is detectable.
  `RefreshSessionService` also has `revokeAllForUser` and `pruneExpired`.

### `@CurrentUser()`

`@CurrentUser() user: AuthenticatedUser` or `@CurrentUser('id') id: string` —
the shape produced by `JwtStrategy.validate`.

---

## 10. Internationalization

- `nestjs-i18n` with `AcceptLanguageResolver`. Translation files:
  `src/i18n/<lang>/<namespace>.json` (`en`, `ar`). Shipped to `dist/` as assets
  (see `nest-cli.json`).
- Code throws/returns **English literals**, not keys. The bridge
  (`src/shared/i18n/api-message-localizer.ts`) resolves a literal via, in order:
  it already looks like a key → an exact-match table → a regex rule (with
  captured args) → return unchanged. `ResponseInterceptor` and
  `AllExceptionsFilter` call it at the edge.
- Add a language: extend `SUPPORTED_LANGS` in `language.helper.ts`, add
  `src/i18n/<lang>/`, and the `{ en, ar, … }` maps grow with it.
- The real production app's table has hundreds of entries; grow yours next to
  where the literals are thrown.

---

## 11. The shared toolbox

`src/shared/helpers/` — import from the folder (`from 'src/shared/helpers'`):

| Helper | Use |
| --- | --- |
| `response.helper.ts` | `ResponseHelper.success/created/updated/deleted/paginated/authenticated` |
| `transform.helper.ts` | `@TransformToNumber()`, `@TransformToBoolean()`, `@TransformToNumberArray()`, `@TrimString()` — coerce form-data/query strings in DTOs |
| `validate-config.helper.ts` | `validateConfig(env, ValidatorClass)` — used by every `*.config.ts` |
| `language.helper.ts` | localized `{ en, ar }` toolkit: `normalizeLocalizedString`, `localizeString`, `resolveLanguage`, `@IsLocalizedString()` |
| `relational-entity.helper.ts` | `EntityRelationalHelper` base entity |
| `encryption.helper.ts` | `hashPassword` / `comparePassword` (bcrypt); `encrypt` / `decrypt` (AES-256-GCM) for third-party secrets; `hashToken`, `generateSecureToken` |
| `decimal.helper.ts` | minor-unit ↔ display conversion |
| `date-range.helper.ts` | list-screen calendar dates → inclusive UTC bounds; "previous period" window |
| `status-counts.helper.ts` | grouped rows → zero-filled `{ status: count }` map |
| `request-meta.helper.ts` / `request-context.helper.ts` | pull ip / user-agent / actor / request-id for audit rows & logs |
| `safe-url.helper.ts` | `redactSensitiveUrl` — strip token/secret query params before logging |
| `file-upload.helper.ts` | `FileUploadHelper` (local disk; swap body for S3) + `getImageUrl` |
| `pagination/pagination.util.ts` | `resolvePagination`, `paginateQuery(qb, opts)`, `paginateArray` |

Decorators (`src/shared/decorators/`): `@Public`, `@CurrentUser`,
`@RequirePermissions` / `@RequireAnyPermissions`, `@RequireUserTypes`,
`@RateLimit(limit, seconds)`.

Interceptors (`src/shared/interceptors/`): `ResponseInterceptor` (envelope +
i18n, wired in `main.ts`), `LoggingInterceptor` (wired in `main.ts`),
`FileUrlTransformInterceptor` (global `APP_INTERCEPTOR` — rewrites known
file-path fields to absolute URLs; add field names to its `FILE_FIELDS`).

---

## 12. Conventions

- **Imports** use the `src/*` alias, never deep `../../../`. Enforced at runtime
  by `register-paths.ts` for the compiled build.
- **File names**: `kebab-case.role.ts` — `*.controller.ts`, `*.service.ts`,
  `*.presenter.ts`, `*.entity.ts`, `*.dto.ts`, `*.policy.service.ts`,
  `*.spec.ts`. A folder's `index.ts` re-exports its public surface.
- **One concern per file.** One entity, one DTO, one presenter set per module.
- **Controllers are declarative**: route + guards + Swagger + one service call
  + one `ResponseHelper` wrap. No `if`.
- **Services throw**, they don't return error shapes. Let the filter format it.
- **Presenters are pure functions**, exported individually
  (`presentArticle`, `presentArticlesPage`) — no class, no DI.
- **DB columns are `snake_case`**, TS properties are `camelCase`.
- **Module `exports`** only the facade service. If module B needs B-internal
  services, that's a smell — expose a method on the facade.
- **Tests** sit in `tests/` inside the module, named `*.spec.ts`.

---

## 13. Extension points

Everything below is deliberately *not* in the starter, but the seams are here.

### Multi-tenancy / organizations

Add `ORG_OWNER` / `ORG_MEMBER` to `UserType`, an `orgId` column on `User` and on
every tenant-scoped entity, and an `OrgScopeGuard` (or a
`resolveOrgScope(user)` helper like the production codebase's
`resolveMarketerScope`) that every query service applies as a `WHERE`. The
`ScopeGuard` / `PermissionsGuard` split already gives you the hook points.

### Background jobs

BullMQ is already configured (`BullModule.forRootAsync` in `app.module.ts`,
Redis from `redis.*`). In a feature module:

```ts
BullModule.registerQueue({ name: 'articles' })      // in the module imports
// a *.processor.ts with @Processor('articles') + @Process()
// inject @InjectQueue('articles') to enqueue
```

Make processors **idempotent** — queues are at-least-once.

### WebSockets

Add a `*.gateway.ts` with `@WebSocketGateway({ namespace: '/x' })`, authenticate
in `handleConnection` by verifying the JWT (`JwtModule` is exported from
`AuthModule`), and `server.to(`user:${id}`).emit(...)`. See the production
codebase's `notifications.gateway.ts` for the pattern.

### Object storage

`FileUploadHelper` writes to local disk today. Replace the body of `uploadFile`
/ `deleteUploadedFile` with an S3 client — call sites and the
`relativePath`-you-persist / `FileUrlTransformInterceptor`-turns-it-back
contract don't change.

### Audit trail

Add an `audit_log` entity + an interceptor that, after a successful mutating
handler, writes `extractRequestContext(req)` + the route + the affected id.

### Zero-downtime deploy

The production codebase ships a blue/green `deploy-zero-downtime.sh` (nginx
upstream rewrite, health-gated cutover, traffic proof, drain). Add
`docker-compose.bluegreen.yml` + that script when you need it; the `Dockerfile`
healthcheck and `enableShutdownHooks()` are already in place.

---

## 14. Intentionally left out

Cut from the source to keep the starter legible. Add back as needed:

| Cut | Add back by |
| --- | --- |
| OTP / email verification on register | an `auth-otp.entity` + `AuthOtpService`, gate `login` on `emailVerifiedAt` |
| Multi-tenant "owner/moderator" user model | see §13 Multi-tenancy |
| `stripe` / `whatsapp` / third-party integration modules | a `src/integrations/<name>/` folder, its own config namespace |
| The full ~400-entry i18n literal table | grow `api-message-localizer.ts` as you go |
| Domain helpers (`arabic-text`, `egypt-phone`, `rate-limiter`, `structured-log`) | copy the specific file from the source repo if you need it |
| `TimezoneHelper` / timezone interceptor | copy from source and set your zone; the starter stays UTC |
| e2e suite per module | `test/*.e2e-spec.ts` with `test/utils/create-testing-app.ts` |

---

## 15. Testing

- **Unit** (`*.spec.ts` next to the code): `Test.createTestingModule` with
  repositories and sub-services mocked. Presenters and helpers are pure — test
  them directly. See
  [`articles.service.spec.ts`](./src/modules/articles/tests/articles.service.spec.ts)
  and [`auth.service.spec.ts`](./src/modules/auth/tests/auth.service.spec.ts).
- **e2e** (`test/*.e2e-spec.ts`, `pnpm test:e2e`): boots the real `AppModule`
  against a real Postgres + Redis, exercises HTTP. Seed RBAC in `beforeAll`
  (import `seed` from `database/seeds/seed-rbac.ts`), then register/login to get
  a token.
- What to cover first: authorization (does the guard/policy actually block?),
  the happy path of each mutation, pagination + filters on each list.
