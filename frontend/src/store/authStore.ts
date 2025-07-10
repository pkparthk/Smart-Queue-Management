"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import toast from "react-hot-toast";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "manager" | "admin";
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: "manager" | "admin";
}

type AuthStore = AuthState & AuthActions;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      toast.error("Session expired. Please login again.");
    }
    return Promise.reject(error);
  }
);

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await axios.post("/auth/login", { email, password });
          const { user, token } = response.data.data;

          // Set token in both localStorage and cookies for middleware
          document.cookie = `token=${token}; path=/; max-age=${
            7 * 24 * 60 * 60
          }; samesite=lax`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success("Login successful!");
          return true;
        } catch (error: any) {
          const message = error.response?.data?.message || "Login failed";
          toast.error(message);
          set({ isLoading: false });
          return false;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await axios.post("/auth/register", userData);
          const { user, token } = response.data.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success("Registration successful!");
          return true;
        } catch (error: any) {
          const message =
            error.response?.data?.message || "Registration failed";
          toast.error(message);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        // Clear token from cookies
        document.cookie = `token=; path=/; max-age=0; samesite=lax`;

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        toast.success("Logged out successfully");
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await axios.get("/auth/me");
          const user = response.data.data.user;
          set({ user, isAuthenticated: true });
          return true;
        } catch (error) {
          get().clearAuth();
          return false;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
