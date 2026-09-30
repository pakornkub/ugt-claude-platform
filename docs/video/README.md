# วิดีโอโปรโมต UGT Claude Platform

> **Status:** Living · **Date:** 2026-09-30 · **Applies-to:** ugt-core 2.13.2 · ugt-nextjs-platform 4.63.5
> **Last-reviewed:** 2026-09-30 — ตัวเลขเวอร์ชัน/ผล eval/รายชื่อตัวช่วยในวิดีโอตรงกับ README.md ณ วันที่นี้

มีหกเวอร์ชัน:

| ไฟล์ | สไตล์ | ความยาว |
| --- | --- | --- |
| [`corporate/ugt-claude-platform-corporate.mp4`](corporate/ugt-claude-platform-corporate.mp4) | **Corporate film** — motion graphic ทางการ ใช้ design system ขององค์กรเอง (token/ฟอนต์จาก `contracts/design.md`) เล่าภาพรวม + demo + มาตรฐานของ stack | 79 วินาที |
| [`sizzle/ugt-claude-platform-sizzle.mp4`](sizzle/ugt-claude-platform-sizzle.mp4) | **Sizzle reel** — ตัดภาพเร็วตามจังหวะ ผสมช็อตเมือง 3D + ฉาก CM โทนสว่าง สำหรับเปิดงาน/ประชุม | 39 วินาที |
| [`cm/ugt-claude-platform-cm.mp4`](cm/ugt-claude-platform-cm.mp4) | **Trailer สไตล์โฆษณาญี่ปุ่น (CM)** โทนสว่างตาม repo — มาสคอตการ์ตูน chibi, ตัดฉากตามจังหวะเพลง 128 BPM | 61 วินาที |
| [`explainer/ugt-claude-platform-explainer.mp4`](explainer/ugt-claude-platform-explainer.mp4) | **Tech explainer 3D** — หน้าจอโปรแกรมจริงลอยในอวกาศ เล่าตามขั้นตอนการทำงานจริงของ plugin + คำแปลเป็นภาษาคน | 86 วินาที |
| [`story/ugt-claude-platform-story.mp4`](story/ugt-claude-platform-story.mp4) | แอนิเมชันเล่าเรื่อง 3D (เมือง = องค์กร) โทนสว่าง ฟอนต์และสีเดียวกับ `docs/web/index.html` | 72 วินาที |
| [`ugt-claude-platform-promo.mp4`](ugt-claude-platform-promo.mp4) | motion graphic โทนมืดแบบ tech ทีละฉาก (รุ่นแรก) | 77 วินาที |

ทั้งหมด 1920×1080 · 30fps · มีเพลงประกอบที่สังเคราะห์ด้วยโค้ด (ไม่ติดลิขสิทธิ์)

## Corporate film (`corporate/`)

ใช้ **design system ขององค์กร** ตรง ๆ: สี = token oklch จาก `docs/web/design-preview.html`,
ฟอนต์ Inter + Noto Sans Thai (400/500/600) + Geist Mono, สถานะ 6 สีพร้อมไอคอน, primary ใช้เป็นจุดเน้นเท่านั้น
— ตามกติกาใน `plugins/ugt-core/contracts/design.md` · เพลง 100 BPM (1 ห้อง = 2.4 วินาที) บทละ 3–5 ห้อง

