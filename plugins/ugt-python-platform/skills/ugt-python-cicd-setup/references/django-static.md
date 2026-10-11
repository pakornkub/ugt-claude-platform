# [DJANGO] static files — `collectstatic` + WhiteNoise

ทำให้ Django ที่ `DEBUG=False` เสิร์ฟ CSS/JS ได้เองจากใน container (ไม่พึ่ง reverse proxy) และกับดักตอน `docker build`

**อาการ**: deploy ผ่าน · container `healthy` · `/api/health` คืน 200 · แต่หน้า
`/admin` และทุกหน้าของแอปมาแบบไม่มี CSS/JS เลย และ **ไม่มี error ใน log** สัก
บรรทัด (Django ตอบ 404 เฉพาะ request ของไฟล์ static ซึ่ง browser ไม่ได้ทำให้
หน้าพัง แค่ไม่สวย) — pipeline ไม่มีทางจับข้อนี้ได้เพราะทุกด่านเขียวหมด

**สาเหตุ**: `DEBUG=False` (ค่าที่ production ต้องเป็น) ทำให้ Django **หยุด
เสิร์ฟไฟล์ static เอง** โดยตั้งใจ — เอกสาร Django บอกให้เอา web server จริงมา
เสิร์ฟแทน แต่ในสถาปัตยกรรมนี้ container ไม่มี nginx อยู่ข้างใน (reverse proxy
อยู่ระดับ host และเป็นของทีม admin คนละทีม การขอให้เขาเพิ่ม alias ต่อโปรเจค
ทำให้ deploy ไม่ self-contained อีกต่อไป)

**ทางที่ชุดนี้เลือก: WhiteNoise** — เสิร์ฟ static จากใน WSGI app เอง ไม่ต้องแตะ
proxy ไม่ต้องเพิ่ม container:

1. `requirements.txt` เพิ่ม `whitenoise`

2. `settings.py` — middleware ต้องอยู่ **ถัดจาก `SecurityMiddleware` ทันที**
   (สูงกว่านั้น = ข้าม security header, ต่ำกว่านั้น = request ของ static ไป
   เสียเวลากับ session/auth middleware ก่อนโดยเปล่าประโยชน์):

   ```python
   MIDDLEWARE = [
       "django.middleware.security.SecurityMiddleware",
       "whitenoise.middleware.WhiteNoiseMiddleware",   # ต้องอยู่ตรงนี้เป๊ะ
       # ... ที่เหลือตามเดิม
   ]

   STATIC_URL = "static/"          # [SUBPATH] ขึ้นต้นด้วย path เดียวกับ FORCE_SCRIPT_NAME
   STATIC_ROOT = BASE_DIR / "staticfiles"
   ```

3. `Dockerfile.web` — เพิ่มบรรทัดนี้ **หลัง `COPY . .` และก่อน `USER app`**:

   ```dockerfile
   # [DJANGO] รวม static เข้า image — DEBUG=False ไม่เสิร์ฟ static ให้อีกต่อไป
   RUN python manage.py collectstatic --noinput
   ```

   ตำแหน่งสำคัญทั้งสองด้าน: ต้องอยู่**หลัง** `COPY . .` (ยังไม่มีโค้ดแอปก็ยังไม่มี
   static ให้เก็บ) และ**ก่อน** `USER app` (ตอนนั้นยังเป็น root จึงเขียน
   `staticfiles/` ได้ แล้ว `RUN chown -R app:app /app` บรรทัดถัดไปครอบให้เอง —
   สลับลำดับแล้วจะได้ `PermissionError` ตอน build)

**กับดักตอน build**: `collectstatic` โหลด `settings.py` ทั้งไฟล์ แต่ `.env`
ตัวจริงยังไม่มีตอน `docker build` (Jenkins วางให้ตอน Deploy stage เท่านั้น) —
settings ที่บังคับ `SECRET_KEY`/`DATABASE_URL` จะ `ImproperlyConfigured` แล้ว
build พังทั้ง stage. แก้ด้วยการใส่ค่า dummy ให้เฉพาะช่วง build:

```dockerfile
ENV SECRET_KEY=build-only-not-a-real-secret \
    DATABASE_URL=sqlite:///build.db
RUN python manage.py collectstatic --noinput
```

runtime `.env` ทับค่าพวกนี้ทั้งหมดอยู่แล้ว (`--env-file` ชนะ `ENV` ของ image) —
**อย่าไปผ่อน `settings.py` ให้ค่าพวกนี้ optional แทน** เพราะนั่นทำให้ production
บูตขึ้นได้ทั้งที่ไม่มี secret จริง ซึ่งอันตรายกว่าปัญหาที่กำลังแก้มาก
