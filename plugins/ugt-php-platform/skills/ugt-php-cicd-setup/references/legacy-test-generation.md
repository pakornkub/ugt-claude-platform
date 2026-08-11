# Legacy Test Generation — optional M7 step (PHP)

> **นี่ไม่ใช่ขั้นตอนบังคับของ skill** — ทำเฉพาะโปรเจคที่ interview ข้อ 8
> ("ต้องการให้สร้าง test ครอบคลุมโค้ดเดิมไหม") ตอบ **ใช่** ค่า default ของข้อนี้
> คือ **ไม่** (สร้างแค่ `SmokeTest.php` พอให้ pipeline stage Unit Tests รันผ่าน
> ได้จริงโดยไม่แตะโค้ดเดิม).

## เมื่อไรทำ / เปิด session ที่ไหน

เริ่มขั้นนี้ **หลังจากไฟล์ deploy ทั้งชุดของ skill ตั้งเรียบร้อยแล้วเท่านั้น**
(Jenkinsfile / Dockerfile / compose / rules ติดตั้งและทดสอบผ่านแล้ว) —
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

## วิธีทำ — ไล่ตาม dependency graph จากใบไปหาราก

**อย่าเริ่มจาก entry point** (`public/index.php`, `routes/web.php`, มุมมอง
ผู้ใช้) — เพราะโมดูล entry point ดึง (`require`/`use`) โมดูลอื่นเกือบทั้งหมด
เขียน test ให้มันก่อนจะได้ mock ยาวเป็นหางว่าวและ test เปราะ (แก้ internal
นิดเดียวก็พัง). ทำกลับด้าน:

1. **สร้าง dependency graph** ของโปรเจค — class/namespace ไหน `use` อะไรบ้าง
   วิธีเร็วสุดคือให้ agent ไล่อ่าน `use` statement (namespace import) และ
   constructor-injected dependency ทุกไฟล์ใน `app/`/`src/` (เครื่องมือช่วยได้
   ถ้ามี เช่น `composer show --tree`, static analyzer ที่วาด dependency graph
   — แต่การอ่านโค้ดตรง ๆ ก็พอสำหรับโปรเจคขนาดกลาง)
2. **เรียงลำดับแบบ topological** — class **ใบ** (leaf — ไม่ depend on class
   อื่นในโปรเจคเลย หรือ depend แต่ standard library/vendor) มาก่อน class
   **ราก** (root — ไฟล์ที่ class อื่นจำนวนมาก depend เข้ามา, มักเป็น
   `Models/*.php`, `Repositories/*.php`, controller/entry point) มาสุดท้าย
   - ตัวอย่างลำดับทั่วไป: `Support/Formatter.php` (ใบ) →
     `Support/Validator.php` (ใบ) → `Services/PricingService.php` (depend on
     Support) → `Services/OrderService.php` (depend on
     Services/PricingService + Models) → `Models/Order.php` (ราก — ถูก
     depend จากแทบทุกที่) → `Http/Controllers/OrderController.php` (ราก
     สุดท้าย)
   - เหตุผลของลำดับนี้: test ของ class ใบไม่ต้อง mock อะไรเลยหรือ mock น้อย
     มาก (I/O ตรง ๆ) พอไล่ขึ้นไปถึง class ที่พึ่งพา class ใบ ก็ instantiate
     ของจริงได้เลย ไม่ต้อง mock ซ้ำ — mock เฉพาะจุดที่เป็น**ขอบระบบจริง**
     (ดูข้อ 4)
3. **หนึ่ง class = หนึ่งไฟล์ test** — `app/Services/PricingService.php` →
     `tests/Services/PricingServiceTest.php` (mirror path เดิม, ต่อท้าย
     ด้วย `Test` ตาม PHPUnit convention) ไม่รวมหลาย class ไว้ไฟล์เดียว เพื่อ
     ให้ diff ของแต่ละรอบ review ง่ายและ scope ชัดว่า commit นี้ล็อกพฤติกรรม
     ของ class ไหน