| บท | เวลา | เนื้อหา · ที่มา |
| --- | --- | --- |
| 01 ภาพรวม | 0:00 | หัวข้อ + stack ที่รองรับ · README |
| 02 ความท้าทาย | 0:10 | ตั้งค่าไม่เหมือนกัน · มาตรฐานอยู่ในหัวคน · AI ไม่รู้กติกา |
| 03 สถาปัตยกรรม | 0:17 | ugt-core → stack platform → bundle · README, marketplace.json |
| 04 Demo | 0:26 | ประโยคเดียว → ตรวจ → ถาม → ติดตั้งตามลำดับ → verify → ส่งมอบ · `ugt-nextjs-full-setup` |
| 05 Design system | 0:38 | ฟอนต์ · primary · สถานะ 6 สี · ตารางตัวอย่าง · `contracts/design.md` |
| 06 Identity · Database | 0:48 | Keycloak OIDC + PKCE · session 8 ชม. · RBAC · กติกาตั้งชื่อ · audit columns · `contracts/auth.md`, `database.md` |
| 07 Delivery | 0:58 | Pipeline 10 ขั้น · Quality Gate · branch model · `contracts/cicd.md` |
| 08 ผลลัพธ์ | 1:07 | 34/34 vs 18/34 · 14/14 vs 2/14 · 9/9 vs 6/9 → คำสั่งติดตั้ง |

ข้อมูลในตารางคำขอลาเป็นตัวอย่างสมมติ · แถว "branch อื่น → ตรวจเท่านั้น" อนุมานจากกติกาที่ว่า
Docker Build/Deploy รันเฉพาะ `main`/`develop`

```bash
(cd docs/video/corporate && npm i) && pip install numpy scipy
npx http-server -p 8124 docs/video &            # เปิด http://127.0.0.1:8124/corporate/corp.html
cd docs/video/corporate && python3 music.py && ffmpeg -y -i music.wav -b:a 192k music.mp3
node render.mjs 0 594 p0.mp4 & node render.mjs 594 1188 p1.mp4 & \
node render.mjs 1188 1782 p2.mp4 & node render.mjs 1782 2376 p3.mp4 & wait
printf "file 'p0.mp4'\nfile 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -i music.wav -c:v libx264 -crf 20 -pix_fmt yuv420p \
  -af loudnorm=I=-16:TP=-1.5 -c:a aac -b:a 224k -shortest -movflags +faststart ugt-claude-platform-corporate.mp4
```

## Sizzle reel (`sizzle/`)

ไม่ได้ตัดจาก MP4 เดิม — `sizzle.html` ฝัง `../story/story.html?embed` กับ `../cm/cm.html?embed`
เป็น iframe แล้วสั่ง `render(t)` ของแต่ละตัวตามรายการช็อต (`S` = `[beatเริ่ม, จำนวน beat, แหล่ง,
เวลาต้นทาง, ความเร็ว, คำใหญ่, สไตล์, กล้องเริ่ม, กล้องจบ]`) ช็อตเมือง 3D ใส่กล้องเองได้ผ่าน
`window.camOverride` · โหมด `?embed` ซ่อน UI ของหน้าเดิมทั้งหมด

| beat | เวลา | ช่วง |
| --- | --- | --- |
| 0–7 | 0:00 | Cold open "โค้ด · คนละ · แบบ!" → เมืองรก |
| 8–15 | 0:04 | "จนกระทั่ง…" → กล่อง UGT ตก → เปิดตัว |
| 16–31 | 0:08 | Build — ติดตั้ง, ประโยคเดียว, สถานี Database/Quality/Design/Auth (ช็อตละ 1 beat), POINT ①–⑥ + ALL GREEN (ช็อตละครึ่ง beat), ตึกบินขึ้น |
| 32–47 | 0:15 | Drop — เมืองเปลี่ยนเป็นมาตรฐาน "มาตรฐาน · เดียวกัน · ทั้ง · องค์กร!" + ทีม, หอความรู้, 100%, ตัวช่วย 16 ตัว |
| 48–63 | 0:22 | Hero shot — กล้องบินขึ้นเหนือเมือง + โลโก้ประกอบตัว |
| 64–80 | 0:30 | End card + jingle U・G・T ♪ |

