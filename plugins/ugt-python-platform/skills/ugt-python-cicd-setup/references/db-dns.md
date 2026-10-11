# DNS: ชื่อ host สั้นของ DB มัก resolve ไม่ได้จากในคอนเทนเนอร์

วินิจฉัยและแก้อาการ connect DB ค้างจน timeout ทั้งที่ `DATABASE_URL` ถูกและ host ต่อได้ปกติ

อาการ: connect DB ค้างจนครบ timeout (เช่น `Login timeout expired` ของ SQL Server
หรือ `could not translate host name` ของ psycopg) ทั้งที่ค่าใน `DATABASE_URL`
ถูกต้อง และ **เปิดจากเครื่อง host เดียวกันได้ปกติ**

สาเหตุ: คอนเทนเนอร์ใช้ DNS resolver ของ Docker ไม่ใช่ของเครื่อง host — ชื่อสั้น
อย่าง `SQLSRV01` ที่ resolve ได้บน Windows/โดเมนองค์กร (ผ่าน DNS suffix search
list ของเครื่อง) มักไม่มีความหมายในเน็ตเวิร์กของคอนเทนเนอร์ (ยืนยันจากโปรเจค
pilot ฝั่ง PHP 2026-08 — กลไกเดียวกันทุกภาษา)

ทางแก้ เรียงตามลำดับที่ควรลอง:

1. **ใช้ FQDN** (`SQLSRV01.corp.example.co.th`) แทนชื่อสั้น — สะอาดสุด ไม่ผูก IP
2. **ใช้ IP ตรง ๆ** — ได้ผลแน่นอน แต่ต้องตามแก้เมื่อ DB ย้ายเครื่อง
3. **ชี้ DNS ขององค์กรให้คอนเทนเนอร์** ใน compose ทั้งสองไฟล์:
   ```yaml
   dns:
     - 10.x.x.x   # DNS ขององค์กร
   ```

ตรวจก่อนสรุปว่าเป็นเรื่อง credential — ยิงจากในคอนเทนเนอร์จริง:

```bash
docker exec <container> getent hosts <ชื่อ host ของ DB>
```

ไม่มีผลลัพธ์ = ปัญหา DNS ไม่ใช่รหัสผ่าน · **[BATCH] เจอบ่อยกว่า** เพราะ job รัน
แล้วจบ ไม่มี healthcheck คอยส่งสัญญาณว่าต่อ DB ไม่ได้
