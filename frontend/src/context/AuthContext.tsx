import {
  createContext, useContext, useState, useEffect, ReactNode,
} from 'react';
import api from '../api/client';
import { User } from '../types';
import { DEMO_MODE, demoUser } from '../demo';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEMO_MODE ? demoUser : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;
    const stored = localStorage.getItem('user');
    if (stored && localStorage.getItem('token')) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const persist = (token: string, u: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    if (DEMO_MODE) {
      setUser({ ...demoUser, email: email || demoUser.email });
      return;
    }
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.accessToken, data.user);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    if (DEMO_MODE) {
      setUser({ ...demoUser, email: email || demoUser.email, displayName: displayName || demoUser.displayName });
      return;
    }
    const { data } = await api.post('/auth/register', { email, password, displayName });
    persist(data.accessToken, data.user);
  };

  const logout = () => {
    if (DEMO_MODE) {
      setUser(demoUser);
      return;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
