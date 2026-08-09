# Compose + Dockerfile changes (ugt-nextjs-upload-setup)

Apply to **both** `docker-compose.yml` and `docker-compose.dev.yml`. Dev uses
its own volume and container names (`__PROJECT_NAME__-dev`) so a dev deploy can
never write into production's files.

## 1. Dockerfile — create the mount point with the right owner

Add **before** `USER nextjs` in the runner stage. Docker seeds a new named
volume from whatever is at that path in the image, ownership included; without
this the volume is created root-owned and the app cannot write to it.

```dockerfile
# Storage volume mount point — must exist and be owned by the runtime user
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage
```

## 2. compose — the volume and the scanner

```yaml
services:
  app:
    # … existing config …
    environment:
      # … existing vars …
      STORAGE_ROOT: /app/storage
      UPLOAD_MAX_BYTES: ${UPLOAD_MAX_BYTES:-26214400}
      CLAMAV_HOST: clamav
      CLAMAV_PORT: '3310'
      CLAMAV_TIMEOUT_MS: '30000'
    volumes:
      - __PROJECT_NAME__-storage:/app/storage
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
      - __PROJECT_NAME__-clamav-db:/var/lib/clamav
    healthcheck:
      test: ['CMD-SHELL', 'clamdscan --ping 1 || exit 1']
      interval: 30s
      timeout: 10s
      # First boot loads ~1 GB of signatures — without a long start_period the
      # container is marked unhealthy before it has ever had a chance.
      start_period: 300s
      retries: 3

volumes:
  __PROJECT_NAME__-storage:
  __PROJECT_NAME__-clamav-db:
```

## 3. What the admin/DevOps team must know

Add these to `docs/admin-handoff.md`:

- **The storage volume is the only copy of uploaded files.** It is not in the
  image and not in the database, so it is **not covered by the database backup**.
  It needs its own backup job.
- `docker compose down -v` **deletes it** — that flag must never be used on this
  stack. Plain `down` / `up -d` is safe.
- clamav needs roughly **2 GB RAM** and refreshes signatures on its own
  (`freshclam` runs inside the image).
- If a reverse proxy sits in front, raise its body limit to match
  `UPLOAD_MAX_BYTES` (nginx: `client_max_body_size`), otherwise large uploads
  fail at the proxy with a 413 the app never sees.
