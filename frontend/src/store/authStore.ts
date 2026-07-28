import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'manager' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profession?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        localStorage.setItem('access_token', token); // For Axios interceptor
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
);
