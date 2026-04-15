import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
    mockKPI, mockRevenueChart, mockTopProducts,
    mockRecentTransactions, mockProducts,
    mockBranches, mockStaff, mockFraudAlerts, mockCustomers,
    mockOnlineOrders, mockPharmacyDrugs,
    mockWholesaleClients, mockProfitLoss,
    mockUbtTables, mockKDSOrders,
    mockNomenklaturaKategoriyalar, mockNomenklaturaTaomlar, mockNomenklaturaXomashyo
} from "./mockData";

// Multi-tenant storage key helper
const getStorageKey = (): string => {
    if (typeof window !== "undefined") {
        const activeShop = localStorage.getItem("ubt-active-shop");
        return activeShop ? `ubt-pos-storage-v2-${activeShop}` : "ubt-pos-storage-v2";
    }
    return "ubt-pos-storage-v2";
};

export interface Transaction {
    id: string;
    customer: string;
    amount: number;
    method: string;
    time: string;
    status: string;
    source?: "main" | "pharmacy"; // distinguish between main and pharmacy
}

// ===== INVENTORY TYPES =====
export interface InventoryReceipt {
    id: string;
    date: string;
    supplier: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    costPrice: number;
    totalCost: number;
    warehouse: string;
    notes: string;
    status: "accepted" | "pending" | "cancelled";
}

export interface InventoryExpenditure {
    id: string;
    date: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    reason: "sale" | "return" | "damage" | "writeoff" | "transfer";
    fromWarehouse: string;
    employee: string;
    notes: string;
}

export interface InventoryTransfer {
    id: string;
    date: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    fromWarehouse: string;
    toWarehouse: string;
    employee: string;
    status: "completed" | "in_transit" | "pending";
    notes: string;
}

export interface InventoryCount {
    id: string;
    date: string;
    warehouse: string;
    productId: string;
    productName: string;
    systemStock: number;
    actualStock: number;
    difference: number;
    unit: string;
    employee: string;
    status: "completed" | "in_progress" | "draft";
}

export interface InventoryWriteoff {
    id: string;
    date: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    reason: string;
    totalLoss: number;
    approvedBy: string;
    status: "approved" | "pending";
}

// ===== INITIAL MOCK DATA =====
const mockReceipts: InventoryReceipt[] = [];

const mockExpenditures: InventoryExpenditure[] = [];

const mockTransfers: InventoryTransfer[] = [];

const mockInventoryCounts: InventoryCount[] = [];

const mockWriteoffs: InventoryWriteoff[] = [];

// ===== STAFF TYPES =====
export const ALL_PERMISSIONS = [
    // Modullar
    "pos", "inventory", "crm", "reports", "staff",
    "ai", "ubt", "pharmacy", "wholesale", "ecommerce",
    // Amallar
    "discounts", "refunds", "priceEdit", "stockEdit",
    "reportExport", "customerEdit", "shiftManage",
    "waiterApp", "deliveryApp"
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
    "Administrator": [...ALL_PERMISSIONS],
    "Menejer": ["pos", "inventory", "crm", "reports", "discounts", "refunds", "priceEdit", "stockEdit", "reportExport", "customerEdit", "shiftManage"],
    "Kassir": ["pos", "discounts", "refunds"],
    "Omborchi": ["inventory", "stockEdit"],
    "Ofitsiant": ["ubt", "waiterApp"],
    "Kuryer": ["ubt", "deliveryApp"],
    "Manablog": ["pos"],
};

export interface StaffMember {
    id: string;
    name: string;
    role: string;
    branch: string;
    phone: string;
    salary: number;
    hireDate: string;
    status: "online" | "offline";
    shiftStart: string;
    sales: number;
    transactions: number;
    pin: string;
    permissions: string[];
    username: string;
    password: string;
}

export interface FraudAlert {
    id: string;
    type: string;
    staffId: string;
    staffName: string;
    time: string;
    description: string;
    severity: "high" | "medium";
    dismissed: boolean;
}

// ===== PHARMACY TYPES =====
export interface PharmacyDrug {
    id: string;
    name: string;
    barcode: string;
    serial: string;
    expiry: string;
    stock: number;
    minStock: number;
    price: number;
    category: string;
    manufacturer: string;
    prescription: boolean;
}

// ===== UBT TYPES =====
export interface UbtTable {
    id: string;
    name: string;
    seats: number;
    zone: string;
    status: "occupied" | "free" | "reserved" | "receipt";
    order: string | null;
    amount: number;
    since: string | null;
    waiter?: string;
    serviceFee?: number; // Xizmat to'lovi foizi (0–100)
}

