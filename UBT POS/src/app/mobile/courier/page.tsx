"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Bike, LogOut, BarChart2, TrendingUp, CreditCard, RefreshCw, Clock, MapPin, Phone, CheckCircle2, Package } from "lucide-react";

interface DeliveryOrder {
    id: string;
    address: string;
    phone: string;
    total: number;
    status: string;
    createdAt: string;
    note?: string;
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

type TabType = "orders" | "stats";

export default function MobileCourierPage() {
    const router = useRouter();
    const store = useStore();
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<TabType>("orders");
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [stats, setStats] = useState<MyStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const token = store.kassirSession?.token;

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        setOrdersLoading(true);
        try {
            const res = await fetch("/api/ubt/yetkazish", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setOrders((data.orders || []).filter((o: DeliveryOrder) => o.status !== "delivered"));
            }
        } finally { setOrdersLoading(false); }
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
        fetchOrders();
        const ti = setInterval(fetchOrders, 15000);
        return () => clearInterval(ti);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.kassirSession, router]);

    useEffect(() => { if (tab === "stats") fetchStats(); }, [tab, fetchStats]);

    const markDelivered = async (id: string) => {
        if (!token) return;
        await fetch(`/api/ubt/yetkazish/${id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ status: "delivered" }),
        });
        fetchOrders();
    };

    if (!mounted || !store.kassirSession) return null;

    const handleLogout = () => { store.kassirLogout(); router.push("/"); };

    // ─── STATS VIEW ───────────────────────────────────────────────────────────
    if (tab === "stats") {
        const maxHour = stats ? Math.max(...stats.hourlyTimeline.map(h => h.total), 1) : 1;
        return (
            <div className="flex flex-col min-h-screen bg-slate-50">
                <header className="bg-white shadow-sm px-4 pt-4 pb-0 sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-lg font-black text-slate-800 leading-tight">Mening Otchotim</h1>
                            <p className="text-xs font-semibold text-red-600 uppercase tracking-widest">{store.kassirSession.name}</p>
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
                        <button onClick={() => setTab("orders")} className="flex-1 py-2.5 text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 border-b-2 border-transparent">
                            <Bike size={13} /> Zakazlar
                        </button>
                        <button onClick={() => setTab("stats")} className="flex-1 py-2.5 text-xs font-bold text-red-600 flex items-center justify-center gap-1.5 border-b-2 border-red-500">
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
                            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg shadow-red-200">
                                <p className="text-xs font-bold uppercase tracking-widest text-red-200 mb-1">Bugungi yetkazish</p>
                                <p className="text-3xl font-black mb-3">{fmt(stats.today.total)}</p>
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-red-100 uppercase mb-0.5">Zakazlar</p>
                                        <p className="text-lg font-black">{stats.today.count}</p>
                                    </div>
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-red-100 uppercase mb-0.5">Naqd</p>
                                        <p className="text-base font-black">{fmt(stats.today.cash)}</p>
                                    </div>
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-red-100 uppercase mb-0.5">Karta</p>
                                        <p className="text-base font-black">{fmt(stats.today.card)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <TrendingUp size={14} className="text-emerald-600" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Hafta</p>
                                    </div>
                                    <p className="text-xl font-black text-slate-800">{fmt(stats.week.total)}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{stats.week.count} ta yetkazish</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center">
                                            <CreditCard size={14} className="text-purple-600" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Oy</p>
                                    </div>
                                    <p className="text-xl font-black text-slate-800">{fmt(stats.month.total)}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{stats.month.count} ta yetkazish</p>
                                </div>
                            </div>
                            {stats.hourlyTimeline.length > 0 && (
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <Clock size={12} /> Bugun soat bo'yicha
                                    </p>
                                    <div className="flex items-end gap-1.5 h-20">
                                        {stats.hourlyTimeline.map(h => (
                                            <div key={h.hour} className="flex flex-col items-center flex-1 min-w-0 gap-1">
                                                <div className="w-full rounded-t-md bg-red-500 transition-all duration-500"
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

    // ─── ORDERS VIEW ─────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-white shadow-sm px-4 pt-4 pb-0 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-lg font-black text-slate-800 leading-tight">Chaqqon Mobile</h1>
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest">{store.kassirSession.name} · Kuryer</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchOrders} disabled={ordersLoading} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95">
                            <RefreshCw size={15} className={ordersLoading ? "animate-spin" : ""} />
                        </button>
                        <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95">
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
                <div className="flex gap-1 border-b border-slate-100">
                    <button onClick={() => setTab("orders")} className="flex-1 py-2.5 text-xs font-bold text-red-600 flex items-center justify-center gap-1.5 border-b-2 border-red-500">
                        <Bike size={13} /> Zakazlar
                    </button>
                    <button onClick={() => setTab("stats")} className="flex-1 py-2.5 text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 border-b-2 border-transparent">
                        <BarChart2 size={13} /> Otchot
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-3 pb-8">
                {ordersLoading && orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                        <RefreshCw size={28} className="animate-spin" />
                        <p className="text-sm font-medium">Zakazlar yuklanmoqda...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                        <Package size={40} className="text-slate-200" />
                        <p className="font-bold text-slate-500">Hozircha yangi zakaz yo'q</p>
                        <p className="text-sm text-slate-400">Zakazlar kelganda bu yerda chiqadi</p>
                    </div>
                ) : orders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Yetkazish</span>
                            <span className="text-[10px] font-bold text-slate-500">{new Date(order.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="p-4 space-y-2">
                            <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-red-400 mt-0.5 shrink-0" />
                                <p className="text-sm font-semibold text-slate-700">{order.address}</p>
                            </div>
                            {order.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" />
                                    <a href={`tel:${order.phone}`} className="text-sm font-bold text-blue-600">{order.phone}</a>
                                </div>
                            )}
                            {order.note && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{order.note}</p>}
                            <div className="flex items-center justify-between pt-1">
                                <p className="text-base font-black text-slate-800">{fmt(order.total)}</p>
                                <button
                                    onClick={() => markDelivered(order.id)}
                                    className="flex items-center gap-1.5 bg-emerald-500 active:bg-emerald-600 text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95 transition-all"
                                >
                                    <CheckCircle2 size={14} /> Yetkazildi
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}