```bash
(cd docs/video/story && npm i) && (cd docs/video/sizzle && npm i) && pip install numpy scipy
npx http-server -p 8124 docs/video &            # เปิด http://127.0.0.1:8124/sizzle/sizzle.html เพื่อดู
cd docs/video/sizzle && python3 music.py && ffmpeg -y -i music.wav -b:a 192k music.mp3
node render.mjs 0 293 p0.mp4 & node render.mjs 293 585 p1.mp4 & \
node render.mjs 585 878 p2.mp4 & node render.mjs 878 1170 p3.mp4 & wait
printf "file 'p0.mp4'\nfile 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -i music.wav -c:v libx264 -crf 21 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.2 -c:a aac -b:a 224k -shortest -movflags +faststart ugt-claude-platform-sizzle.mp4
```

ถ้าแก้ `story/story.html` หรือ `cm/cm.html` ช็อตใน sizzle จะเปลี่ยนตามด้วย — เรนเดอร์ sizzle ใหม่ทุกครั้งที่แก้สองไฟล์นั้น

## เวอร์ชัน CM ญี่ปุ่น (`cm/`)

เพลง J-pop 128 BPM ใช้คอร์ด "王道進行" (F–G–Em–Am) — ทุกฉากกำหนดเวลาเป็น **ห้อง/จังหวะ**
(`T(bar, beat)` ใน `cm.html` และ `music.py` ใช้สูตรเดียวกัน) ภาพกับเสียงจึงตรงกันเสมอ

| ห้อง | เวลา | ฉาก |
| --- | --- | --- |
| 1–2 | 0:00 | Hook "ทีม dev ทุกคน ต้องเคยเจอ…!" |
| 3–6 | 0:04 | ปัญหา 4 ฉาก ฉากละห้อง + ตรา NG ตบลงจังหวะที่ 3 |
| 7 | 0:11 | เพลงหยุด "แต่ถ้ามี…" → น้อง UGT ตกลงมา |
| 8–9 | 0:13 | เปิดตัว UGT Claude Platform |
| 10–11 | 0:17 | ติดตั้ง 3 บรรทัด |
| 12–13 | 0:21 | สั่งงานแค่ประโยคเดียว |
| 14–19 | 0:24 | POINT ① ตรวจของเดิม ② ถามครั้งเดียว ③ ติดตั้งตามลำดับ ④ ดีไซน์เดียวกัน ⑤ รุ่นพี่คอยเตือน ⑥ ทีมจำงานต่อได้ |
| 20–21 | 0:36 | verify ✔ ทุกโมดูล → ALL GREEN |
| 22–24 | 0:39 | ผลวัดจริง 34/34 vs 18/34 · 14/14 · 9/9 |
| 25–26 | 0:45 | สติกเกอร์ตัวช่วย 16 ตัว (ตัวละโน้ตเขบ็ต) |
| 27–28 | 0:49 | ทั้งทีมทำงานต่อกันลื่นไหล |
| 29–32 | 0:53 | End card + jingle "U・G・T ♪" |

มาสคอต (น้องเดฟ · เพื่อนร่วมทีม · น้อง UGT) วาดด้วย SVG ใน `cm/mascots.js` —
`dev/mate/ugt({ expr, pose, t })` มี 6 สีหน้า × 7 ท่า ดูทั้งหมดได้ที่ `cm/lineup.html`
ไฟล์ในโฟลเดอร์นี้ใช้ ES module จึงต้องเปิดผ่าน local server:

```bash
cd docs/video/cm
npm i && pip install numpy scipy
npx http-server -p 8123 . &          # แล้วเปิด http://127.0.0.1:8123/cm.html (คลิกเพื่อเล่นพร้อมเพลง)
python3 music.py && ffmpeg -y -i music.wav -b:a 192k music.mp3
node render.mjs 0 462 p0.mp4 & node render.mjs 462 924 p1.mp4 & \
node render.mjs 924 1386 p2.mp4 & node render.mjs 1386 1845 p3.mp4 & wait
printf "file 'p0.mp4'\nfile 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -i music.wav -c:v libx264 -crf 21 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.2 -c:a aac -b:a 224k -shortest -movflags +faststart ugt-claude-platform-cm.mp4
```