export interface KDSOrder {
    id: string;
    table: string;
    items: string[];
    status: "new" | "preparing" | "ready";
    time: string;
}

export interface NomenklaturaKategoriya {
    id: string;
    name: string;
    itemCount: number;
}

export interface NomenklaturaTaom {
    id: string;
    name: string;
    categoryId: string;
    price: number;
    cost: number;
    inStock: boolean;
    type?: "taom" | "mahsulot";
    sortOrder?: string;
    stock?: number;
    unit?: string;
    printer?: string;
    printers?: string;
    hasBarcode?: boolean;
    autoCalculate?: boolean;
    isSetMenu?: boolean;
    image?: string | null;
    recipes?: { xomashyoId: string; amount: number }[];
}

export interface NomenklaturaXomashyo {
    id: string;
    name: string;
    unit: string;
    stock: number;
    price: number;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    segment: string;
    points: number;
    cashback: number;
    totalPurchases: number;
    visits: number;
    lastVisit: string;
    birthday: string;
}

export interface AppState {
    kpi: typeof mockKPI;
    revenueChart: typeof mockRevenueChart;
    topProducts: typeof mockTopProducts;
    recentTransactions: Transaction[];
    products: typeof mockProducts;
    pharmacyDrugs: PharmacyDrug[];
    onlineOrders: typeof mockOnlineOrders;
    profitLoss: typeof mockProfitLoss;

    // Inventory sub-module data
    receipts: InventoryReceipt[];
    expenditures: InventoryExpenditure[];
    transfers: InventoryTransfer[];
    inventoryCounts: InventoryCount[];
    writeoffs: InventoryWriteoff[];

    // UBT Data
    ubtTables: UbtTable[];
    kdsOrders: KDSOrder[];
    nomenklaturaKategoriyalar: NomenklaturaKategoriya[];
    nomenklaturaTaomlar: NomenklaturaTaom[];
    nomenklaturaXomashyo: NomenklaturaXomashyo[];

    // Staff Data
    staff: StaffMember[];
    fraudAlerts: FraudAlert[];

    // CRM Data
    customers: Customer[];

    // Auth State
    isAuthenticated: boolean;
    user: { name: string; role: string } | null;

    // Tizimga / Apparatga biriktirilgan ruxsat
    deviceSession: {
        id: string;
        name: string;
        branch: string;
        permissions: string[];
        shopCode?: string;
        shopType?: string;
        token?: string;
        printerIp?: string;
    } | null;

    // Kassir / Ofitsiant sessiyasi
    kassirSession: { id: string; name: string; branch: string; permissions: string[]; shopCode?: string; shopType?: string; token?: string; printerIp?: string; serviceFeePct?: number } | null;

    // Actions
    addTransaction: (tx: Transaction) => void;
    updateKpi: (amount: number) => void;
    sellProduct: (productId: string, quantity: number, price: number, customerName?: string, paymentMethod?: string) => void;
    sellDrug: (drugId: string, quantity: number, price: number, customerName?: string, paymentMethod?: string) => void;

    // Inventory Product Actions
    addProduct: (product: typeof mockProducts[0]) => void;
    updateProduct: (id: string, product: Partial<typeof mockProducts[0]>) => void;
    deleteProduct: (id: string) => void;

    // Inventory Sub-module Actions
    addReceipt: (receipt: InventoryReceipt) => void;
    addExpenditure: (exp: InventoryExpenditure) => void;
    addTransfer: (transfer: InventoryTransfer) => void;
    updateTransferStatus: (id: string, status: InventoryTransfer["status"]) => void;
    addInventoryCount: (count: InventoryCount) => void;
    addWriteoff: (writeoff: InventoryWriteoff) => void;
    updateWriteoffStatus: (id: string, status: InventoryWriteoff["status"]) => void;

    // Pharmacy Actions
    addDrug: (drug: PharmacyDrug) => void;
    updateDrug: (id: string, updates: Partial<PharmacyDrug>) => void;
    deleteDrug: (id: string) => void;

    // UBT Actions
    fetchUbtTables: () => Promise<void>;
    fetchKdsOrders: () => Promise<void>;
    updateTableStatus: (id: string, updates: Partial<UbtTable>) => Promise<void>;
    updateKDSOrderStatus: (id: string, status: KDSOrder["status"]) => Promise<void>;
    addKDSOrder: (tableId: string, description: string) => Promise<void>;
    addUbtReservation: (tableId: string, guestName: string, since: string) => void;
    payTable: (params: {
        tableId: string;
        items: { name: string; qty: number; price: number }[];
        paymentMethod: string;
        total: number;
        waiterName: string;
        tableLabel: string;
    }) => Promise<{ success: boolean; transactionId?: string; error?: string }>;

