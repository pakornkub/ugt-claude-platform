# Healthcheck — slim ไม่มี wget

ทำไม healthcheck ของ `Dockerfile.web` และ compose ทั้งสองไฟล์ยิงด้วย `python -c "urllib.request…"` ที่ `127.0.0.1:8000` (กติกาสรุปอยู่ `references/org-standards.md` §8)

`python:3.12-slim` เป็น image ขั้นต่ำมาก — ไม่มี `wget`/`curl` ติดมาให้ (ต่างจาก
`python:3.12` เต็ม) ดังนั้น healthcheck ทั้งใน Dockerfile (`Dockerfile.web`)
และ compose (`docker-compose.yml`/`docker-compose.dev.yml`) ต้องยิงด้วย Python
เอง — `urllib.request` เป็น standard library ไม่ต้องติดตั้งอะไรเพิ่ม:

```sh
python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"
```

จุดที่พลาดบ่อย:

- **`127.0.0.1` เท่านั้น ไม่ใช้ `localhost`** — ข้อนี้เป็น **กติกาเชิงป้องกัน
  ไม่ใช่บั๊กที่ยืนยันแล้ว**: `localhost` ต้องผ่าน resolver ซึ่งปกติคืนทั้ง
  `127.0.0.1` และ `::1` — client ที่ไล่ลองทีละ address จะติดที่ IPv4 อยู่ดี
  แม้ uvicorn/gunicorn จะผูก IPv4 เท่านั้น (`--host 0.0.0.0`) แต่
  `urllib.request` ของ stdlib ที่ healthcheck ใช้ **ไม่ได้การันตีว่าจะ fallback
  ทุกกรณี** และผลยังขึ้นกับ `/etc/hosts`/resolver order ของ base image ซึ่ง
  เปลี่ยนได้เงียบ ๆ ตอน bump. ระบุ IP ตรง ๆ ทำให้ผลลัพธ์ **deterministic**
  โดยไม่ต้องแลกอะไรเลย จึงเป็นกติกาตายตัวของทุก stack ในองค์กร
- **Port ในสตริงต้องเป็น 8000 (container-internal) เสมอ** — ไม่ใช่ host port
  จาก `${APP_PORT:-__PORT_PROD__}` ที่แค่ map เข้ามา healthcheck รันข้างใน
  container จึงเห็นแต่ port ภายใน
- `[BATCH]` shape (`Dockerfile.batch`) **ไม่มี** `EXPOSE`/`HEALTHCHECK` เลย —
  ไม่มี long-running process ให้ poll (ดู `references/docker-deploy.md` §B) ตัดสองบรรทัดนี้ทิ้งทั้งคู่ ไม่ใช่
  แค่ comment out
- `start_period: 60s` ในทั้งสอง compose ให้เวลาแอป boot ก่อนเริ่มนับ retry —
  ลดค่านี้จะทำให้ deploy ล้มเพราะ "unhealthy" ระหว่างที่แอปแค่ยังไม่ทัน boot
  เสร็จ (ต่างจาก unhealthy จริง)
