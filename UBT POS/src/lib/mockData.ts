// Mock data for all ChaqqonPro modules

export const mockBranches = [
    { id: "1", name: "Asosiy Filial", city: "Toshkent", manager: "Admin", status: "active" },
];

export const mockRevenueChart: any[] = [];

export const mockKPI = {
    todaySales: 0,
    todaySalesChange: 0,
    totalRevenue: 0,
    totalRevenueChange: 0,
    activeOrders: 0,
    activeOrdersChange: 0,
    staffOnline: 1,
    staffOnlineChange: 0,
};

export const mockTopProducts: any[] = [];

export const mockRecentTransactions: any[] = [];

export const mockProducts: any[] = [];

export const mockCustomers: any[] = [];

export const mockStaff = [
    { id: "S001", name: "Admin Test", role: "Administrator", branch: "Asosiy Filial", phone: "+998 90 000 00 00", salary: 0, hireDate: "2026-01-01", status: "online" as const, shiftStart: "08:00", sales: 0, transactions: 0, pin: "0000", permissions: ["pos", "inventory", "crm", "reports", "staff", "ai", "ubt", "pharmacy", "wholesale", "ecommerce", "discounts", "refunds", "priceEdit", "stockEdit", "reportExport", "customerEdit", "shiftManage"], username: "admin", password: "admin" },
    { id: "S002", name: "Kassir Test", role: "Kassir", branch: "Asosiy Filial", phone: "+998 90 111 11 11", salary: 0, hireDate: "2026-01-01", status: "online" as const, shiftStart: "08:00", sales: 0, transactions: 0, pin: "1111", permissions: ["pos", "discounts", "refunds"], username: "kassir", password: "kassir" },
];

export const mockFraudAlerts: any[] = [];

export const mockAIForecasts: any[] = [];

export const mockUbtTables = [
    // Birinchi qavat — 16 tables
    { id: "BQ01", name: "1",  seats: 4, zone: "Birinchi qavat", status: "occupied", order: "#ORD-001", amount: 33000,   since: "17:34", waiter: "Kamoliddin" },
    { id: "BQ02", name: "2",  seats: 4, zone: "Birinchi qavat", status: "occupied", order: "#ORD-002", amount: 33000,   since: "11:15", waiter: "Kamoliddin" },
    { id: "BQ03", name: "3",  seats: 6, zone: "Birinchi qavat", status: "receipt",  order: "#ORD-003", amount: 159500,  since: "16:10", waiter: "Kamoliddin" },
    { id: "BQ04", name: "4",  seats: 4, zone: "Birinchi qavat", status: "occupied", order: "#ORD-004", amount: 247500,  since: "21:20", waiter: "Kamoliddin" },
    { id: "BQ05", name: "5",  seats: 4, zone: "Birinchi qavat", status: "occupied", order: "#ORD-005", amount: 115500,  since: "12:11", waiter: "Kamoliddin" },
    { id: "BQ06", name: "6",  seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ07", name: "7",  seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ08", name: "8",  seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ09", name: "9",  seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ10", name: "10", seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ11", name: "11", seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ12", name: "12", seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ13", name: "13", seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ14", name: "14", seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ15", name: "15", seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "BQ16", name: "16", seats: 4, zone: "Birinchi qavat", status: "free",     order: null, amount: 0, since: null },
    // zal — 3 tables
    { id: "ZL01", name: "1",  seats: 4, zone: "zal", status: "occupied", order: "#ORD-006", amount: 57500,  since: "14:14", waiter: "Navruz" },
    { id: "ZL02", name: "2",  seats: 4, zone: "zal", status: "occupied", order: "#ORD-007", amount: 103500, since: "14:15", waiter: "Navruz" },
    { id: "ZL03", name: "3",  seats: 4, zone: "zal", status: "free",     order: null, amount: 0, since: null },
    // Ikkinchi qavat — 4 tables
    { id: "IQ01", name: "1",  seats: 4, zone: "Ikkinchi qavat", status: "occupied", order: "#ORD-008", amount: 161000, since: "19:55", waiter: "Kamoliddin" },
    { id: "IQ02", name: "2",  seats: 4, zone: "Ikkinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "IQ03", name: "3",  seats: 4, zone: "Ikkinchi qavat", status: "free",     order: null, amount: 0, since: null },
    { id: "IQ04", name: "4",  seats: 4, zone: "Ikkinchi qavat", status: "free",     order: null, amount: 0, since: null },
    // Podval — 5 tables
    { id: "PV01", name: "1",  seats: 4, zone: "Podval", status: "free", order: null, amount: 0, since: null },
    { id: "PV02", name: "2",  seats: 4, zone: "Podval", status: "free", order: null, amount: 0, since: null },
    { id: "PV03", name: "3",  seats: 4, zone: "Podval", status: "free", order: null, amount: 0, since: null },
    { id: "PV04", name: "4",  seats: 4, zone: "Podval", status: "free", order: null, amount: 0, since: null },
    { id: "PV05", name: "5",  seats: 4, zone: "Podval", status: "free", order: null, amount: 0, since: null },
];

export const mockKDSOrders: any[] = [];

export const mockPharmacyDrugs: any[] = [];

export const mockWholesaleClients: any[] = [];

export const mockOnlineOrders: any[] = [];

export const mockProfitLoss: any[] = [];

// ================= Nomenklatura (UBT) =================
export const mockNomenklaturaKategoriyalar = [
    { id: "C1", name: "Milliy taomlar", itemCount: 12 },
    { id: "C2", name: "Yevropa taomlari", itemCount: 8 },
    { id: "C3", name: "Ichimliklar", itemCount: 15 },
    { id: "C4", name: "Shirinliklar", itemCount: 6 },
];

export const mockNomenklaturaTaomlar = [
    { id: "T1", name: "Osh", categoryId: "C1", price: 35000, cost: 20000, inStock: true },
    { id: "T2", name: "Shashlik", categoryId: "C1", price: 15000, cost: 8000, inStock: true },
    { id: "T3", name: "Coca Cola 1L", categoryId: "C3", price: 12000, cost: 8000, inStock: true },
    { id: "T4", name: "Choy (Qora)", categoryId: "C3", price: 5000, cost: 1000, inStock: true },
    { id: "T5", name: "Muzqaymoq", categoryId: "C4", price: 20000, cost: 10000, inStock: true },
];

export const mockNomenklaturaXomashyo = [
    { id: "X1", name: "Go'sht (Mol)", unit: "kg", stock: 50, price: 85000 },
    { id: "X2", name: "Guruch", unit: "kg", stock: 120, price: 18000 },
    { id: "X3", name: "Yog'", unit: "litr", stock: 45, price: 15000 },
    { id: "X4", name: "Sabzi", unit: "kg", stock: 80, price: 4000 },
    { id: "X5", name: "Piyoz", unit: "kg", stock: 60, price: 3000 },
];

export const formatCurrency = (n: number) =>
    new Intl.NumberFormat("uz-UZ").format(n) + " so'm";

export const formatCurrencyShort = (n: number) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
    if (n >= 1000) return (n / 1000).toFixed(0) + " ming";
    return n.toString();
};
