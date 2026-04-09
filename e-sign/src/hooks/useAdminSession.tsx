import { useEffect, useState } from 'react';
import type { AdminSession, AdminUser } from '../types/admin';

const STORAGE_KEY = 'e-sign-admin-session';

interface DemoAccount {
  username: string;
  password: string;
  user: AdminUser;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'admin',
    password: 'admin123',
    user: {
      username: 'admin',
      displayName: 'Quản trị viên',
      role: 'admin',
    },
  },
  {
    username: 'hopdong',
    password: 'hopdong123',
    user: {
      username: 'hopdong',
      displayName: 'Nhân viên hợp đồng',
      role: 'contract',
    },
  },
];

const readSession = (): AdminSession | null => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (
      typeof parsed.token === 'string' &&
      parsed.user &&
      typeof parsed.user.username === 'string' &&
      (parsed.user.role === 'admin' || parsed.user.role === 'contract')
    ) {
      return {
        token: parsed.token,
        user: {
          username: parsed.user.username,
          displayName: parsed.user.displayName || 'Quản trị viên',
          role: parsed.user.role,
        },
      };
    }
  } catch {
    return null;
  }

  return null;
};

const saveSession = (session: AdminSession | null) => {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export interface LoginCredentials {
  username: string;
  password: string;
}

export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(() => readSession());
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    setIsHydrating(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const username = credentials.username.trim();
    const password = credentials.password;
    const matchedAccount = DEMO_ACCOUNTS.find((account) => account.username === username && account.password === password);

    if (!matchedAccount) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    }

    const nextSession: AdminSession = {
      token: crypto.randomUUID(),
      user: matchedAccount.user,
    };

    setSession(nextSession);
    saveSession(nextSession);
    return nextSession;
  };

  const logout = async () => {
    setSession(null);
    saveSession(null);
  };

  return {
    session,
    isAuthenticated: Boolean(session),
    isHydrating,
    login,
    logout,
  };
}