## เวอร์ชัน tech explainer (`explainer/`)

กล้องบินผ่านแผงหน้าจอ (HTML ที่วางในพื้นที่ 3D ด้วย `CSS3DRenderer`) บนพื้นหลัง WebGL —
ข้อความบนจอดึงจากของจริงใน repo: ลำดับติดตั้งและเหตุผลจาก `ugt-nextjs-full-setup`,
สิ่งที่ตรวจเจอก่อนติดตั้ง (SQLite ของ prototype / login ปลอม / UI เดิม), ตัวอย่างกับดัก
`$queryRaw` + `startOfDay` → `toLocalYmd` จาก `ugt-nextjs-pitfalls`, และผล evals ใน README

| เวลา | ช่วง |
| --- | --- |
| 0:00 | ปัญหา — AI เขียนโค้ดเร็วแต่ไม่รู้กติกา (404 เฉพาะ production, วันที่เลื่อน, Quality Gate แดง, UI ไม่เหมือนกัน) |
| 0:07 | ติดตั้ง 3 คำสั่ง → เครือข่ายตัวช่วย 16 ตัวติดไฟ |
| 0:15 | สั่งงานประโยคเดียว |
| 0:21 | ตรวจของเดิมก่อน (สแกนไฟล์ → สิ่งที่เจอ) |
| 0:29 | ถามครั้งเดียว (ชื่อโปรเจค · login · อีเมล · แนบไฟล์) |
| 0:35 | ติดตั้งตามลำดับ Database → Quality → Design → Auth → Mail → [Upload ข้าม] → CI/CD พร้อมเหตุผลที่สลับไม่ได้ |
| 0:52 | `verify.mjs` ผ่านทุกโมดูล → `docs/admin-handoff.md` |
| 0:58 | pitfalls เตือนกับดักวันที่เลื่อน แล้วแก้ก่อนเขียนเสร็จ |
| 1:08 | `/ugt-handoff` → session หน้า / เพื่อนร่วมทีมทำต่อได้ |
| 1:15 | ผลวัดจริง 34/34 vs 18/34 · 14/14 vs 2/14 · 9/9 vs 6/9 |
| 1:20 | คำสั่งติดตั้ง + ลิงก์ repo |

แก้ข้อความ/เวลาได้ใน `explainer/explainer.html` (`CK` = กล้อง, `CAPS` = คำบรรยาย, `CH` = ชื่อบท)
แล้วเรนเดอร์ใหม่ด้วยขั้นตอนเดียวกับเวอร์ชันเล่าเรื่องด้านล่าง (86 วินาที = 2580 เฟรม แบ่ง 4 ท่อน
`0–645 / 645–1290 / 1290–1935 / 1935–2580`)

## เวอร์ชันเล่าเรื่อง (`story/`)

เมือง = องค์กร · ตึกแต่ละหลัง = โปรเจค · กล้องบินต่อเนื่องตลอดเรื่อง ไม่มีการตัดฉากแบบสไลด์

| เวลา | เกิดอะไรขึ้น |
| --- | --- |
| 0:00 | developer นั่งทำงาน กล้องถอยออกเห็นเมืองที่ตึกคนละทรง คนละสี เอียง มีหมุดเตือนสีแดง ตึกหนึ่งโยกจนชิ้นส่วนหล่น |
| 0:08 | พิมพ์ `/plugin install ugt-nextjs-standard-superpowers@ugt` → กล่อง UBE ลงมาตามลำแสง แล้วกางออกเป็นสายพาน 5 สถานี |
| 0:13 | พูดประโยคเดียว "ทำให้โปรเจคนี้ deploy ได้ตามมาตรฐานบริษัทหน่อย" → แท่นว่างวางบนสายพาน |
| 0:20 | Database (ฐานราก + ถังข้อมูล) → Quality (นั่งร้าน + เลเซอร์สแกน ✓test ✓lint) → Design (ตึกมาตรฐานโผล่ขึ้น) → Auth (ประตู + โดมป้องกัน) → CI/CD (ไฟ 3 ดวง แล้วตึกบินขึ้น) |
| 0:40 | ตึกลงจอดในเมือง "verify ALL GREEN · docs/admin-handoff.md → ทีม DevOps" |
| 0:42 | คลื่นแผ่ออกจากตึกใหม่ ตึกรกทั้งเมืองเปลี่ยนเป็นมาตรฐานเดียวกันทีละหลัง |
| 0:50 | หอความรู้ `/ugt-handoff` โผล่ขึ้น เชื่อมทุกตึก เพื่อนร่วมทีมเดินมารับโน้ตไปทำต่อ |
| 0:56 | ผลวัดจริง 34/34 vs 18/34 · 14/14 vs 2/14 · 9/9 vs 6/9 |
| 1:02 | end card: คำสั่งติดตั้ง + ลิงก์ repo |

