<?php
// org /api/health — 200 healthy / 503 degraded · ห้ามใส่ version/commit · ไม่ต้อง login
declare(strict_types=1);
$ok = true;

// [DB] โปรเจคที่มี database ให้ยกเลิกคอมเมนต์บล็อกนี้ — health ที่ไม่แตะ dependency
// จริงเลยบอกได้แค่ "php ยังรันอยู่" ซึ่งเขียวตลอดแม้ DB ล่ม (สเตจ Deploy poll
// healthcheck ตัวนี้เป็นด่านสุดท้ายก่อนประกาศว่า deploy สำเร็จ)
//
// try {
//     // SQL Server: LoginTimeout เป็น DSN parameter — **ห้ามใช้ PDO::ATTR_TIMEOUT**
//     // เพราะ pdo_sqlsrv เมินค่านั้นในเฟส connect แล้วค้างยาวเกิน --timeout=10s ของ
//     // HEALTHCHECK ทำให้ container ค้างสถานะ "starting" แทนที่จะ fail เร็ว ๆ
//     // (ยืนยันจากโปรเจค pilot 2026-08 — ยิงใส่ host ที่เข้าไม่ถึง)
//     $dsn = 'sqlsrv:Server=' . getenv('DB_SERVER') . ';Database=' . getenv('DB_DATABASE')
//          . ';TrustServerCertificate=1;LoginTimeout=5';
//     // MySQL/MariaDB ใช้ PDO::ATTR_TIMEOUT ได้ตามปกติ:
//     // $dsn = 'mysql:host=' . getenv('DB_HOST') . ';dbname=' . getenv('DB_DATABASE');
//     $pdo = new PDO($dsn, getenv('DB_USER'), getenv('DB_PASSWORD'), [
//         PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
//     ]);
//     $pdo->query('SELECT 1');
// } catch (Throwable $e) {
//     // ห้าม echo $e->getMessage() — endpoint นี้เปิดสาธารณะ ข้อความ error ของ
//     // driver มีทั้งชื่อ server ชื่อ database และบางครั้ง username ติดมาด้วย
//     $ok = false;
// }

http_response_code($ok ? 200 : 503);
header('Content-Type: application/json');
echo json_encode(['status' => $ok ? 'healthy' : 'degraded']);
// Laravel ไม่ใช้ไฟล์นี้ — ใช้ `Route::get('/api/health', ...)` โค้ดเดียวกันใน routes/web.php แทน
