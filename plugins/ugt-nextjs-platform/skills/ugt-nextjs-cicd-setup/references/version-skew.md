# Version skew after a deploy — `deploymentId` = `<BUILD_NUMBER>-<commit>`

The deploy half of version skew: wiring `deploymentId` through next.config, the Dockerfile and Jenkins so Next.js can tell an open page and the server apart.

**Symptom:** right after a deploy, a page that was already open fails **every**
Server Action — browser console `UnrecognizedActionError: Server Action
"404a8f…" was not found on the server` + `POST …/<route> 409 (Conflict)`, the
app shows its generic save error ("ส่งข้อมูลไม่ได้หลัง deploy"). A refresh
fixes it. Every project hits it — Jenkins redeploys on each push and users keep
tabs open; it hurts most on long forms (the typed text is lost on the refresh).

**Cause:** Server Action ids change with every build and the old client bundle
still calls the previous ids. Without a `deploymentId` Next.js cannot tell the
page and the server come from different builds, so it cannot reload.

**Fix — three places, all in the cicd assets (new projects get them; existing
ones add them by hand — Dockerfile/Jenkinsfile/next.config are not in kit-sync):**

```ts
// next.config.ts — unset locally and in the CI `npm run build` stage
deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined,
```

```dockerfile
# Dockerfile, builder stage — next to the NEXT_PUBLIC_* build args
ARG NEXT_DEPLOYMENT_ID
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID \
```

```groovy
// Jenkinsfile, Docker Build stage — BOTH docker build commands (builder + runner)
--build-arg NEXT_DEPLOYMENT_ID=${deployId} \
```

- `deployId` = `<BUILD_NUMBER>-<first 8 of GIT_COMMIT>` (defined next to `buildNum` in the
  Docker Build stage) — not a secret. The commit part keeps it unique when a job is
  recreated and `BUILD_NUMBER` restarts at 1. Passing it to **both** builds keeps the builder image and the runner
  image on one id.
- It is a build-time value, like `NEXT_PUBLIC_*`: setting it as compose
  `environment:` does nothing, and `docker compose` must still deploy with
  `--no-build` (`references/docker-deploy.md` §C).
- Dev and prod are separate Jenkins jobs/builds, so each environment's ids only
  ever compare within itself.
- The code half: a Server Action that still reaches an
  older build raises `UnrecognizedActionError`, and on a long form the app
  should keep the typed draft and offer a reload instead of a generic error →
  `ugt-nextjs-pitfalls` `references/version-skew.md`.