    // Nomenklatura Actions
    addNomenklaturaKategoriya: (item: NomenklaturaKategoriya) => void;
    updateNomenklaturaKategoriya: (id: string, updates: Partial<NomenklaturaKategoriya>) => void;
    deleteNomenklaturaKategoriya: (id: string) => void;

    addNomenklaturaTaom: (item: NomenklaturaTaom) => void;
    updateNomenklaturaTaom: (id: string, updates: Partial<NomenklaturaTaom>) => void;
    deleteNomenklaturaTaom: (id: string) => void;

    addNomenklaturaXomashyo: (item: NomenklaturaXomashyo) => void;
    updateNomenklaturaXomashyo: (id: string, updates: Partial<NomenklaturaXomashyo>) => void;
    deleteNomenklaturaXomashyo: (id: string) => void;

    // Staff Actions
    addStaff: (member: StaffMember) => void;
    updateStaff: (id: string, updates: Partial<StaffMember>) => void;
    deleteStaff: (id: string) => void;
    setStaffStatus: (id: string, status: "online" | "offline", shiftStart: string) => void;
    updateStaffPermissions: (id: string, permissions: string[]) => void;
    dismissFraudAlert: (id: string) => void;

    // CRM Actions
    addCustomer: (customer: Customer) => void;
    updateCustomer: (id: string, updates: Partial<Customer>) => void;
    addBonusPoints: (id: string, points: number) => void;
    subtractBonusPoints: (id: string, points: number) => void;

    // Auth Actions
    login: (username: string) => void;
    logout: () => void;

    // Kassir Actions
    setDeviceSession: (session: AppState["deviceSession"]) => void;
    setKassirSession: (session: AppState["kassirSession"]) => void;
    kassirLogout: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            kpi: { ...mockKPI },
            revenueChart: [...mockRevenueChart],
            topProducts: [...mockTopProducts],
            recentTransactions: [...mockRecentTransactions],
            products: [...mockProducts],
            pharmacyDrugs: [...mockPharmacyDrugs] as PharmacyDrug[],
            onlineOrders: [...mockOnlineOrders],
            profitLoss: [...mockProfitLoss],


            receipts: [...mockReceipts],
            expenditures: [...mockExpenditures],
            transfers: [...mockTransfers],
            inventoryCounts: [...mockInventoryCounts],
            writeoffs: [...mockWriteoffs],
            ubtTables: [...mockUbtTables] as UbtTable[],
            kdsOrders: [...mockKDSOrders] as KDSOrder[],
            nomenklaturaKategoriyalar: [...mockNomenklaturaKategoriyalar] as NomenklaturaKategoriya[],
            nomenklaturaTaomlar: [...mockNomenklaturaTaomlar] as NomenklaturaTaom[],
            nomenklaturaXomashyo: [...mockNomenklaturaXomashyo] as NomenklaturaXomashyo[],
            staff: [...mockStaff],
            fraudAlerts: [...mockFraudAlerts],
            customers: [...mockCustomers],

            isAuthenticated: false,
            user: null,
            kassirSession: null,
            deviceSession: null,

            addTransaction: (tx) =>
                set((state) => ({
                    recentTransactions: [tx, ...state.recentTransactions].slice(0, 10),
                })),

            updateKpi: (amount) =>
                set((state) => ({
                    kpi: {
                        ...state.kpi,
                        todaySales: state.kpi.todaySales + amount,
                        totalRevenue: state.kpi.totalRevenue + amount,
                        activeOrders: state.kpi.activeOrders + 1,
                    }
                })),

