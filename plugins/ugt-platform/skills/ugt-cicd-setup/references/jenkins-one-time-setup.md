# Jenkins One-Time Setup (once per server / once per project)

What the admin must prepare on the Jenkins side before the pipeline can pass,
split into **server level** (once per Jenkins instance) and **project level**
(repeated for every project).

---

## A. Server level (once)

### A1. Required plugins

Manage Jenkins → Plugins → Available:

| Plugin | Used by |
| --- | --- |
| NodeJS Plugin | `tools { nodejs 'NodeJS-22' }` |
| SonarQube Scanner | `withSonarQubeEnv` + `waitForQualityGate` |
| OWASP Dependency-Check | `dependencyCheck` + `dependencyCheckPublisher` |
| JUnit Plugin | publishing `test-results/junit.xml` |
| HTML Publisher | publishing the coverage HTML report |
| Email Extension | `emailext` (HTML email — plain `mail` doesn't support HTML) |
| Pipeline | Declarative Pipeline core |
| Git Plugin | `checkout scm` |

### A2. Tools (names must match the Jenkinsfile exactly)

Manage Jenkins → Tools:

| Tool type | Name (exact) | Version |
| --- | --- | --- |
| NodeJS | `NodeJS-22` | Node 22.x |
| SonarQube Scanner | `SonarQube-Scanner` | Latest |
| Dependency-Check | `Dependency-Check` | Latest (Install automatically) |

> A mis-capitalized tool name = `sonar-scanner: command not found` / the
> dependencyCheck step can't find its installation.

### A3. SonarQube server config

Manage Jenkins → System → SonarQube servers → Add:

- Name: `SonarQube` (must match `withSonarQubeEnv('SonarQube')` in the Jenkinsfile)
- Server URL: `http://<sonarqube-host>:9000`
- Server authentication token: a Secret Text credential holding the SonarQube
  **Global Analysis Token** (see `sonarqube-setup.md`)

### A4. Global environment variables

Manage Jenkins → System → Global properties → Environment variables:

| Variable | Value |
| --- | --- |
| `NOTIFY_EMAIL` | recipient of pipeline result emails |
| `SMTP_FROM` | from-address for those emails (used in `emailext`) |

Also configure SMTP at Manage Jenkins → System → Extended E-mail Notification.

### A5. Docker on the Jenkins host — ⚠️ the snap-Docker gotcha

If Docker on the host was installed via **snap** (seen on Ubuntu Core 24),
bind-mounting `/usr/bin/docker` into the Jenkins container **does not work** —
snap sandboxes its own binary. Build a custom Jenkins image with the Docker CLI
inside:

```dockerfile
# jenkins/Dockerfile — built once on the Jenkins host
FROM jenkins/jenkins:lts

USER root
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

# CRITICAL: the docker group GID inside the container must match the HOST's
# check on the host: getent group docker | cut -d: -f3
RUN groupmod -g <host-docker-gid> docker && \
    usermod -aG docker jenkins

USER root
```

```bash
docker build -t jenkins-custom:latest ./jenkins/
docker run -d \
  --name jenkins \
  --restart unless-stopped \
  -p 8080:8080 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins-custom:latest
```

**Why the GID must match:** `/var/run/docker.sock` on the host belongs to the
host's `docker` group with a specific GID; a mismatched GID in the container
gets "permission denied" on the socket even though it's mounted.

### A6. NVD data strategy (`--noupdate` in the pipeline)

The Jenkinsfile template runs dependency-check with `--noupdate` = scan against
the **local NVD cache only**, no downloads mid-pipeline (fast + avoids rate
limits) — which means NVD data must already exist on the machine, or the first
run on a fresh Jenkins scans against an empty DB (everything passes,
deceptively). Pick one:

1. **Recommended:** a separate Jenkins job (freestyle/pipeline, cron e.g.
   `H 2 * * *`) running `dependency-check --updateonly` (NVD API key from the
   `nvd` credential via `--nvdApiKey`) — refreshes the cache nightly so the
   main pipeline can keep `--noupdate` forever
2. Or **temporarily remove `--noupdate`** for the first run to download the
   full NVD set (⚠️ 60–90 minutes — the stage's 90-minute timeout allows for
   it), then put it back

### A7. docker-compose v1 vs v2

Some servers only have **`docker-compose`** (v1 standalone), not
`docker compose` (v2 plugin) — the Jenkinsfile template defaults to
`docker-compose` (v1). Check first:

```bash
docker-compose version   # v1 standalone
docker compose version   # v2 plugin
```

v2-only host → change the Deploy stage to `docker compose` (with the space).

---

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

---

## C. Frequent pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `docker: command not found` in Jenkins | Docker CLI missing in the Jenkins container | custom image (A5) |
| `permission denied /var/run/docker.sock` | docker group GID mismatch with the host | `groupmod -g <host-gid> docker` in the custom image |
| `waitForQualityGate` hangs forever | SonarQube webhook not configured | SonarQube → Administration → Webhooks → `http://<jenkins-host>:8080/sonarqube-webhook/` |
| Quality Gate always passes despite issues | wrong `sonar.sources` path | check paths relative to the workspace root |
| OWASP DC extremely slow (hours) | no NVD API key / first run | create the `nvd` credential · accept the first-run wait (cached → ~5 min after) |
| Suppressed CVEs still fail the build | grepping raw XML (counts `<suppressedVulnerabilities>` too) | use `dependencyCheckPublisher` only — it counts unsuppressed CVEs |
| Jenkinsfile changes don't apply / stale code runs | Lightweight checkout enabled | disable per B2 |
| `cleanWs` deletes files mid-run | placed inside a stage | only in the pipeline-level `post { always {} }` |
