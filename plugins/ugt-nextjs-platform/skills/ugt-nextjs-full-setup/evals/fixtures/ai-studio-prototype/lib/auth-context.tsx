'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type User = { name: string; role: 'admin' | 'user' };

export const mockUser: User = { name: 'สมชาย ใจดี', role: 'admin' };

const AuthContext = createContext<{ user: User | null; isLoggedIn: boolean }>({ user: null, isLoggedIn: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    if (token && raw) setUser(JSON.parse(raw) as User);
    else setUser(mockUser); // demo mode: everyone is admin
  }, []);

  return <AuthContext.Provider value={{ user, isLoggedIn: !!user }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
