---
type: regex
pattern: '/home/docker02/appdata/[^\s:]+:/app/storage'
target: { source: file, path: docker-compose.yml }
---
docker-compose.yml mounts the storage as a /home/docker02/appdata bind mount (never a named volume, cicd contract §2.8).