            sellProduct: (productId, quantity, revenueValue, customerName = "Noma'lum mijoz", paymentMethod = "Naqd") =>
                set((state) => {
                    const updatedProducts = state.products.map(p =>
                        p.id === productId ? { ...p, stock: Math.max(0, p.stock - quantity) } : p
                    );
                    const product = state.products.find(p => p.id === productId);
                    let updatedTop = [...state.topProducts];
                    if (product) {
                        const existing = updatedTop.find(t => t.id === productId);
                        if (existing) {
                            updatedTop = updatedTop.map(t =>
                                t.id === productId
                                    ? { ...t, sold: t.sold + quantity, revenue: t.revenue + revenueValue }
                                    : t
                            );
                        } else {
                            updatedTop.push({
                                id: product.id,
                                name: product.name,
                                category: product.category,
                                sold: quantity,
                                revenue: revenueValue,
                                margin: 0
                            });
                        }
                    }
                    updatedTop.sort((a, b) => b.revenue - a.revenue);

                    const newTx: Transaction = {
                        id: `#TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                        customer: customerName,
                        amount: revenueValue,
                        method: paymentMethod,
                        time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
                        status: "completed",
                        source: "main"
                    };

                    return {
                        products: updatedProducts,
                        topProducts: updatedTop,
                        recentTransactions: [newTx, ...state.recentTransactions].slice(0, 50)
                    };
                }),

            sellDrug: (drugId, quantity, revenueValue, customerName = "Noma'lum mijoz", paymentMethod = "Naqd") =>
                set((state) => {
                    const updatedDrugs = state.pharmacyDrugs.map(d =>
                        d.id === drugId ? { ...d, stock: Math.max(0, d.stock - quantity) } : d
                    );

                    const newTx: Transaction = {
                        id: `#PHARM-${Math.floor(1000 + Math.random() * 9000)}`,
                        customer: customerName,
                        amount: revenueValue,
                        method: paymentMethod,
                        time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
                        status: "completed",
                        source: "pharmacy"
                    };

                    return {
                        pharmacyDrugs: updatedDrugs,
                        recentTransactions: [newTx, ...state.recentTransactions].slice(0, 50)
                    };
                }),

            addProduct: (product) =>
                set((state) => ({
                    products: [product, ...state.products]
                })),

            updateProduct: (id, updatedFields) =>
                set((state) => ({
                    products: state.products.map(p =>
                        p.id === id ? { ...p, ...updatedFields } : p
                    )
                })),

            deleteProduct: (id) =>
                set((state) => ({
                    products: state.products.filter(p => p.id !== id)
                })),

            addReceipt: (receipt) =>
                set((state) => ({
                    receipts: [receipt, ...state.receipts],
                    // Also increase stock of the product
                    products: state.products.map(p =>
                        p.id === receipt.productId
                            ? { ...p, stock: p.stock + receipt.quantity }
                            : p
                    ),
                })),

            addExpenditure: (exp) =>
                set((state) => ({
                    expenditures: [exp, ...state.expenditures],
                    products: state.products.map(p =>
                        p.id === exp.productId
                            ? { ...p, stock: Math.max(0, p.stock - exp.quantity) }
                            : p
                    ),
                })),

            addTransfer: (transfer) =>
                set((state) => ({
                    transfers: [transfer, ...state.transfers],
                })),

            updateTransferStatus: (id, status) =>
                set((state) => ({
                    transfers: state.transfers.map(t =>
                        t.id === id ? { ...t, status } : t
                    ),
                })),

            addInventoryCount: (count) =>
                set((state) => ({
                    inventoryCounts: [count, ...state.inventoryCounts],
                    // Adjust product stock if count is completed and there's a difference
                    products: count.status === "completed" && count.difference !== 0
                        ? state.products.map(p =>
                            p.id === count.productId ? { ...p, stock: count.actualStock } : p
                        )
                        : state.products,
                })),

            addWriteoff: (writeoff) =>
                set((state) => ({
                    writeoffs: [writeoff, ...state.writeoffs],
                })),

            updateWriteoffStatus: (id, status) =>
                set((state) => {
                    const writeoff = state.writeoffs.find(w => w.id === id);
                    const updatedWriteoffs = state.writeoffs.map(w =>
                        w.id === id ? { ...w, status } : w
                    );
                    // Deduct from stock when approved
                    const updatedProducts = status === "approved" && writeoff
                        ? state.products.map(p =>
                            p.id === writeoff.productId
                                ? { ...p, stock: Math.max(0, p.stock - writeoff.quantity) }
                                : p
                        )
                        : state.products;
                    return { writeoffs: updatedWriteoffs, products: updatedProducts };
                }),

            addDrug: (drug) =>
                set((state) => ({ pharmacyDrugs: [drug, ...state.pharmacyDrugs] })),

            updateDrug: (id, updates) =>
                set((state) => ({
                    pharmacyDrugs: state.pharmacyDrugs.map(d => d.id === id ? { ...d, ...updates } : d),
                })),