### แก้แล้วเรนเดอร์ใหม่

ทุกอย่างอยู่ใน `story/story.html` — ฉาก 3D, ตัวละคร, กล้อง (`CK` = keyframe กล้อง), คำบรรยาย (`CAPS`)
คำนวณจากเวลาใน `render(t)` ล้วน ๆ จึงเรนเดอร์ทีละเฟรมได้ตรงเป๊ะ · เปิดด้วย local server
(เช่น `npx http-server docs/video/story`) แล้วคลิกหนึ่งครั้งเพื่อดูแบบเล่นจริงพร้อมเพลง หรือ
`story.html?still&t=30` เพื่อดูเฟรมเดียว — three.js โหลดจาก jsDelivr ผ่าน import map

ถ้าเลื่อนเวลาเหตุการณ์ใน `story.html` ต้องเลื่อนเสียงประกอบจุดเดียวกันใน `music.py` ด้วย

```bash
cd docs/video/story
npm i && pip install numpy scipy
python3 music.py && ffmpeg -y -i music.wav -b:a 192k music.mp3
# WebGL เรนเดอร์ด้วย SwiftShader (CPU) ~0.5 วินาที/เฟรม — แบ่ง 4 ท่อนขนานกัน
node render.mjs 0 540 p0.mp4 & node render.mjs 540 1080 p1.mp4 & \
node render.mjs 1080 1620 p2.mp4 & node render.mjs 1620 2160 p3.mp4 & wait
printf "file 'p0.mp4'\nfile 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -i music.wav -c:v copy -af loudnorm=I=-15:TP=-1.2 \
  -c:a aac -b:a 224k -shortest -movflags +faststart ugt-claude-platform-story.mp4
rm p?.mp4 list.txt music.wav
```

ฟอนต์ใน `story/fonts/` (Inter, Noto Sans Thai, Cascadia Code) เป็น SIL Open Font License จาก Google Fonts

## เวอร์ชัน motion graphic (รุ่นแรก)

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

แอนิเมชันอยู่ใน `promo.html` (หลักการเดียวกัน: `render(t)` ไม่มี CSS animation) —
เปิดใน browser แล้วคลิกหนึ่งครั้ง หรือ `promo.html?still&t=30`

```bash
cd docs/video
npm i playwright
pip install numpy scipy
python3 music.py && ffmpeg -y -i music.wav -b:a 192k music.mp3
node render.mjs 0 578 p0.mp4 & node render.mjs 578 1156 p1.mp4 & \
node render.mjs 1156 1734 p2.mp4 & node render.mjs 1734 2310 p3.mp4 & wait
printf "file 'p0.mp4'\nfile 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -i music.wav -c:v copy -c:a aac -b:a 224k \
  -shortest -movflags +faststart ugt-claude-platform-promo.mp4
rm p?.mp4 list.txt music.wav
```

ฟอนต์ใน `fonts/` (Kanit, IBM Plex Sans Thai, JetBrains Mono) เป็น SIL Open Font License จาก Google Fonts
