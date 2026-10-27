---
type: llm
focus: { source: file, path: Dockerfile }
---
PASS only if the runner stage, before `USER nextjs`: installs `tzdata` (apk); downloads supercronic for linux-amd64 at a pinned version and verifies it with `sha1sum -c`; copies `jobs.crontab`; and runs `supercronic -test` on it so a broken crontab fails the build. FAIL if an `ARG` line carries a trailing `#` comment, or if the download is unpinned/unverified.
