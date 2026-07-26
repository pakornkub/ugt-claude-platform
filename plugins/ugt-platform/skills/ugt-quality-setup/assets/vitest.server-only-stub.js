// Stub ของ package `server-only` สำหรับ vitest — ของจริง throw นอก React Server
// environment ทำให้ import โมดูลฝั่ง server เข้ามาทดสอบตรง ๆ ไม่ได้
// เก็บไว้ในโปรเจคเอง (ไม่ alias เข้า node_modules/next internals) เพื่อให้ resolve ได้
// แม้รันใน git worktree ที่ยังไม่มี node_modules เต็ม
export {};
