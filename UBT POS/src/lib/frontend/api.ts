/**
 * Frontend API client - Typed fetch wrappers for all API endpoints
 */

const API_BASE = "/api";

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

async function apiFetch<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(error.error || `API error: ${response.status}`);
        }

        return response.json();
    } catch (e: any) {
        console.error(`Fetch error for ${url}:`, e);
        // Ensure "Failed to fetch" is handled gracefully
        if (e.message === "Failed to fetch") {
            throw new Error("Server bilan bog'lanishda xatolik (Failed to fetch). Iltimos, server ishlayotganini tekshiring.");
        }
        throw e;
    }
}

export const api = {
    // AUTH ENDPOINTS
    auth: {
        login: (shopCode: string, username: string, password: string) =>
            apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({ shopCode, username, password }),
            }),
        logout: () =>
            apiFetch("/auth/logout", { method: "POST" }),
        me: () =>
            apiFetch("/auth/me"),
    },

    // SUPER ADMIN ENDPOINTS
    superAdmin: {
        login: (password: string) =>
            apiFetch("/super-admin/login", {
                method: "POST",
                body: JSON.stringify({ password }),
            }),
        getTenants: () =>
            apiFetch("/super-admin/tenants"),
        createTenant: (data: any) =>
            apiFetch("/super-admin/tenants", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        updateTenant: (id: string, data: any) =>
            apiFetch(`/super-admin/tenants/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        deleteTenant: (id: string) =>
            apiFetch(`/super-admin/tenants/${id}`, {
                method: "DELETE",
            }),
    },

    // PRODUCTS ENDPOINTS
    products: {
        list: () =>
            apiFetch("/products"),
        create: (data: any) =>
            apiFetch("/products", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        update: (id: string, data: any) =>
            apiFetch(`/products/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        delete: (id: string) =>
            apiFetch(`/products/${id}`, {
                method: "DELETE",
            }),
    },

    // STAFF ENDPOINTS
    staff: {
        list: () =>
            apiFetch("/staff"),
        create: (data: any) =>
            apiFetch("/staff", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        update: (id: string, data: any) =>
            apiFetch(`/staff/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        delete: (id: string) =>
            apiFetch(`/staff/${id}`, {
                method: "DELETE",
            }),
    },

    // SETTINGS ENDPOINTS
    settings: {
        get: () =>
            apiFetch("/settings"),
        update: (settings: any) =>
            apiFetch("/settings", {
                method: "PUT",
                body: JSON.stringify({ settings }),
            }),
        audit: {
            list: () => apiFetch("/settings/audit"),
        }
    },

    // CUSTOMERS ENDPOINTS
    customers: {
        list: () =>
            apiFetch("/customers"),
        create: (data: any) =>
            apiFetch("/customers", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        update: (id: string, data: any) =>
            apiFetch(`/customers/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        delete: (id: string) =>
            apiFetch(`/customers/${id}`, {
                method: "DELETE",
            }),
    },

    // KONTRAGENT ENDPOINTS
    kontragent: {
        list: () =>
            apiFetch("/ubt/kontragent"),
        create: (data: { name: string; phone?: string; info?: string }) =>
            apiFetch("/ubt/kontragent", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        update: (id: string, data: { name: string; phone?: string; info?: string }) =>
            apiFetch(`/ubt/kontragent/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        delete: (id: string) =>
            apiFetch(`/ubt/kontragent/${id}`, { method: "DELETE" }),
    },

    // TRANSACTIONS ENDPOINTS
    transactions: {
        list: () =>
            apiFetch("/transactions"),
        create: (data: any) =>
            apiFetch("/transactions", {
                method: "POST",
                body: JSON.stringify(data),
            }),
    },

    // KASSIR ENDPOINTS
    kassir: {
        login: (username: string, password: string) =>
            apiFetch("/kassir/login", {
                method: "POST",
                body: JSON.stringify({ username, password }),
            }),
        logout: () =>
            apiFetch("/kassir/logout", {
                method: "POST",
            }),
    },

    // DASHBOARD ENDPOINTS
    dashboard: {
        getKPI: () =>
            apiFetch("/dashboard"),
    },

    // INVENTORY ENDPOINTS
    inventory: {
        receipts: {
            list: () => apiFetch("/inventory/receipts"),
            create: (data: any) =>
                apiFetch("/inventory/receipts", { method: "POST", body: JSON.stringify(data) }),
        },
        expenditures: {
            list: () => apiFetch("/inventory/expenditures"),
            create: (data: any) =>
                apiFetch("/inventory/expenditures", { method: "POST", body: JSON.stringify(data) }),
        },
        counts: {
            list: () => apiFetch("/inventory/counts"),
            create: (data: any) =>
                apiFetch("/inventory/counts", { method: "POST", body: JSON.stringify(data) }),
        },
    },
};
