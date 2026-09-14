---
runs: 2
max_turns: 40
timeout_seconds: 1200
model: opus
tags: ["behavior","harness"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
bug: หน้าแรกโชว์สถานะเป็นภาษาอังกฤษ (pending / approved) ทั้งที่มติทีมคือ UI ภาษาไทย ให้แสดง "รออนุมัติ" กับ "อนุมัติแล้ว" แทน (rejected → "ไม่อนุมัติ")
