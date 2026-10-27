---
runs: 1
max_turns: 120
timeout_seconds: 2700
model: opus
tags: ["behavior","cicd","cron"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
ช่วยทำ CI/CD ให้โปรเจคนี้ตามมาตรฐานบริษัท (test/lint ตั้งไว้แล้ว) — ตอบคำถามไว้ให้หมดแล้ว ทำรวดเดียวไม่ต้องหยุดถาม:
ชื่อโปรเจค leave-request ชื่อแสดง "ระบบคำขอลา" · port 3000 / 3001 · basePath prod /leave-request dev /leave-request-dev · URL https://apps.ugt.local/leave-request และ https://apps.ugt.local/leave-request-dev · ไม่มี database · ไม่ใช้ Sentry · deploy ที่ docker02 (Jenkins คนละเครื่อง ใช้ socket ของ docker02, docker compose v2) · Jenkins อยู่ที่ jenkins.ugt.local · repo https://github.com/ugt/leave-request · ไม่มี volume
มีงานตั้งเวลา 1 ตัว: ชื่อ weekly-summary ส่งสรุปคำขอลาของสัปดาห์ ทุกวันจันทร์ 08:00 เวลาไทย — ไม่อยากให้ admin ต้องไปแก้ crontab บน server เลยขอเป็น cron service ใน compose แทน host cron
