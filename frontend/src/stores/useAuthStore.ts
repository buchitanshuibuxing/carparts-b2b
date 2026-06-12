import { create } from 'zustand';
import api from '@/lib/api';
import { setTokens, clearTokens, isAuthenticated } from '@/lib/auth';
import type { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isLoggedIn: isAuthenticated(),

  login: async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    setTokens(data.access_token, data.refresh_token);
    set({ user: data.user, isLoggedIn: true });
  },

  logout: () => {
    clearTokens();
    set({ user: null, isLoggedIn: false });
  },

  checkAuth: async () => {
    if (!isAuthenticated()) {
      set({ isLoading: false, isLoggedIn: false });
      return;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const { data } = await api.get('/auth/me', { signal: controller.signal });
      clearTimeout(timer);
      set({ user: data.data || data, isLoading: false, isLoggedIn: true });
    } catch {
      clearTokens();
      set({ user: null, isLoading: false, isLoggedIn: false });
    }
  },
}));
