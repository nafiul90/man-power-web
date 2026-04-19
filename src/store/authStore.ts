'use client';
import { create } from 'zustand';
import { User, setAuth, clearAuth, getStoredUser, getToken } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setUser: (user, token) => {
    setAuth(token, user);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    clearAuth();
    set({ user: null, token: null, isAuthenticated: false });
  },
  initAuth: () => {
    const user = getStoredUser();
    const token = getToken();
    if (user && token) set({ user, token, isAuthenticated: true });
  },
}));
