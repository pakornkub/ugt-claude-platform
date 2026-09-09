'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Demo credentials — replace with real auth later
const DEMO_USER = 'admin';
const DEMO_PASS = 'admin1234';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (username === DEMO_USER && password === DEMO_PASS) {
      localStorage.setItem('token', 'demo-token');
      localStorage.setItem('user', JSON.stringify({ name: 'สมชาย ใจดี', role: 'admin' }));
      router.push('/');
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 card space-y-4">
      <h1 className="text-2xl font-semibold text-brand">เข้าสู่ระบบ</h1>
      <form onSubmit={submit} className="space-y-4">
        <input className="input" placeholder="ชื่อผู้ใช้" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>}
        <button type="submit" className="btn w-full">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
}
