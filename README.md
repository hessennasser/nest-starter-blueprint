# nest-starter-blueprint

An opinionated **NestJS 11** backend starter, extracted as a reusable blueprint
from a production codebase. Clone it, rename it, delete the `articles` example,
and build.

**What you get out of the box**

| Area | Choice |
| --- | --- |
| HTTP | Express, URI versioning, global `api` prefix, Swagger behind Basic auth |
| Validation | global `ValidationPipe` (whitelist + transform), `class-validator` DTOs |
| Responses | one envelope `{ success, message, data }` for everything, always localized |
| Errors | one global filter → `{ success:false, message, error, statusCode }` |
| Config | namespaced `registerAs` modules, each **validated at boot** — bad env = no start |
| DB | PostgreSQL + TypeORM 0.3, **migrations only** (`synchronize` off everywhere) |
| Auth | JWT access + rotating refresh sessions (hashed, revocable) |
| AuthZ | RBAC: `UserType` scope guard + permission-code guard, `SUPER_ADMIN` bypass |
| i18n | `nestjs-i18n`, `en` + `ar`, English literals mapped to keys at the edge |
| Cache/Queues | Redis via `cache-manager` + BullMQ (`@nestjs/bull`) |
| Mail | `nodemailer` + Handlebars templates, no-op when unconfigured |
| Scheduling | `@nestjs/schedule` |
| Rate limiting | `@nestjs/throttler` + `@RateLimit(limit, seconds)` |
| Container | multi-stage `Dockerfile` (node:20-alpine, non-root, healthcheck) + compose |

Read **[BLUEPRINT.md](./BLUEPRINT.md)** for the architecture and the conventions,
and **[docs/ADD_A_MODULE.md](./docs/ADD_A_MODULE.md)** for the copy-paste recipe
to add a feature.

---

## Quick start (local, with Docker for infra)

```bash
cp .env.example .env            # then edit JWT_SECRET, DATABASE_PASSWORD, ...
pnpm install

# Postgres + Redis only
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env up -d db redis

pnpm migration:run             # create the schema
pnpm seed:rbac                 # permissions, roles, and the super admin from .env
pnpm start:dev
```

- API: `http://localhost:3000/api`
- Health: `http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api/docs` (Basic auth: `SWAGGER_USER` / `SWAGGER_PASSWORD`)

Log in with the seeded super admin:

```bash
curl -sX POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

## Quick start (everything in Docker)

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env up -d --build
```

The container entrypoint runs migrations, then the idempotent RBAC seed, then boots.

---

## Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm start:dev` | watch-mode dev server |
| `pnpm build` | compile to `dist/` |
| `pnpm test` | unit tests (`*.spec.ts`) |
| `pnpm test:e2e` | e2e tests (needs DB + Redis) |
| `pnpm lint` | eslint --fix |
| `pnpm migration:generate --name=add_x` | diff entities → new migration (review it!) |
| `pnpm migration:create --name=add_x` | empty migration to hand-write |
| `pnpm migration:run` / `pnpm migration:revert` | apply / roll back |
| `pnpm seed:rbac` | (re)seed permissions, roles, super admin |

## Renaming the project

1. `package.json` `name`, `docker-compose*.yml` `name:` / container names / volumes.
2. Swagger title in `src/main.ts`.
3. Replace the `articles` module with your first real feature (keep it as a
   reference until you have two of your own).
