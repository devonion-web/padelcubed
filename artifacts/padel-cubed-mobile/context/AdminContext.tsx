import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pcubed_admin_v1';

interface AdminContextType {
  isAdmin: boolean;
  adminPassword: string;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  adminPassword: '',
  login: async () => false,
  logout: async () => {},
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminPassword, setAdminPassword] = useState('');

  // Restore session on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setAdminPassword(stored);
    });
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    // Validate against the API — call admin/events with the candidate password
    try {
      const base = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : '';
      const res = await fetch(
        `${base}/api/admin/events?adminPassword=${encodeURIComponent(password)}`,
      );
      if (!res.ok) return false;
      await AsyncStorage.setItem(STORAGE_KEY, password);
      setAdminPassword(password);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setAdminPassword('');
  }, []);

  return (
    <AdminContext.Provider
      value={{ isAdmin: Boolean(adminPassword), adminPassword, login, logout }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);
