"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore, UbtTable } from "@/lib/store";
import {
    UtensilsCrossed, LogOut, ChevronLeft, BarChart2,
    TrendingUp, CreditCard, Wallet, RefreshCw, Clock, ShoppingBag
} from "lucide-react";

interface MyStats {
    name: string;
    today: { total: number; count: number; cash: number; card: number };
    week: { total: number; count: number };
    month: { total: number; count: number };
    hourlyTimeline: { hour: string; total: number }[];
    recentOrders: { amount: number; method: string; table: string; time: string }[];
}

function fmt(n: number) {
    return n.toLocaleString("uz-UZ") + " so'm";
}

type TabType = "tables" | "stats";

export default function MobileWaiterPage() {
    const router = useRouter();
    const store = useStore();
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<TabType>("tables");
    const [selectedTable, setSelectedTable] = useState<UbtTable | null>(null);
    const [stats, setStats] = useState<MyStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        const token = store.kassirSession?.token;
        if (!token) return;
        setStatsLoading(true);
        try {
            const res = await fetch("/api/mobile/my-stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setStats(await res.json());
        } finally {
            setStatsLoading(false);
        }
    }, [store.kassirSession?.token]);

    useEffect(() => {
        setMounted(true);
        if (!store.kassirSession) { router.replace("/"); return; }
        store.fetchUbtTables();
        const ti = setInterval(() => store.fetchUbtTables(), 10000);
        return () => clearInterval(ti);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.kassirSession, router]);

    useEffect(() => {
        if (tab === "stats") fetchStats();
    }, [tab, fetchStats]);

    if (!mounted || !store.kassirSession) return null;

    const handleLogout = () => { store.kassirLogout(); router.push("/"); };

    // ─── STATS VIEW ──────────────────────────────────────────────────────────
    if (tab === "stats") {
        const maxHour = stats ? Math.max(...stats.hourlyTimeline.map(h => h.total), 1) : 1;
        return (
            <div className="flex flex-col min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-white shadow-sm px-4 pt-4 pb-0 sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-lg font-black text-slate-800 leading-tight">Mening Otchotim</h1>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{store.kassirSession.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchStats} disabled={statsLoading} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
                                <RefreshCw size={15} className={statsLoading ? "animate-spin" : ""} />
                            </button>
                            <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>
                    {/* Bottom nav tabs */}
                    <div className="flex gap-1 border-b border-slate-100">
                        <button onClick={() => setTab("tables")} className="flex-1 py-2.5 text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 border-b-2 border-transparent">
                            <UtensilsCrossed size={13} /> Stollar
                        </button>
                        <button onClick={() => setTab("stats")} className="flex-1 py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 border-b-2 border-blue-500">
                            <BarChart2 size={13} /> Otchot
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
                    {statsLoading && !stats && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <RefreshCw size={28} className="animate-spin" />
                            <p className="text-sm font-medium">Ma'lumotlar yuklanmoqda...</p>
                        </div>
                    )}
                    {stats && (
                        <>
                            {/* Today summary */}
                            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Bugungi savdo</p>
                                <p className="text-3xl font-black mb-3">{fmt(stats.today.total)}</p>
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-blue-100 uppercase mb-0.5">Zakazlar</p>
                                        <p className="text-lg font-black">{stats.today.count}</p>
                                    </div>
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-blue-100 uppercase mb-0.5">Naqd</p>
                                        <p className="text-base font-black">{fmt(stats.today.cash)}</p>
                                    </div>
                                    <div className="flex-1 bg-white/15 rounded-xl p-2.5 text-center">
                                        <p className="text-[10px] font-bold text-blue-100 uppercase mb-0.5">Karta</p>
                                        <p className="text-base font-black">{fmt(stats.today.card)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Week & Month */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <TrendingUp size={14} className="text-emerald-600" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Hafta</p>
                                    </div>
                                    <p className="text-xl font-black text-slate-800">{fmt(stats.week.total)}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{stats.week.count} ta zakaz</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center">
                                            <CreditCard size={14} className="text-purple-600" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Oy</p>
                                    </div>
                                    <p className="text-xl font-black text-slate-800">{fmt(stats.month.total)}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{stats.month.count} ta zakaz</p>
                                </div>
                            </div>

                            {/* Hourly chart */}
                            {stats.hourlyTimeline.length > 0 && (
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <Clock size={12} /> Bugun soat bo'yicha
                                    </p>
                                    <div className="flex items-end gap-1.5 h-20">
                                        {stats.hourlyTimeline.map(h => (
                                            <div key={h.hour} className="flex flex-col items-center flex-1 min-w-0 gap-1">
                                                <div
                                                    className="w-full rounded-t-md bg-blue-500 transition-all duration-500"
                                                    style={{ height: `${Math.round((h.total / maxHour) * 64)}px`, minHeight: 4 }}
                                                />
                                                <span className="text-[8px] font-bold text-slate-400 truncate w-full text-center">{h.hour.slice(0, 2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent orders */}
                            {stats.recentOrders.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide px-4 pt-4 pb-2 flex items-center gap-1.5">
                                        <ShoppingBag size={12} /> Oxirgi zakazlar
                                    </p>
                                    <div className="divide-y divide-slate-50">
                                        {stats.recentOrders.map((o, i) => (
                                            <div key={i} className="px-4 py-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{o.table}</p>
                                                    <p className="text-[11px] text-slate-400">{o.time} · {o.method}</p>
                                                </div>
                                                <p className="text-sm font-black text-emerald-600">{fmt(o.amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        );
    }

    // ─── TABLE DETAIL VIEW ────────────────────────────────────────────────────
    if (selectedTable) {
        return (
            <div className="flex flex-col h-screen bg-slate-50">
                <header className="bg-blue-600 text-white shadow-md px-4 py-4 flex items-center justify-between z-10 sticky top-0">
                    <button onClick={() => setSelectedTable(null)} className="p-2 -ml-2 hover:bg-blue-700 rounded-full transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-black leading-tight">{selectedTable.name}</h1>
                        <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-widest">
                            {selectedTable.zone} · {selectedTable.seats} o'rin
                        </p>
                    </div>
                    <div className="w-10" />
                </header>
                <main className="flex-1 overflow-y-auto p-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center text-blue-800">
                        <UtensilsCrossed size={32} className="mx-auto mb-3 text-blue-400" />
                        <h3 className="font-bold mb-1">Tez orada...</h3>
                        <p className="text-sm text-blue-600/80">Ushbu stolga buyurtma kiritish funksiyasi tez orada qo'shiladi.</p>
                    </div>
                </main>
            </div>
        );
    }

    // ─── TABLES VIEW ─────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white shadow-sm px-4 pt-4 pb-0 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-lg font-black text-slate-800 leading-tight">Chaqqon Mobile</h1>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{store.kassirSession.name} · Ofitsiant</p>
                    </div>
                    <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
                        <LogOut size={15} />
                    </button>
                </div>
                {/* Bottom nav tabs */}
                <div className="flex gap-1 border-b border-slate-100">
                    <button onClick={() => setTab("tables")} className="flex-1 py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 border-b-2 border-blue-500">
                        <UtensilsCrossed size={13} /> Stollar
                    </button>
                    <button onClick={() => setTab("stats")} className="flex-1 py-2.5 text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 border-b-2 border-transparent">
                        <BarChart2 size={13} /> Otchot
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-3">
                    {store.ubtTables.map(t => {
                        const isBusy = t.status === "occupied";
                        const isMyTable = isBusy && t.waiter === store.kassirSession?.name;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTable(t)}
                                className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 active:scale-95 transition-all
                                    ${isBusy
                                        ? isMyTable
                                            ? "bg-blue-50 border-blue-500 shadow-[0_8px_20px_rgba(59,130,246,0.15)]"
                                            : "bg-orange-50 border-orange-300 opacity-70"
                                        : "bg-white border-slate-200 shadow-sm"
                                    }`}
                            >
                                {isMyTable && (
                                    <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                                        Sizniki
                                    </span>
                                )}
                                <span className={`text-2xl font-black mb-1 ${isBusy ? isMyTable ? "text-blue-700" : "text-orange-600" : "text-slate-800"}`}>
                                    {t.name}
                                </span>
                                <span className={`text-[10px] font-bold uppercase ${isBusy ? isMyTable ? "text-blue-400" : "text-orange-400" : "text-emerald-500"}`}>
                                    {isBusy ? "Band" : "Bo'sh"}
                                </span>
                                <span className="text-[9px] text-slate-400 mt-0.5">{t.zone} · {t.seats} o'rin</span>
                            </button>
                        );
                    })}
                </div>
                {store.ubtTables.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                        <UtensilsCrossed size={32} className="text-slate-300" />
                        <p className="font-bold">Stollar topilmadi</p>
                        <button onClick={() => store.fetchUbtTables()} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                            <RefreshCw size={13} /> Yangilash
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