            deleteDrug: (id) =>
                set((state) => ({ pharmacyDrugs: state.pharmacyDrugs.filter(d => d.id !== id) })),

            fetchUbtTables: async () => {
                try {
                    // Get token from store (kassir or device session)
                    const state = useStore.getState();
                    const token = state.kassirSession?.token || state.deviceSession?.token;
                    const headers: Record<string, string> = {};
                    if (token) headers["Authorization"] = `Bearer ${token}`;

                    const res = await fetch("/api/ubt/tables", { headers });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.tables) {
                            const mapped = data.tables.map((t: any) => ({
                                id: t.id,
                                name: t.tableNumber,
                                seats: t.capacity,
                                status: t.status,
                                zone: t.section || "Ichki",
                                order: t.order,
                                amount: t.amount,
                                since: t.since,
                                waiter: t.waiter || undefined,
                                serviceFee: t.serviceFee ?? 0,
                            }));
                            set({ ubtTables: mapped });
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch tables", err);
                }
            },

            fetchKdsOrders: async () => {
                try {
                    const res = await fetch("/api/ubt/orders");
                    if (res.ok) {
                        const data = await res.json();
                        if (data.orders) {
                            const mapped = data.orders.map((o: any) => ({
                                id: o.id.slice(-4),
                                table: o.table?.tableNumber || o.tableId,
                                items: (o.description || "").split("\n").filter(Boolean),
                                status: o.status === "new" ? "new" : o.status === "ready" ? "ready" : "preparing",
                                time: new Date(o.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
                            }));
                            set({ kdsOrders: mapped });
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch KDS", err);
                }
            },

            updateTableStatus: async (id, updates) => {
                // Save previous state for rollback
                const prev = useStore.getState().ubtTables;
                // Optimistic local update
                set((state) => ({
                    ubtTables: state.ubtTables.map(t =>
                        t.id === id ? { ...t, ...updates } : t
                    ),
                }));
                // Call API, rollback on failure
                try {
                    const res = await fetch("/api/ubt/tables", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id, ...updates })
                    });
                    if (!res.ok) set({ ubtTables: prev });
                } catch (e) {
                    console.error(e);
                    set({ ubtTables: prev });
                }
            },

