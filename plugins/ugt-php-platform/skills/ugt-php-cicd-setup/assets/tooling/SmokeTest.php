<?php
// smoke test ขั้นต่ำให้ pipeline รันผ่าน — ไม่ใช่ test suite จริง
// โค้ดใหม่หลังจากนี้ต้องมี test คู่กันตาม Quality Gate (coverage โค้ดใหม่ ≥ 60%)
use PHPUnit\Framework\TestCase;

final class SmokeTest extends TestCase
{
    public function testEntryPointExists(): void
    {
        $this->assertFileExists(__DIR__ . '/../__ENTRY_FILE__');
    }
}
