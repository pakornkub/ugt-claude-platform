# Subpath หลัง reverse proxy

ตั้งค่าแอปเมื่อโปรเจคอยู่หลัง reverse-proxy subpath (interview ข้อ 3 = ใช่ ใน SKILL.md §4)

เนื้อหา: ค่าที่ต้องตั้งต่อ shape · แอป CI3/legacy ที่อ้าง asset แบบ relative (สูตร inline redirect)

## ค่าที่ต้องตั้งต่อ shape

คำตอบ "อยู่หลัง subpath" ต้องกลายเป็นค่า env ฝั่งแอปจริง ๆ ในขั้น setup (SKILL.md §5.3)
ไม่ใช่แค่จดไว้: เพิ่มลง `.env`/`.env.dev` (SKILL.md §5.5) ให้ตรง shape —

- **Laravel**: `APP_URL=<URL เต็มรวม path>` (+ `ASSET_URL` เมื่อ asset โดน
  proxy ตัด path)
- **CodeIgniter 4**: `app.baseURL=<URL เต็มรวม path>/`
- **WordPress**: `WP_HOME` + `WP_SITEURL` = URL เต็มรวม path
- CI3/legacy: `base_url` ใน config ของโปรเจคเอง · แอป legacy ที่อ้าง asset
  แบบ **relative** (ไม่มี config กลางให้แก้) → วาง inline redirect เติม
  trailing slash เป็นสิ่งแรกใน `<head>` ของ entry/header ร่วม — สูตรพิสูจน์
  แล้วในหัวข้อถัดไป (เปิดผ่าน `…/app` ไม่มี `/` ท้าย
  แล้ว asset relative หลุด subpath 404 ทั้งหน้า)

แล้วเช็คของจริงตาม checklist: เปิดแอป**ผ่าน URL เต็มหลัง proxy** ไม่ใช่
`localhost:port` (อย่างหลังผ่านเสมอแม้ config ผิด)

## แอปที่อ้าง asset แบบ relative (CI3/legacy)

Framework ที่มี config กลางแก้ตามหัวข้อบน (Laravel `APP_URL`, CI4
`app.baseURL`, WordPress `WP_HOME`/`WP_SITEURL`, CI3 `base_url`) — หัวข้อนี้
สำหรับแอป legacy ที่อ้าง asset แบบ **relative** (`href="style.css"`,
`src="assets/x.png"`) ซึ่งไม่มี config ให้แก้

**อาการ**: เปิดผ่าน proxy ที่ `https://host/app` (ไม่มี `/` ท้าย) แล้ว
CSS/JS/รูป 404 ทั้งหน้า แต่เปิด `https://host/app/` (มี `/`) ปกติ — browser
resolve URL relative จาก path โดยตัด segment สุดท้ายทิ้ง: ที่ `/app` ตัด `app`
ได้ `/style.css` (หลุด subpath) · ที่ `/app/` ได้ `/app/style.css` ถูกต้อง

**ทำไมแก้ฝั่ง server ไม่ได้**: หลัง proxy ที่ strip prefix คอนเทนเนอร์เห็น path
เป็น `/` ไปแล้ว — redirect ฝั่ง Apache (DirectorySlash) ชี้ไปยัง path ที่ตัวเอง
เห็น จึงพา browser หลุด prefix ไปเลย · ฝ่ายเดียวที่เห็น URL เต็มจริงคือ browser

**สูตร (พิสูจน์กับ pilot `ugt-mscpl-ana` แล้ว)** — inline script บรรทัดเดียว
วางเป็น**สิ่งแรกใน `<head>` ก่อน `<link>`/`<script>` ทุกตัว** ของ entry/header
ที่ทุกหน้า include ร่วมกัน:

```html
<script>var p=location.pathname;if(!p.endsWith("/")&&p.split("/").pop().indexOf(".")<0)location.replace(p+"/"+location.search+location.hash)</script>
```

- เติม `/` เฉพาะเมื่อ segment สุดท้าย**ไม่มีนามสกุลไฟล์** — URL อย่าง
  `…/page.php` ไม่โดนแตะ (relative ของมัน resolve ถูกอยู่แล้ว เพราะ browser
  ตัดแค่ชื่อไฟล์)
- ต้องอยู่ก่อน asset ทุกตัว เพื่อ redirect ก่อนเสีย request ไปโหลดของผิด path
- `<base href>` ใช้แทนได้แต่ต้อง hardcode prefix ซึ่งต่างกันระหว่าง dev
  (ไม่มี proxy) กับ prod — สูตร script ไม่ผูกกับ prefix จึงใช้ไฟล์เดียวกันได้
  ทุก environment
