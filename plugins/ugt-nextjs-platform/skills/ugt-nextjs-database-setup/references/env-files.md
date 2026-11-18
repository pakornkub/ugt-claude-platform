# Real env files — what goes into `.env` / `.env.dev` / `.env.local`

`.env.example` keeps placeholders (committed). The three real files (gitignored,
never committed) are **filled by the installer, not left for the user**: every
value below that can be derived from the interview is written in. Only what
the admin team must hand back stays `CHANGE_ME` (DB login/password, Keycloak
client secret, LDAP details nobody gave).

| File | Read by | Environment |
| --- | --- | --- |
| `.env.local` | `next dev` on the developer's machine | dev (local) |
| `.env.dev` | `docker compose -f docker-compose.dev.yml --env-file .env.dev` · Jenkins credential `env-<project>-dev` | dev (deployed) |
| `.env` | `docker compose` · Jenkins credential `env-<project>` | prod |

Who creates which: database-setup writes `.env.local` (sections 1–2), auth-setup
fills its section 3, cicd-setup §4.5 creates `.env` + `.env.dev` from the same
table. Each skill fills **its own keys in every file that already exists**.

## Values

`D` = the domain from the interview, **org default `https://ugtweb.ube.co.th`**
(scheme included, no trailing slash) · `P` = project name (kebab-case) ·
`N` = display name.

| Key | `.env` (prod) | `.env.dev` | `.env.local` |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | `/P` | `/P-dev` | `/P-dev` |
| `NEXT_PUBLIC_APP_NAME` | `N` | `N (DEV)` | `N (DEV)` |
| `NEXT_PUBLIC_APP_URL` | `D/P` | `D/P-dev` | `http://localhost:3000/P-dev` |
| `APP_PORT` | prod port (Q8) | dev port (Q8) | `3000` |
| `DATABASE_URL` | prod database | dev database | dev database |
| `CRON_SECRET` `[CRON]` | generated | generated | generated |
| `BETTER_AUTH_SECRET` | generated | generated | generated |
| `BETTER_AUTH_URL` | `D` | `D` | `http://localhost:3000` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `D` | `D` | `http://localhost:3000` |
| `KEYCLOAK_ISSUER` | `D/keycloak/realms/ugt` | same | same |
| `KEYCLOAK_CLIENT_ID` | `P` | `P-dev` | `P-dev` |
| `KEYCLOAK_CLIENT_SECRET` | `CHANGE_ME` (admin returns, client `P`) | `CHANGE_ME` (client `P-dev`) | same as `.env.dev` |

- **Generated** = run once per file, so all three differ (a dev secret must
  never unlock prod sessions). `openssl rand -base64 32`; no `openssl`
  (stock Windows) →
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
  Never leave the `CHANGE_ME_min_32_chars…` dummy in a real file. **No shell**
  (the command cannot run) → keep the dummy and list the command per file under
  "ยังไม่ได้รัน" — never type a made-up "random" string: a secret a model writes
  by hand is guessable.
- `BETTER_AUTH_URL` / `BETTER_AUTH_TRUSTED_ORIGINS` are the bare origin — **no
  basePath** (cookie-name trap, `ugt-nextjs-auth-setup` `references/auth-flows.md`).
- `NEXT_PUBLIC_*` in `.env` / `.env.dev` mirror what the Jenkinsfile bakes in as
  build args per branch (`__BASE_PATH_*__`, `__APP_URL_*__`, app name + ` (DEV)`
  on dev) — keep the two in step.
- `KEYCLOAK_ISSUER` follows the domain: `https://ugtweb.ube.co.th` →
  `https://ugtweb.ube.co.th/keycloak/realms/ugt` (Keycloak sits under
  `/keycloak` on the same host, realm `ugt`). Another domain → same shape;
  confirm via `<issuer>/.well-known/openid-configuration` when reachable.
- Two Keycloak clients: `P` (prod redirect URI) and `P-dev` (dev + localhost
  redirect URIs) — cicd admin-handoff §G requests both.
- No basePath (app on its own domain root) → `NEXT_PUBLIC_BASE_PATH` empty and
  the URLs are the full prod/dev URLs the user gave; the rest of the table holds.
