import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pcubed_admin_v2';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'superadmin' | 'admin';
}

interface AdminSession {
  token: string;
  user: AdminUser;
}

interface AdminContextType {
  isAdmin: boolean;
  token: string;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  token: '',
  user: null,
  login: async () => ({ ok: false }),
  logout: async () => {},
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);

  // Restore session on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AdminSession;
          if (parsed.token && parsed.user) setSession(parsed);
        } catch {}
      }
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const base = process.env.EXPO_PUBLIC_DOMAIN
          ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
          : '';
        const res = await fetch(`${base}/api/admin/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: body.error ?? 'Login failed' };
        }

        const data = (await res.json()) as { token: string; user: AdminUser };
        const newSession: AdminSession = { token: data.token, user: data.user };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Could not reach server' };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isAdmin: Boolean(session?.token),
        token: session?.token ?? '',
        user: session?.user ?? null,
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);