            updateKDSOrderStatus: async (id, status) => {
                // Optimistic local update
                set((state) => ({
                    kdsOrders: state.kdsOrders.map(o =>
                        o.id === id ? { ...o, status } : o
                    ),
                }));
                // Persist to API (id here is last-4 chars of DB id — best effort)
                try {
                    await fetch("/api/ubt/orders", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ idSuffix: id, status }),
                    });
                } catch (e) { console.error("[KDS status update]", e); }
            },

            addKDSOrder: async (tableId, description) => {
                try {
                    const res = await fetch("/api/ubt/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tableId, description })
                    });
                    if (res.ok) {
                        const state = useStore.getState();
                        await state.fetchKdsOrders();
                    }
                } catch (e) { console.error(e); }
            },

            payTable: async ({ tableId, items, paymentMethod, total, waiterName, tableLabel }) => {
                try {
                    const res = await fetch("/api/ubt/pay", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tableId, items, paymentMethod, total, waiterName, tableLabel }),
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        // Optimistic local update
                        set((state) => ({
                            ubtTables: state.ubtTables.map(t =>
                                t.id === tableId
                                    ? { ...t, status: "free" as const, amount: 0, order: null, since: null, waiter: undefined }
                                    : t
                            ),
                        }));
                        return { success: true, transactionId: data.transactionId };
                    }
                    return { success: false, error: data.error || "To'lov xatoligi" };
                } catch (e) {
                    console.error("payTable error:", e);
                    return { success: false, error: "Server bilan bog'lanib bo'lmadi" };
                }
            },

            addUbtReservation: (tableId, guestName, since) =>
                set((state) => {
                    const updates = { status: "reserved" as const, since, order: guestName || null, amount: 0 };
                    // Async put request without awaiting to keep it snappy.
                    fetch("/api/ubt/tables", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: tableId, ...updates })
                    });
                    return {
                        ubtTables: state.ubtTables.map(t =>
                            t.id === tableId
                                ? { ...t, ...updates }
                                : t
                        ),
                    };
                }),

            addNomenklaturaKategoriya: (item) =>
                set((state) => ({ nomenklaturaKategoriyalar: [item, ...state.nomenklaturaKategoriyalar] })),
            updateNomenklaturaKategoriya: (id, updates) =>
                set((state) => ({ nomenklaturaKategoriyalar: state.nomenklaturaKategoriyalar.map(i => i.id === id ? { ...i, ...updates } : i) })),
            deleteNomenklaturaKategoriya: (id) =>
                set((state) => ({ nomenklaturaKategoriyalar: state.nomenklaturaKategoriyalar.filter(i => i.id !== id) })),

            addNomenklaturaTaom: (item) =>
                set((state) => ({ nomenklaturaTaomlar: [item, ...state.nomenklaturaTaomlar] })),
            updateNomenklaturaTaom: (id, updates) =>
                set((state) => ({ nomenklaturaTaomlar: state.nomenklaturaTaomlar.map(i => i.id === id ? { ...i, ...updates } : i) })),
            deleteNomenklaturaTaom: (id) =>
                set((state) => ({ nomenklaturaTaomlar: state.nomenklaturaTaomlar.filter(i => i.id !== id) })),

            addNomenklaturaXomashyo: (item) =>
                set((state) => ({ nomenklaturaXomashyo: [item, ...state.nomenklaturaXomashyo] })),
            updateNomenklaturaXomashyo: (id, updates) =>
                set((state) => ({ nomenklaturaXomashyo: state.nomenklaturaXomashyo.map(i => i.id === id ? { ...i, ...updates } : i) })),
            deleteNomenklaturaXomashyo: (id) =>
                set((state) => ({ nomenklaturaXomashyo: state.nomenklaturaXomashyo.filter(i => i.id !== id) })),

            addStaff: (member) =>
                set((state) => ({
                    staff: [member, ...state.staff],
                })),

            updateStaff: (id, updates) =>
                set((state) => ({
                    staff: state.staff.map(s => s.id === id ? { ...s, ...updates } : s),
                })),

            deleteStaff: (id) =>
                set((state) => ({
                    staff: state.staff.filter(s => s.id !== id),
                })),

            setStaffStatus: (id, status, shiftStart) =>
                set((state) => ({
                    staff: state.staff.map(s =>
                        s.id === id ? { ...s, status, shiftStart } : s
                    ),
                })),

            updateStaffPermissions: (id, permissions) =>
                set((state) => ({
                    staff: state.staff.map(s => s.id === id ? { ...s, permissions } : s),
                })),

            dismissFraudAlert: (id) =>
                set((state) => ({
                    fraudAlerts: state.fraudAlerts.map(a =>
                        a.id === id ? { ...a, dismissed: true } : a
                    ),
                })),

            addCustomer: (customer) =>
                set((state) => ({
                    customers: [customer, ...state.customers]
                })),

            updateCustomer: (id, updates) =>
                set((state) => ({
                    customers: state.customers.map(c =>
                        c.id === id ? { ...c, ...updates } : c
                    )
                })),

            addBonusPoints: (id, points) =>
                set((state) => ({
                    customers: state.customers.map(c =>
                        c.id === id ? { ...c, points: c.points + points } : c
                    )
                })),

            subtractBonusPoints: (id, points) =>
                set((state) => ({
                    customers: state.customers.map(c =>
                        c.id === id ? { ...c, points: Math.max(0, c.points - points) } : c
                    )
                })),

            login: (username) =>
                set({
                    isAuthenticated: true,
                    user: { name: username, role: "Super Administrator" }
                }),

            logout: () =>
                set({
                    isAuthenticated: false,
                    user: null
                }),

            setDeviceSession: (session) => set({ deviceSession: session }),
            setKassirSession: (session) => set({ kassirSession: session }),
            kassirLogout: () => set({ kassirSession: null }),
        }),
        {
            name: getStorageKey(),
            storage: createJSONStorage(() => localStorage),
            // ⚡ PERFORMANCE: Only persist small, auth-critical data.
            // Large arrays (nomenklatura with base64 images, customers, receipts, etc.)
            // are excluded — they are loaded from the API on demand.
            // ubtTables is also excluded — fetched fresh every 10s from API.
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user,
                deviceSession: state.deviceSession,
                kassirSession: state.kassirSession,
                // Persist nomenklatura WITHOUT image field to avoid base64 bloat.
                // staff is NOT persisted — staff page uses React Query (API fetch),
                // so serializing it to localStorage on every action wastes CPU/IO.
                nomenklaturaKategoriyalar: state.nomenklaturaKategoriyalar,
                nomenklaturaTaomlar: state.nomenklaturaTaomlar.map(t => ({ ...t, image: null })),
                nomenklaturaXomashyo: state.nomenklaturaXomashyo,
            }),
        }
    )
);
