# Jenkins project-level setup (repeated for every project)

What the admin prepares in Jenkins/GitHub/nginx for each new project — moved out of `jenkins-one-time-setup.md` §B (the server-level part and the frequent pitfalls stay there). Section numbers B1–B4 are kept so existing citations still match.

## B. Project level (every project)

### B1. Credentials

Manage Jenkins → Credentials → (global) → Add Credentials:

| Credential ID | Type | Value |
| --- | --- | --- |
| `nvd` | Secret text | NVD API key (free at nvd.nist.gov) — without it OWASP DC is extremely slow (rate limit 5 req/30s) |
| `env-__PROJECT_NAME__` | Secret file | upload `.env.production` — the Deploy stage `cp`s it to `.env` |
| `env-__PROJECT_NAME__-dev` | Secret file | upload `.env.development` — same shape as prod but **separate DATABASE_URL + fresh auth secrets** |
| `sentry-dsn-__PROJECT_NAME__` | Secret text | the `NEXT_PUBLIC_SENTRY_DSN` value (if the project uses Sentry) — prod/dev share one DSN, split by the `SENTRY_ENVIRONMENT` runtime var |

> `nvd` is a server-level credential shared by every project — create it once.

**Secrets in the Jenkinsfile:** let the shell expand them (`"$VAR"` inside
single-quoted Groovy strings) — **never** Groovy interpolation (`"${VAR}"` in
double-quoted strings), which prints the value into the build log and triggers
Jenkins' "secret passed via Groovy String interpolation" warning. Temp files
holding secrets (e.g. `dc-nvd.properties`) must be deleted in `post { always }`.

### B2. Pipeline job config

- Create a Pipeline (or Multibranch Pipeline) job pointing at the repo +
  branches `main` and `develop`
- **Disable "Lightweight checkout"** — Configure → Pipeline → SCM → uncheck.
  Otherwise Jenkins fetches only the Jenkinsfile → later stages find an
  incomplete workspace / the pipeline runs stale code
- Branch detection in the Jenkinsfile already handles both job types:
  `def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())`
  (Multibranch provides `BRANCH_NAME` directly · plain Pipeline provides
  `GIT_BRANCH` = `origin/main`, needing the prefix stripped)

### B3. GitHub webhook

GitHub repo → Settings → Webhooks → Add webhook:

| Field | Value |
| --- | --- |
| Payload URL | `http://<jenkins-host>:8080/github-webhook/` |
| Content type | `application/json` |
| Events | Just the push event |

If Jenkins sits on an internal network GitHub can't reach → use
`pollSCM('H/5 * * * *')` in `triggers {}` instead.

### B4. Reverse proxy (nginx) for the dev environment

Add a `location` block on the Docker host for the dev container:

```nginx
location __BASE_PATH_DEV__ {
    proxy_pass http://127.0.0.1:__PORT_DEV__;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
