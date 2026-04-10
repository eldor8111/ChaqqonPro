import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Tenant {
    id: string;
    shopCode: string;
    shopName: string;
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    plan: 'starter' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'trial' | 'suspended';
    adminUsername: string;
    createdAt: string;
    expiresAt?: string;
}

export interface SuperAdminStore {
    isAuthenticated: boolean;
    currentUser: any | null;
    tenants: Tenant[];
    login: (user?: any) => boolean;
    logout: () => void;
    addTenant: (data: Omit<Tenant, 'id' | 'createdAt'>) => void;
    updateTenant: (id: string, data: Partial<Tenant>) => void;
    deleteTenant: (id: string) => void;
}

const DEMO_TENANTS: Tenant[] = [];

export const useSuperAdminStore = create<SuperAdminStore>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            currentUser: null,
            tenants: DEMO_TENANTS,

            login: (user?: any) => {
                set({ isAuthenticated: true, currentUser: user || { id: "superadmin", role: "MASTER", permissions: [] } });
                return true;
            },

            logout: () => {
                set({ isAuthenticated: false, currentUser: null });
            },

            addTenant: (data) => {
                const newTenant: Tenant = {
                    ...data,
                    id: `tenant-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                };
                set((state) => ({
                    tenants: [...state.tenants, newTenant],
                }));
            },

            updateTenant: (id, data) => {
                set((state) => ({
                    tenants: state.tenants.map((t) =>
                        t.id === id ? { ...t, ...data } : t
                    ),
                }));
            },

            deleteTenant: (id) => {
                set((state) => ({
                    tenants: state.tenants.filter((t) => t.id !== id),
                }));
            },
        }),
        {
            name: 'ubt-super-admin-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
