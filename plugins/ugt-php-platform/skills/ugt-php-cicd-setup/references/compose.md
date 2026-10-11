# Compose conventions + `security_opt` บน docker02

กติกาของ `docker-compose.yml` / `docker-compose.dev.yml` (เหมือนกันทั้ง prod/dev) และ hardening ที่ห้ามใส่บน host จริง

## Conventions (เหมือนกันทั้ง prod/dev)

| Convention | ทำไม |
| --- | --- |
| `pull_policy: never` | image build ในเครื่อง Jenkins เอง ไม่งั้น compose พยายาม pull `latest` จาก Docker Hub แล้วได้ image คนละตัว (หรือ fail ถ้าไม่มี registry) |
| `ports: '${APP_PORT:-<port>}:80'` | host port override ได้จาก `.env` — กัน port ชนกันบน host ที่รันหลายโปรเจค; container-internal คงที่ 80 (apache) เสมอ |
| แยกไฟล์ compose prod/dev คนละไฟล์ | ชื่อ image/container/host port ต่างกัน — รวมไฟล์เดียวแล้ว parametrize เสี่ยง deploy ผิด environment มากกว่าแยกไฟล์ให้เห็นชัด |
| `restart: unless-stopped` | shape เดียวของ PHP คือ `[WEB]` — ต้องรอด host reboot อัตโนมัติเสมอ (ไม่มี `[BATCH]` ที่ต้องการ `restart: "no"` เหมือนฝั่ง python) |
| resource limits (`deploy.resources`) | container เดียวไม่ควร starve ทรัพยากร host ที่มีหลายโปรเจครันร่วมกัน |
| `logging` json-file 10m×3 | log โตไม่จำกัดจะเต็มดิสก์ host ได้ในระยะยาว |
| `proxy-network` (`external: true`) | ทุกแอป [WEB] แชร์ network เดียวกับ reverse proxy ที่สร้างไว้ครั้งเดียวบน host |
| `DATABASE_URL: ${DATABASE_URL}` ทำเครื่องหมาย `[DB]` | ลบทิ้งได้ถ้าโปรเจคไม่มี database (legacy/static content ล้วน) |

## `security_opt: [no-new-privileges:true]` — ทำ entrypoint fail บน docker02 จริง

**อาการ**: deploy ผ่านทุก stage (Docker Build เขียว) แต่ Jenkins
`docker compose up -d --wait` รายงาน `container <name> is unhealthy` ภายใน
ไม่กี่วินาทีหลัง `Started` — **เร็วกว่า `start_period` ของ healthcheck ที่ตั้ง
ไว้มาก** (สัญญาณเฉพาะตัวว่า container ตายไปแล้วระหว่างช่วง health ยัง
"starting" ไม่ใช่ probe ตรวจแล้วไม่ผ่านจริง) `docker logs` ขึ้น:

```
exec /usr/local/bin/docker-php-entrypoint: operation not permitted
```

แล้วเข้า restart loop ต่อเนื่องเพราะ `restart: unless-stopped`. ทดสอบบนเครื่อง
dev เอง (Docker Desktop) ผ่านปกติทุกอย่าง — เจอเฉพาะตอน deploy จริงบน docker02
เท่านั้น

**สาเหตุ**: `no-new-privileges:true` ปิดความสามารถของ process ในการยก
privilege ผ่าน setuid/setcap ตอน exec — บน docker02 จริง (Ubuntu 24.04 /
kernel 6.8 + AppArmor) `docker-php-entrypoint` ของ base image ต้องอาศัยการ
transition สิทธิ์แบบนั้น (เช่นตอน apache ยัง start เป็น root แล้ว drop ไปเป็น
`www-data` — `references/volumes.md`) เมื่อ transition ไม่ได้ kernel ปฏิเสธด้วย
`operation not permitted` แล้ว process ตายทันที — Docker Desktop (Linux VM
คนละ kernel/AppArmor policy) ไม่มีข้อจำกัดเดียวกัน จึงไม่ reproduce ตอนเทส
local

**ยืนยันจากอินซิเดนต์จริง**: เจอครั้งแรกที่ ugt-mscpl-ana 2026-08-17 (ถอดออก
แล้ว มีคอมเมนต์อธิบายไว้ใน `docker-compose.yml` ของโปรเจคนั้น) แต่ไม่เคยถูก
บันทึกไว้ในปลั๊กอินนี้ ทำให้เหยียบซ้ำที่ ugt-bd-forecast 2026-09-03 build #4

**ทางแก้**: **ห้ามใส่ `no-new-privileges:true` ใน `security_opt`** ของ compose
ทั้งสองไฟล์ (prod/dev) บน host นี้ — hardening ตัวอื่นที่เหลือใช้ได้ปกติและไม่
ชนกัน: non-root จาก PID 1 (apache drop เป็น `www-data` เอง — `references/volumes.md`),
`cap_drop: [ALL]`, `read_only: true` + `tmpfs` — ตัด `no-new-privileges` ออก
จากลิสต์อย่างเดียวพอ

**Diagnostic tip**: ถ้า `--wait` รายงาน unhealthy **เร็วกว่า `start_period`**
ที่ตั้งไว้ — แปลว่า container ตาย ไม่ใช่ health probe fail จริง อย่าเพิ่งไล่
เรื่อง DB connection / network ก่อน เช็คนี้ก่อนเสมอ:

```bash
docker inspect --format '{{.State.Status}} {{.RestartCount}}' <container>
docker logs <container>
```

`RestartCount` ที่วิ่งขึ้นเรื่อย ๆ พร้อม status `restarting` คือสัญญาณ
crash-loop ชัดเจน — ไปดู `docker logs` ก่อนเสมอ ไม่ใช่ไล่ credential/DNS
