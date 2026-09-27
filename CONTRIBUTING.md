# Contributing

## Git hooks (Husky)

This repo enforces quality gates at three points. Do not bypass them except for
genuine emergencies (`git commit --no-verify`), and never bypass them on shared
branches.

| Hook         | When           | What runs                                                                      |
| ------------ | -------------- | ------------------------------------------------------------------------------ |
| `pre-commit` | before commit  | `lint-staged`: ESLint `--fix` on staged TS, Prettier on staged JSON/MD/YML/MJS |
| `commit-msg` | commit message | `commitlint`: message must satisfy Conventional Commits                        |
| `pre-push`   | before push    | `pnpm build` + `pnpm test` must pass                                           |

Hooks are installed automatically by the `prepare` script on `pnpm install`.

## Commit message rules

Messages follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification. commitlint (config: `commitlint.config.mjs`) rejects anything
else.

### Format

```
<type>(<scope>)!: <subject>

[optional body]

[optional footer(s)]
```

### Allowed types

| Type       | Use for                                                     |
| ---------- | ----------------------------------------------------------- |
| `feat`     | new user-facing capability                                  |
| `fix`      | bug fix                                                     |
| `perf`     | performance improvement that does not change behavior       |
| `refactor` | code change that neither fixes a bug nor adds a feature     |
| `test`     | adding or correcting tests                                  |
| `docs`     | documentation only                                          |
| `style`    | formatting, whitespace — no logic change                    |
| `build`    | build system or dependency changes (pnpm, Docker, Nest CLI) |
| `ci`       | CI/CD pipeline changes                                      |
| `chore`    | maintenance that does not fit any other type                |
| `revert`   | reverting a previous commit                                 |

### Subject line

- Imperative mood: `add`, not `added` / `adds` — read as "if applied, this
  commit will _<subject>_"
- No capital first letter, no trailing period
- ≤ 72 characters, single line
- Scope in parentheses is optional but encouraged: module or area name
  (`auth`, `articles`, `rbac`, `db`, `config` …)
- Breaking changes: append `!` before the colon and describe the migration in
  the body, or use a `BREAKING CHANGE:` footer

### Body and footers

- Separate the body from the subject with one blank line
- Explain **why** the change was made, not just what
- Reference issues with `Closes #123`, `Refs #456`

### Examples

```
feat(auth): add refresh-token rotation with revocation

Rotating refresh tokens close a replay window: a stolen token is
single-use, and reuse revokes the whole session family.

Closes #42
```

```
fix!: require ENCRYPTION_KEY at boot

AES-256-GCM at-rest encryption is now mandatory. Deployments without
a 64-char hex ENCRYPTION_KEY will fail config validation and refuse
to start.

BREAKING CHANGE: ENCRYPTION_KEY env var is required.
```

```
chore(db): add users_full_name index for admin search
```

**Rejected** (commitlint blocks these):

```
update stuff        ← no type
Fixed login.        ← past tense, capital, period
WIP                 ← meaningless
```

## Branches

- `main` is protected in spirit: never commit directly to it
- Feature branches: `feat/<ticket>-short-description`, fixes:
  `fix/<ticket>-short-description`

## Local workflow

```bash
pnpm install                      # also installs git hooks
pnpm start:dev                    # watch-mode dev server
pnpm lint                         # eslint --fix across the repo
pnpm test                         # unit tests
pnpm migration:generate --name=x  # diff entities → migration (review it!)
pnpm seed:rbac                    # idempotent RBAC seed
```

See `BLUEPRINT.md` for architecture and `docs/ADD_A_MODULE.md` for the recipe
to add a feature module.
