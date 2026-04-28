"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
    Boxes, LogOut, BarChart2, TrendingUp, RefreshCw,
    Search, Package, ClipboardList, AlertCircle
} from "lucide-react";

interface Product {
    id: string;
    name: string;
    stock: number;
    minStock: number;
    unit: string;
    costPrice: number;
}

interface MyStats {
    name: string;
    today: { total: number; count: number; cash: number; card: number };
    week: { total: number; count: number };
    month: { total: number; count: number };
    hourlyTimeline: { hour: string; total: number }[];
    recentOrders: { amount: number; method: string; table: string; time: string }[];
}

function fmt(n: number) { return n.toLocaleString("uz-UZ") + " so'm"; }
type TabType = "stock" | "stats";

export default function MobileInventoryPage() {
    const router = useRouter();
    const store = useStore();
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<TabType>("stock");
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [stats, setStats] = useState<MyStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const token = store.kassirSession?.token;

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        setProductsLoading(true);
        try {
            const res = await fetch("/api/ubt/ombor", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || data.items || []);
            }
        } finally { setProductsLoading(false); }
    }, [token]);

    const fetchStats = useCallback(async () => {
        if (!token) return;
        setStatsLoading(true);
        try {
            const res = await fetch("/api/mobile/my-stats", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setStats(await res.json());
        } finally { setStatsLoading(false); }
    }, [token]);

    useEffect(() => {
        setMounted(true);
        if (!store.kassirSession) { router.replace("/"); return; }
        fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.kassirSession, router]);

    useEffect(() => { if (tab === "stats") fetchStats(); }, [tab, fetchStats]);

    if (!mounted || !store.kassirSession) return null;

    const handleLogout = () => { store.kassirLogout(); router.push("/"); };

    const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase())
    );
    const lowStock = filtered.filter(p => p.stock <= p.minStock);
    const okStock = filtered.filter(p => p.stock > p.minStock);

    // ─── STATS VIEW ───────────────────────────────────────────────────────────
    if (tab === "stats") {
        const maxHour = stats ? Math.max(...stats.hourlyTimeline.map(h => h.total), 1) : 1;
        return (
            <div className="flex flex-col min-h-screen bg-slate-50">
                <header className="bg-white shadow-sm px-4 pt-4 pb-0 sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-lg font-black text-slate-800 leading-tight">Mening Otchotim</h1>
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">{store.kassirSession.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchStats} disabled={statsLoading} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95">
                                <RefreshCw size={15} className={statsLoading ? "animate-spin" : ""} />
                            </button>
                            <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95">
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-1 border-b border-slate-100">
                        <button onClick={() => setTab("stock")} className="flex-1 py-2.5 text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 border-b-2 border-transparent">
                            <Boxes size={13} /> Ombor
                        </button>
                        <button onClick={() => setTab("stats")} className="flex-1 py-2.5 text-xs font-bold text-emerald-600 flex items-center justify-center gap-1.5 border-b-2 border-emerald-500">
                            <BarChart2 size={13} /> Otchot
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
                    {statsLoading && !stats ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <RefreshCw size={28} className="animate-spin" />
                            <p className="text-sm font-medium">Yuklanmoqda...</p>
                        </div>
                    ) : stats ? (
                        <>
                            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200">
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-200 mb-1">Bugungi faoliyat</p>
                                <p className="text-3xl font-black mb-3">{fmt(stats.today.total)}</p>
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-emerald-100 uppercase mb-0.5">Operatsiyalar</p>
                                        <p className="text-lg font-black">{stats.today.count}</p>
                                    </div>
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-emerald-100 uppercase mb-0.5">Hafta</p>
                                        <p className="text-base font-black">{stats.week.count} ta</p>
                                    </div>
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-emerald-100 uppercase mb-0.5">Oy</p>
                                        <p className="text-base font-black">{stats.month.count} ta</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <TrendingUp size={14} className="text-emerald-600" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Haftalik</p>
                                    </div>
                                    <p className="text-xl font-black text-slate-800">{fmt(stats.week.total)}</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center">
                                            <ClipboardList size={14} className="text-purple-600" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Oylik</p>
                                    </div>
                                    <p className="text-xl font-black text-slate-800">{fmt(stats.month.total)}</p>
                                </div>
                            </div>
                            {stats.hourlyTimeline.length > 0 && (
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-3">Bugun soat bo'yicha</p>
                                    <div className="flex items-end gap-1.5 h-20">
                                        {stats.hourlyTimeline.map(h => (
                                            <div key={h.hour} className="flex flex-col items-center flex-1 min-w-0 gap-1">
                                                <div className="w-full rounded-t-md bg-emerald-500 transition-all duration-500"
                                                    style={{ height: `${Math.round((h.total / maxHour) * 64)}px`, minHeight: 4 }} />
                                                <span className="text-[8px] font-bold text-slate-400 truncate w-full text-center">{h.hour.slice(0, 2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </main>
            </div>
        );
    }

    // ─── STOCK VIEW ───────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-white shadow-sm px-4 pt-4 pb-0 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-lg font-black text-slate-800 leading-tight">Chaqqon Mobile</h1>
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">{store.kassirSession.name} · Ombor</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchProducts} disabled={productsLoading} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95">
                            <RefreshCw size={15} className={productsLoading ? "animate-spin" : ""} />
                        </button>
                        <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95">
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
                {/* Search */}
                <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Mahsulot izlash..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                </div>
                <div className="flex gap-1 border-b border-slate-100">
                    <button onClick={() => setTab("stock")} className="flex-1 py-2.5 text-xs font-bold text-emerald-600 flex items-center justify-center gap-1.5 border-b-2 border-emerald-500">
                        <Boxes size={13} /> Ombor
                    </button>
                    <button onClick={() => setTab("stats")} className="flex-1 py-2.5 text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 border-b-2 border-transparent">
                        <BarChart2 size={13} /> Otchot
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 pb-8 space-y-4">
                {productsLoading && products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                        <RefreshCw size={28} className="animate-spin" />
                        <p className="text-sm font-medium">Ombor yuklanmoqda...</p>
                    </div>
                ) : (
                    <>
                        {/* Low stock alert */}
                        {lowStock.length > 0 && (
                            <div>
                                <p className="text-[11px] font-black text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <AlertCircle size={12} /> Kam qolgan ({lowStock.length})
                                </p>
                                <div className="space-y-2">
                                    {lowStock.map(p => (
                                        <div key={p.id} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                                <p className="text-xs text-red-500 font-semibold">Min: {p.minStock} {p.unit}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-red-600">{p.stock}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{p.unit}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* OK stock */}
                        {okStock.length > 0 && (
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <Package size={12} /> Barcha mahsulotlar ({okStock.length})
                                </p>
                                <div className="space-y-2">
                                    {okStock.map(p => (
                                        <div key={p.id} className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                                <p className="text-xs text-slate-400">Min: {p.minStock} {p.unit}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-emerald-600">{p.stock}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{p.unit}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {filtered.length === 0 && !productsLoading && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Boxes size={32} className="text-slate-200" />
                                <p className="font-bold text-slate-500">{search ? "Topilmadi" : "Ombor bo'sh"}</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
