import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
    id: string;
    name: string;
    role: "SUPER_ADMIN" | "ADMIN" | "KASSIR";
    tenantId?: string;
    tenant?: {
        id: string;
        shopCode: string;
        shopName: string;
        plan: string;
        settings?: {
            shopType?: "shop" | "ubt" | "pharmacy";
            [key: string]: any;
        };
    };
    branch?: string;
    permissions?: string[];
    expiresAt?: string | null;
}

export interface FrontendStore {
    // Auth state
    user: User | null;
    isAuthenticated: boolean;
    authLoading: boolean;
    /** True after Zustand persist has loaded state from localStorage */
    _hasHydrated: boolean;

    // Subscription state
    subscriptionExpired: boolean;

    // UI state
    sidebarCollapsed: boolean;
    selectedBranch: string;

    // Actions
    setUser: (user: User | null) => void;
    setIsAuthenticated: (value: boolean) => void;
    setAuthLoading: (value: boolean) => void;
    toggleSidebar: () => void;
    setSelectedBranch: (branch: string) => void;
    logout: () => void;
    _setHasHydrated: (value: boolean) => void;
    checkSubscriptionStatus: () => void;
}

export const useFrontendStore = create<FrontendStore>()(
    persist(
        (set) => ({
            // Initial state
            user: null,
            isAuthenticated: false,
            authLoading: false,
            _hasHydrated: false,
            subscriptionExpired: false,
            sidebarCollapsed: false,
            selectedBranch: "Filial #1",

            // Auth actions
            setUser: (user) => set({ 
                user, 
                isAuthenticated: user !== null,
                subscriptionExpired: user?.expiresAt ? new Date(user.expiresAt) < new Date() : false
            }),
            setIsAuthenticated: (value) => set({ isAuthenticated: value }),
            setAuthLoading: (value) => set({ authLoading: value }),

            // UI actions
            toggleSidebar: () =>
                set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            setSelectedBranch: (branch) => set({ selectedBranch: branch }),

            // Logout
            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),

            _setHasHydrated: (value) => set({ _hasHydrated: value }),

            checkSubscriptionStatus: () => {
                const state = useFrontendStore.getState();
                if (state.user?.expiresAt) {
                    const expired = new Date(state.user.expiresAt) < new Date();
                    if (expired !== state.subscriptionExpired) {
                        set({ subscriptionExpired: expired });
                    }
                }
            },
        }),
        {
            name: "ubt-frontend-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist essential state — _hasHydrated is intentionally excluded
                isAuthenticated: state.isAuthenticated,
                user: state.user,
                sidebarCollapsed: state.sidebarCollapsed,
                selectedBranch: state.selectedBranch,
            }),
            onRehydrateStorage: () => (state) => {
                // Called after localStorage has been read and merged into the store.
                // This guarantees isAuthenticated holds the true persisted value.
                state?._setHasHydrated(true);
            },
        }
    )
);
