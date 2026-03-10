/**
 * authStore.ts — Real JWT auth backed by backend.
 * Tokens are stored in localStorage via zustand persist.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setTokenAccessor } from '@/lib/api';

export interface UserProfile {
    companyName: string;
    industry: string;
    website: string;
    description: string;
    products: Product[];
}

export interface Product {
    id: string;
    name: string;
    category: string;
    price: string;
    description: string;
}

interface AuthStore {
    // JWT token from backend
    token: string | null;
    isAuthenticated: boolean;
    hasCompletedOnboarding: boolean;
    email: string | null;
    name: string | null;
    profile: UserProfile | null;

    // Actions
    setAuth: (token: string, email: string, name: string) => void;
    logout: () => void;
    completeOnboarding: (profile: UserProfile) => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            token: null,
            isAuthenticated: false,
            hasCompletedOnboarding: false,
            email: null,
            name: null,
            profile: null,

            setAuth: (token, email, name) => {
                setTokenAccessor(() => get().token);
                set({ token, isAuthenticated: true, email, name });
            },

            logout: () =>
                set({
                    token: null,
                    isAuthenticated: false,
                    hasCompletedOnboarding: false,
                    email: null,
                    name: null,
                    profile: null,
                }),

            completeOnboarding: (profile) =>
                set({ hasCompletedOnboarding: true, profile }),
        }),
        {
            name: 'mi-auth',
            // Re-wire token accessor when store is rehydrated from localStorage
            onRehydrateStorage: () => (state) => {
                if (state?.token) {
                    setTokenAccessor(() => state.token);
                }
            },
        }
    )
);
