# Compose + Dockerfile changes (ugt-nextjs-upload-setup)

Apply to **both** `docker-compose.yml` and `docker-compose.dev.yml`. Dev uses
its own host path (`/srv/appdata/__PROJECT_NAME__-dev/…`) and container names
so a dev deploy can never write into production's files.

> **Bind mounts under `/srv/appdata/<project>` — ห้าม named volume** ตาม
> contract ของ ugt-nextjs-cicd-setup §2.8: named volume มองไม่เห็นจาก host,
> backup job ขององค์กรกวาดไม่ถึง และ Jenkinsfile ก็เตรียม `mkdir -p` ไว้ให้
> เฉพาะ path ใต้ `/srv/appdata` เท่านั้น

## 1. Dockerfile — create the mount point with the right owner

Add **before** `USER nextjs` in the runner stage — the bind mount inherits the
host directory's owner, so the container-side path must exist and the Jenkins
`mkdir -p` line must `chown` the host side (step 3):

```dockerfile
# Storage mount point — must exist and be owned by the runtime user
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage
```

## 2. compose — the storage bind mount and the scanner

```yaml
services:
  app:
    # … existing config …
    environment:
      # … existing vars …
      STORAGE_ROOT: /app/storage
      UPLOAD_MAX_BYTES: ${UPLOAD_MAX_BYTES:-26214400}
      # [SCAN] — สามตัวถัดไปเป็นของ virus scan; ตัดเมื่อไม่เอา (SKILL.md §3 Q5)
      CLAMAV_HOST: clamav
      CLAMAV_PORT: '3310'
      CLAMAV_TIMEOUT_MS: '30000'
    volumes:
      # dev compose: /srv/appdata/__PROJECT_NAME__-dev/storage
      - /srv/appdata/__PROJECT_NAME__/storage:/app/storage
    # [SCAN] — depends_on ทั้งบล็อก + service clamav ข้างล่าง: ตัดเมื่อไม่เอา scan
    depends_on:
      clamav:
        condition: service_healthy

  clamav:
    image: clamav/clamav:stable
    container_name: __PROJECT_NAME__-clamav
    restart: unless-stopped
    networks:
      - proxy-network
    volumes:
      # Keep the signature DB across restarts — re-downloading it on every
      # deploy costs minutes of refused uploads (the app fails closed).
      # dev compose: /srv/appdata/__PROJECT_NAME__-dev/clamav-db
      - /srv/appdata/__PROJECT_NAME__/clamav-db:/var/lib/clamav
    healthcheck:
      test: ['CMD-SHELL', 'clamdscan --ping 1 || exit 1']
      interval: 30s
      timeout: 10s
      # First boot loads ~1 GB of signatures — without a long start_period the
      # container is marked unhealthy before it has ever had a chance.
      start_period: 300s
      retries: 3
```

**Jenkinsfile** — add `storage` and `clamav-db` to the `[VOLUME]` `mkdir -p`
line in the Deploy stage (both prod and dev paths), so the directories exist
with the right owner before the first `docker compose up`:

```bash
mkdir -p /srv/appdata/__PROJECT_NAME__/storage /srv/appdata/__PROJECT_NAME__/clamav-db
```

([SCAN] — ไม่เอา scan: ตัด `clamav-db` ออกจากบรรทัดนี้ด้วย)

## 3. What the admin/DevOps team must know

Add these to `docs/admin-handoff.md`:

- **`/srv/appdata/__PROJECT_NAME__/storage` is the only copy of uploaded
  files.** It is not in the image and not in the database, so it is **not
  covered by the database backup**. It needs its own backup job.
- Deleting that host directory deletes every attachment — the containers can
  be recreated freely (`down` / `up -d` is safe), the directory cannot.
- clamav needs roughly **2 GB RAM** and refreshes signatures on its own
  (`freshclam` runs inside the image).
- If a reverse proxy sits in front, raise its body limit to match
  `UPLOAD_MAX_BYTES` (nginx: `client_max_body_size`), otherwise large uploads
  fail at the proxy with a 413 the app never sees.
