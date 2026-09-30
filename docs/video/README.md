# วิดีโอโปรโมต UGT Claude Platform

> **Status:** Living · **Date:** 2026-09-30 · **Applies-to:** ugt-core 2.13.2 · ugt-nextjs-platform 4.63.5
> **Last-reviewed:** 2026-09-30 — ตัวเลขเวอร์ชัน/ผล eval/รายชื่อตัวช่วยในวิดีโอตรงกับ README.md ณ วันที่นี้

ไฟล์พร้อมใช้: [`ugt-claude-platform-promo.mp4`](ugt-claude-platform-promo.mp4) — 1920×1080 · 30fps · 77 วินาที · มีเพลงประกอบ

| เวลา | ฉาก | เล่าอะไร |
| --- | --- | --- |
| 0:00 | Problem | ทุกโปรเจคเขียนคนละแบบ / AI ไม่รู้มาตรฐานบริษัท |
| 0:08 | Platform | โลโก้ + "ติดตั้งครั้งเดียว → ทุกโปรเจคทำตามมาตรฐานเอง" + stack |
| 0:16 | Install | 3 คำสั่งติดตั้ง + `/ugt` + เลือก bundle superpowers / mattpocock |
| 0:24 | One sentence | พิมพ์ประโยคเดียว → Database → Quality → Design → Auth → [Mail] → [Upload] → CI/CD → `verify.mjs` เขียว → `docs/admin-handoff.md` |
| 0:36 | Skills | ตัวช่วย 16 ตัว (AUTO = clean-code, pitfalls) |
| 0:44 | Design | UI kit เดียวกันทั้งองค์กร + สลับ light/dark |
| 0:52 | Memory | `/ugt-handoff` + `docs/project-context/` |
| 0:58 | Proof | 34/34 vs 18/34 · 14/14 vs 2/14 · 42/42 · 9/9 vs 6/9 |
| 1:06 | Get started | คำสั่งติดตั้ง + ลิงก์ repo |

## แก้แล้วเรนเดอร์ใหม่

แอนิเมชันทั้งหมดอยู่ใน `promo.html` (ทุกอย่างคำนวณจากเวลา `render(t)` ไม่มี CSS animation
จึงเรนเดอร์ทีละเฟรมได้ตรงเป๊ะ) — เปิดใน browser แล้วคลิกหนึ่งครั้งเพื่อดูแบบเล่นจริงพร้อมเพลง
หรือเปิด `promo.html?still&t=30` เพื่อดูเฟรมเดียว ณ วินาทีที่ 30

ถ้าเลื่อนเวลาฉากใน `promo.html` ต้องเลื่อนจุดเดียวกันใน `music.py` ด้วย (เพลงล็อกจังหวะตัดฉากไว้ที่ 120 BPM)

```bash
cd docs/video
npm i playwright               # ใช้ Chromium ของ Playwright
pip install numpy scipy
python3 music.py && ffmpeg -y -i music.wav -b:a 192k music.mp3
# เรนเดอร์เป็น 4 ท่อนขนานกัน (ต้องมี ffmpeg ที่มี libx264 — หรือตั้ง FF=/path/to/ffmpeg)
node render.mjs 0 578 p0.mp4 & node render.mjs 578 1156 p1.mp4 & \
node render.mjs 1156 1734 p2.mp4 & node render.mjs 1734 2310 p3.mp4 & wait
printf "file 'p0.mp4'\nfile 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -i music.wav -c:v copy -c:a aac -b:a 224k \
  -shortest -movflags +faststart ugt-claude-platform-promo.mp4
rm p?.mp4 list.txt music.wav
```

ฟอนต์ใน `fonts/` (Kanit, IBM Plex Sans Thai, JetBrains Mono) เป็น SIL Open Font License จาก Google Fonts
