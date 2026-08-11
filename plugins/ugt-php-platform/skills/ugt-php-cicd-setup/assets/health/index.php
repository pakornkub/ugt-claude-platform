<?php
// org /api/health — 200 healthy / 503 degraded · ห้ามใส่ version/commit · ไม่ต้อง login
declare(strict_types=1);
$ok = true;
// [DB] เช็ค DB แบบถูก (SELECT 1) แล้ว $ok = false เมื่อพัง
http_response_code($ok ? 200 : 503);
header('Content-Type: application/json');
echo json_encode(['status' => $ok ? 'healthy' : 'degraded']);
// Laravel ไม่ใช้ไฟล์นี้ — ใช้ `Route::get('/api/health', ...)` โค้ดเดียวกันใน routes/web.php แทน
