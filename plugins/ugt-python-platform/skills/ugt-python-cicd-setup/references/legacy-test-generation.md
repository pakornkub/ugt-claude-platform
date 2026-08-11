# Legacy Test Generation — optional M7 step

> **นี่ไม่ใช่ขั้นตอนบังคับของ skill** — ทำเฉพาะโปรเจคที่ interview ข้อ 8
> ("ต้องการให้สร้าง test ครอบคลุมโค้ดเดิมไหม") ตอบ **ใช่** ค่า default ของข้อนี้
> คือ **ไม่** (สร้างแค่ `tests/test_smoke.py` พอให้ pipeline stage Unit Tests
> รันผ่านได้จริงโดยไม่แตะโค้ดเดิม).

## เมื่อไรทำ / เปิด session ที่ไหน

เริ่มขั้นนี้ **หลังจากไฟล์ deploy ทั้งชุดของ skill ตั้งเรียบร้อยแล้วเท่านั้น**
(Jenkinsfile / Dockerfile / compose / rules ผ่าน `scripts/verify.mjs`) —
เหตุผลที่แยกลำดับ:

1. งานนี้เป็นงานคนละประเภท (เขียน test จำนวนมาก อ่านโค้ดเดิมทั้งโปรเจค)
   ต่างจากงาน setup pipeline (copy asset + แทน placeholder) — ปนกันในบท
   สนทนาเดียวทำให้ context ยาวเกินจำเป็นและติดตามยากว่าอะไรคือ config อะไรคือ
   test ที่ generate
2. ถ้า pipeline ยังไม่ผ่านตั้งแต่ Docker Build/Deploy การเสีย token ไล่ generate
   test ก่อนเป็นการลงทุนผิดจังหวะ — แก้ pipeline ให้เขียวก่อน แล้วค่อยเพิ่ม
   coverage
3. characterization test เป็นงาน **iterative + ต้องให้คนตรวจสอบระหว่างทาง**
   (ดู §คำเตือน) — เปิด session แยกทำให้ diff ของรอบนี้ review ได้อิสระจาก diff
   ของ pipeline setup

เปิด session ใหม่ แล้วเริ่มจากคำสั่งประมาณ "ไล่สร้าง characterization test ให้
โค้ดเดิมของโปรเจคนี้ตาม `references/legacy-test-generation.md`" — session นั้น
จะทำงานตามลำดับข้างล่าง

## วิธีทำ — ไล่ตาม import graph จากใบไปหาราก

**อย่าเริ่มจาก entry point** (`main.py`, `app/main.py`, มุมมองผู้ใช้) — เพราะ
โมดูล entry point import โมดูลอื่นเกือบทั้งหมด เขียน test ให้มันก่อนจะได้ mock
ยาวเป็นหางว่าวและ test เปราะ (แก้ internal นิดเดียวก็พัง). ทำกลับด้าน:

1. **สร้าง import graph** ของโปรเจค — โมดูลไหน import อะไรบ้าง วิธีเร็วสุดคือ
   ให้ agent ไล่อ่าน `import` / `from ... import` ทุกไฟล์ใน source tree
   (เครื่องมือช่วยได้ถ้ามี เช่น `pydeps --show-deps <package> --no-show`
   หรือ `python -c "import ast; ..."` สแกนเอง — แต่การอ่านโค้ดตรง ๆ ก็พอสำหรับ
   โปรเจคขนาดกลาง)
2. **เรียงลำดับแบบ topological** — โมดูล **ใบ** (leaf — ไม่ import โมดูลอื่น
   ในโปรเจคเลย หรือ import แต่ standard library/third-party) มาก่อน โมดูล
   **ราก** (root — ไฟล์ที่โมดูลอื่นจำนวนมาก import เข้ามา, มักเป็น
   `models.py`, `db.py`, entry point) มาสุดท้าย
   - ตัวอย่างลำดับทั่วไป: `utils/formatting.py` (ใบ) →
     `utils/validators.py` (ใบ) → `services/pricing.py` (import utils) →
     `services/order.py` (import services/pricing + models) →
     `models.py` (ราก — ถูก import จากแทบทุกที่) → `app/main.py` (ราก
     สุดท้าย)
   - เหตุผลของลำดับนี้: test ของโมดูลใบไม่ต้อง mock อะไรเลยหรือ mock น้อยมาก
     (I/O ตรง ๆ) พอไล่ขึ้นไปถึงโมดูลที่พึ่งพาโมดูลใบ ก็ import ของจริงได้เลย
     ไม่ต้อง mock ซ้ำ — mock เฉพาะจุดที่เป็น**ขอบระบบจริง** (ดูข้อ 4)
3. **หนึ่งโมดูล = หนึ่งไฟล์ test** — `app/services/pricing.py` →
   `tests/services/test_pricing.py` (mirror path เดิม) ไม่รวมหลายโมดูลไว้ไฟล์
   เดียว เพื่อให้ diff ของแต่ละรอบ review ง่ายและ scope ชัดว่า commit นี้ล็อก
   พฤติกรรมของโมดูลไหน