4. **Characterization test คือการจับพฤติกรรมปัจจุบันเป็นค่าคาดหวัง** ไม่ใช่
   เขียนตาม spec ที่ "ควรจะเป็น":
   - เรียก method จริงด้วย input ตัวแทน (edge case ที่เห็นในโค้ด เช่น string
     ว่าง, ค่าติดลบ, `null`) แล้ว **จดผลลัพธ์จริงที่ได้** (รวมถึง exception ที่
     throw จริงถ้ามี — เช็คด้วย `expectException()`) มาเป็น `assert` — ไม่ใช่
     เดาว่าควรได้อะไร
   - ถ้า method มี bug อยู่แล้ว (เช่น off-by-one, บวกภาษีผิดสูตร) test จะ
     assert ผลลัพธ์ที่ "ผิด" นั้น**ตามที่เป็นจริงในปัจจุบัน** — จุดประสงค์คือ
     กันไม่ให้ refactor ครั้งต่อไปเปลี่ยนพฤติกรรมโดยไม่รู้ตัว ไม่ใช่แก้ bug
     (ดูคำเตือนข้อ 1 ด้านล่าง — ห้ามข้ามขั้นตอน review เพราะเหตุนี้)
   - **Mock เฉพาะขอบระบบ** (I/O, DB, network, เวลาปัจจุบัน, filesystem,
     external API, session/cookie) — logic ภายในโปรเจคเรียกของจริงทั้งหมด
     ไม่ mock class ภายในโปรเจคเอง (mock internal class ทำให้ test ไม่จับ
     regression ของโค้ดที่ควรทดสอบจริง ๆ)
     - ตัวอย่างขอบที่ต้อง mock: `Illuminate\Support\Facades\DB::` /
       `PDO`/`PDOStatement`, `Carbon::now()`/`time()`, `file_get_contents`/
       filesystem write, `GuzzleHttp\Client`/`curl_exec`, queue/mail driver
     - เครื่องมือ: **PHPUnit built-in mock ก็พอ ไม่ต้องเพิ่ม composer package**
       — `$this->createMock(ClassName::class)` หรือ
       `$this->getMockBuilder(ClassName::class)->onlyMethods([...])->getMock()`
       แล้ว inject เข้า constructor (dependency injection ที่โค้ดเดิมมีอยู่
       แล้ว หรือปรับ constructor ให้ inject ได้ถ้ายังเป็น `new` ตรง ๆ ข้างใน
       — การปรับแบบนี้เป็น refactor ขั้นต่ำสุดที่จำเป็นเพื่อให้ test ได้ ไม่ใช่
       การเปลี่ยน behavior) — `composer-require-dev.md` ของ skill นี้ไม่มี
       mocking library แยกต่างหาก (เช่น Mockery) เพราะ PHPUnit's built-in
       mock builder พอสำหรับ characterization test ทั่วไป ถ้าโปรเจคมี
       edge case ที่ PHPUnit builtin ไม่พอ (เช่น mock static method /
       final class) ค่อยพิจารณาเพิ่ม `mockery/mockery` เป็นกรณีไป ไม่ใช่
       default
5. เขียน docstring/comment สั้น ๆ บนหัว test file บอกว่านี่คือ
   characterization test (ล็อกพฤติกรรมปัจจุบัน ไม่ใช่ spec ที่ตั้งใจ) กันคนอ่าน
   ทีหลังเข้าใจผิดว่าเป็น test แบบปกติ:

   ```php
   <?php
   // Characterization tests for app/Services/PricingService.php.
   // Locks CURRENT behavior (may include existing bugs) — see
   // references/legacy-test-generation.md before editing.

   use PHPUnit\Framework\TestCase;

   final class PricingServiceTest extends TestCase
   {
       // ...
   }
   ```

## จบแต่ละ class — รัน coverage แล้วรายงานตัวเลข

หลัง test file ของ class หนึ่งเสร็จ รันเจาะเฉพาะ class นั้นก่อน commit ต่อ
class ถัดไป (ไม่ต้องรอจบทั้งโปรเจคแล้วรันทีเดียว — จะแก้ยากถ้า class แรก ๆ
มีปัญหา):

```sh
vendor/bin/phpunit tests/Services/PricingServiceTest.php --coverage-text
```

`--coverage-text` โชว์รายงาน coverage แบบตัวหนังสือตรง terminal เลย (ไม่ต้อง
เปิด HTML report ทุกรอบ) — คำนวณจาก `<source>` ที่ตั้งไว้ใน `phpunit.xml`
(ทั้งโปรเจค ไม่ได้ narrow ตาม test file ที่รัน) ดังนั้นรายงานจะยาวและไฟล์อื่น
ที่ยังไม่มี test จะโชว์ 0% ปนอยู่ด้วย — สแกนหาบรรทัดของไฟล์ class ที่เพิ่งเขียน
test (`app/Services/PricingService.php`) ในรายงานเพื่อตัดสินใจว่าจะเพิ่ม case
ให้ class นี้อีกไหมก่อนไป class ถัดไป รายงานตัวเลข coverage ของแต่ละ class
กลับให้ทีมเห็นเป็นระยะ (ไม่ใช่รอสรุปทีเดียวตอนจบ) เช่น:

```
PricingServiceTest::testCalculateDiscountNegativeQty PASSED
PricingServiceTest::testCalculateDiscountZeroPrice PASSED
app/Services/PricingService.php  coverage: 87% (missing: 42-44, 61)
```

เมื่อไล่ครบทุก class แล้ว รันรวมทั้งชุดหนึ่งครั้งเพื่อดูภาพรวม — คำสั่งเดียว
กับที่ Jenkinsfile stage `Unit Tests` ใช้จริง (ได้ `clover.xml` +
`coverage/index.html` เหมือนที่ CI ใช้):

```sh
vendor/bin/phpunit --coverage-clover clover.xml --coverage-html coverage
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