4. **Characterization test คือการจับพฤติกรรมปัจจุบันเป็นค่าคาดหวัง** ไม่ใช่
   เขียนตาม spec ที่ "ควรจะเป็น":
   - เรียกฟังก์ชัน/method จริงด้วย input ตัวแทน (edge case ที่เห็นในโค้ด เช่น
     ค่าว่าง, ค่าติดลบ, ค่า None) แล้ว **จดผลลัพธ์จริงที่ได้** (รวมถึง exception
     ที่ throw จริงถ้ามี) มาเป็น `assert` — ไม่ใช่เดาว่าควรได้อะไร
   - ถ้าฟังก์ชันมี bug อยู่แล้ว (เช่น off-by-one, บวกภาษีผิดสูตร) test
     จะ assert ผลลัพธ์ที่ "ผิด" นั้น**ตามที่เป็นจริงในปัจจุบัน** — จุดประสงค์คือ
     กันไม่ให้ refactor ครั้งต่อไปเปลี่ยนพฤติกรรมโดยไม่รู้ตัว ไม่ใช่แก้ bug
     (ดูคำเตือนข้อ 1 ด้านล่าง — ห้ามข้ามขั้นตอน review เพราะเหตุนี้)
   - **Mock เฉพาะขอบระบบ** (I/O, DB, network, เวลาปัจจุบัน, random, filesystem,
     external API) — logic ภายในโปรเจคเรียกของจริงทั้งหมด ไม่ mock function
     ภายในโปรเจคเอง (mock internal function ทำให้ test ไม่จับ regression ของ
     โค้ดที่ควรทดสอบจริง ๆ)
     - ตัวอย่างขอบที่ต้อง mock: `requests.get(...)`, DB session
       (`sqlalchemy.orm.Session`), `datetime.now()`/`time.time()`,
       `open()`/filesystem write, `subprocess.run`, queue/message broker client
     - เครื่องมือ: `unittest.mock.patch` / `pytest-mock` (fixture `mocker`) —
       patch ที่**จุดที่ใช้งาน** ไม่ใช่จุดที่นิยาม (`patch("app.services.order.requests.get")`
       ไม่ใช่ `patch("requests.get")`) ตาม convention มาตรฐานของ
       `unittest.mock`
5. เขียน docstring/comment สั้น ๆ บนหัว test file บอกว่านี่คือ
   characterization test (ล็อกพฤติกรรมปัจจุบัน ไม่ใช่ spec ที่ตั้งใจ) กันคนอ่าน
   ทีหลังเข้าใจผิดว่าเป็น test แบบปกติ:

   ```python
   """Characterization tests for app/services/pricing.py.
   Locks CURRENT behavior (may include existing bugs) — see
   references/legacy-test-generation.md before editing.
   """
   ```

## จบแต่ละโมดูล — รัน coverage แล้วรายงานตัวเลข

หลัง test file ของโมดูลหนึ่งเสร็จ รันเจาะเฉพาะโมดูลนั้นก่อน commit ต่อโมดูล
ถัดไป (ไม่ต้องรอจบทั้งโปรเจคแล้วรันทีเดียว — จะแก้ยากถ้าโมดูลแรก ๆ มีปัญหา):

```sh
.venv/bin/pytest tests/services/test_pricing.py --cov=app.services.pricing --cov-report=term-missing
```

`--cov-report=term-missing` โชว์เลขบรรทัดที่ยังไม่ถูกทดสอบตรง terminal เลย
(ไม่ต้องเปิด HTML report ทุกรอบ) — ใช้ตัดสินใจว่าจะเพิ่ม case ให้โมดูลนี้อีก
ไหมก่อนไปโมดูลถัดไป รายงานตัวเลข coverage ของแต่ละโมดูลกลับให้ทีมเห็นเป็นระยะ
(ไม่ใช่รอสรุปทีเดียวตอนจบ) เช่น:

```
tests/services/test_pricing.py::test_calculate_discount_negative_qty PASSED
tests/services/test_pricing.py::test_calculate_discount_zero_price PASSED
app/services/pricing.py  coverage: 87% (missing: 42-44, 61)
```

เมื่อไล่ครบทุกโมดูลแล้ว รันรวมทั้งชุดหนึ่งครั้งเพื่อดูภาพรวม (path ตาม
`[tool.pytest.ini_options]` ใน `pyproject.toml` — ได้ `coverage.xml` +
`coverage/index.html` เหมือนที่ CI ใช้):

```sh
.venv/bin/pytest
```

## คำเตือนตายตัว 2 ข้อ (ต้องบอกผู้ใช้ทุกครั้งที่ทำขั้นนี้)

1. **Test ชุดนี้ล็อกพฤติกรรมปัจจุบันไว้ทั้งหมด รวมถึง bug ที่มีอยู่แล้วด้วย**
   — มันไม่ใช่หลักฐานว่าโค้ดถูกต้อง แค่เป็นหลักฐานว่าพฤติกรรม**ไม่เปลี่ยน**
   ระหว่าง refactor เท่านั้น **ทีมต้อง review ทุกไฟล์ก่อน commit** โดยเฉพาะ
   จุดที่ assert ค่าที่ดู "แปลก" — อาจเป็น bug จริงที่ควรถูก track เป็น issue
   แยกต่างหาก (ไม่ใช่แก้เงียบ ๆ ในรอบนี้ เพราะจะทำให้ characterization test
   ไม่ตรงกับพฤติกรรม production ที่รันอยู่จริง)
2. **นี่ไม่ใช่เงื่อนไขของ pipeline** — Quality Gate (`new_coverage ≥ 60%`) นับ
   เฉพาะ**โค้ดใหม่**ในแต่ละ PR (ตาม `sonar.newCode` ของ SonarQube) เท่านั้น
   ไม่นับ coverage สะสมของทั้งโปรเจค ต่อให้ทำขั้นนี้เสร็จครบ 100% ของโค้ดเดิม
   ก็ไม่ได้แปลว่า Quality Gate จะผ่านง่ายขึ้นสำหรับ PR ถัดไป — ประโยชน์ของขั้น
   นี้คือกัน regression ตอน refactor โค้ดเดิม ไม่ใช่ทางลัดผ่าน gate
