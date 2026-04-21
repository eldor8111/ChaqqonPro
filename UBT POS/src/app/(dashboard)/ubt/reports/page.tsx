"use client";
import { useState, useMemo, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { formatCurrency, formatCurrencyShort } from "@/lib/mockData";
import {
    BarChart3, PieChart, Users, UserCheck, Utensils, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Calendar, Download
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Pie, Cell, LineChart, Line
} from "recharts";
import clsx from "clsx";
import DateRangePicker, { type DateRange } from "@/components/ui/DateRangePicker";

type ReportTab = "dish" | "order" | "waiter" | "cashier" | "return" | "expense" | "income";

const TABS: { id: ReportTab; label: string; icon: any }[] = [
    { id: "dish", label: "Taomlar", icon: Utensils },
    { id: "order", label: "Zakazlar", icon: BarChart3 },
    { id: "waiter", label: "Ofitsiantlar", icon: Users },
    { id: "cashier", label: "Kassirlar", icon: UserCheck },
    { id: "return", label: "Qaytarilgan", icon: AlertTriangle },
    { id: "income", label: "Kirimlar", icon: ArrowUpCircle },
    { id: "expense", label: "Xarajatlar", icon: ArrowDownCircle },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];

// ─── Timeframe Selector ───────────────────────────────────────────────────────
function TimeframeSelector({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const options = [
        { id: "today", label: "Bugun (Soatlik)" },
        { id: "week",  label: "So'nggi 7 kun (Kunlik)" },
        { id: "month", label: "Shu oy (Kunlik)" },
        { id: "year",  label: "Shu yil (Oylik)" },
        { id: "all",   label: "Barchasi" },
    ];
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-2 bg-surface-card border border-surface-border text-slate-800 text-sm font-medium rounded-xl px-4 py-2.5 shadow-sm hover:border-brand-400 hover:shadow-md transition-all active:scale-[0.98]">
                <Calendar size={16} className="text-brand-500" />
                {options.find(o => o.id === value)?.label || "Tanlang"}
            </button>
            {open && (
                <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map(opt => (
                        <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }} className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors ${value === opt.id ? "bg-brand-50 text-brand-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                </>
            )}
        </div>
    );
}

export default function UbtReportsPage() {
    const { t } = useLang();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ReportTab>("order");
    const [dateFilter, setDateFilter] = useState<{ timeframe: string; range: DateRange }>({
        timeframe: "today",
        range: null
    });
    const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

    function buildQuery(base: string) {
        if (dateFilter.range) {
            return `${base}&from=${dateFilter.range.from}&to=${dateFilter.range.to}`;
        }
        return `${base}&timeframe=${dateFilter.timeframe}`;
    }

    const [txData, setTxData] = useState<{
        transactions: any[];
        summary: { totalToday: number; countToday: number; byMethod: Record<string, { total: number; count: number }> };
    }>({ transactions: [], summary: { totalToday: 0, countToday: 0, byMethod: {} } });

    const [realReturns, setRealReturns] = useState<any[]>([]);

    const [reportsData, setReportsData] = useState<{
        topDishes: any[];
        staffMetrics: any[];
        ordersTimeline: any[];
        expenses: { writingOffs: number; salaries: number; customExpenses: number; };
    }>({
        topDishes: [],
        staffMetrics: [],
        ordersTimeline: [],
        expenses: { writingOffs: 0, salaries: 0, customExpenses: 0 }
    });

    useEffect(() => {
        const fetchTx = async () => {
            try {
                const res = await fetch(buildQuery("/api/transactions?limit=500"));
                if (res.status === 401) { router.replace("/"); return; }
                if (res.ok) setTxData(await res.json());
            } catch {}
        };
        fetchTx();

        const fetchReturns = async () => {
            try {
                const res = await fetch(buildQuery("/api/ubt/reports-returns?"));
                if (res.ok) {
                    const data = await res.json();
                    setRealReturns(data.returns || []);
                }
            } catch {}
        };
        fetchReturns();

        const fetchReportsData = async () => {
            try {
                const res = await fetch(buildQuery("/api/ubt/reports-data?"));
                if (res.ok) {
                    const data = await res.json();
                    setReportsData(data);
                }
            } catch {}
        };
        fetchReportsData();
    }, [router, dateFilter]);

    const recentTransactions = txData.transactions;

    // Computed Data
    const DISH_DATA = useMemo(() => {
        return reportsData.topDishes || [];
    }, [reportsData.topDishes]);

    const ORDER_DATA = useMemo(() => {
        return reportsData.ordersTimeline || [];
    }, [reportsData.ordersTimeline]);

    const WAITER_DATA = useMemo(() => {
        return reportsData.staffMetrics
            .filter((s: any) => Array.isArray(s.roles) ? s.roles.includes("Ofitsiant") : typeof s.roles === "string" && s.roles.includes("Ofitsiant"))
            .map((s: any) => ({
                name: s.name,
                orders: s.transactions || 0,
                revenue: s.sales || 0,
                rating: 4.5 + Math.random() * 0.5,
            }));
    }, [reportsData.staffMetrics]);

    const CASHIER_DATA = useMemo(() => {
        return reportsData.staffMetrics
            .filter((s: any) => Array.isArray(s.roles) ? s.roles.includes("Kassir") : typeof s.roles === "string" && s.roles.includes("Kassir"))
            .map((s: any) => ({
                name: s.name,
                transactions: s.transactions || 0,
                amount: s.sales || 0,
                cash: s.cash || 0,
                card: s.card || 0,
            }));
    }, [reportsData.staffMetrics]);

    const RETURN_DATA = useMemo(() => {
        return realReturns.map(e => {
            const dateObj = new Date(e.createdAt || e.date);
            const dateStr = dateObj.toLocaleDateString("en-GB") + " " + dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            const price = e.product?.sellingPrice || 15000;
            return {
                date: dateStr,
                dish: e.productName,
                waiter: e.employee || "Noma'lum",
                reason: "Qaytarilgan",
                amount: e.quantity * price,
            };
        });
    }, [realReturns]);

    const EXPENSE_DATA = useMemo(() => {
        let expenses = [];
        const e = reportsData.expenses;
        expenses.push({ category: "Mahsulot yo'qotishlari", amount: e.writingOffs || 0 });
        expenses.push({ category: "Oylik maoshlar", amount: e.salaries || 0 });
        expenses.push({ category: "Boshqa xarajatlar", amount: e.customExpenses || 0 });
        
        return expenses.filter(ex => ex.amount > 0);
    }, [reportsData.expenses]);

    const INCOME_DATA = useMemo(() => {
        const bm = txData.summary.byMethod;
        return [
            { type: "Naqd pul",     amount: bm["Naqd pul"]?.total ?? 0 },
            { type: "Plastik karta", amount: bm["Plastik karta"]?.total ?? 0 },
            { type: "QR kod",       amount: bm["QR kod"]?.total ?? 0 },
        ].filter(i => i.amount > 0);
    }, [txData.summary.byMethod]);

    const totalOrders = ORDER_DATA.reduce((s, d) => s + d.count, 0);
    const totalRevenue = ORDER_DATA.reduce((s, d) => s + d.revenue, 0);
    const avgCheck = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    function renderEmptyData() {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <BarChart3 size={40} className="mb-3 opacity-50" />
                <p>Ma'lumot topilmadi.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('reports.title') || 'UBT Hisobotlari'}</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {t('reports.subTitle') || "Restoran faoliyati bo'yicha batafsil statistika va tahlil."}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <DateRangePicker value={dateFilter} onChange={setDateFilter} />
                    <button className="btn-primary flex items-center gap-2">
                        <Download size={16} /> Eksport
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "flex flex-shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                                active
                                    ? "bg-brand-500/10 border-brand-500 text-brand-400 shadow-[0_0_15px_rgba(var(--brand-500),0.1)]"
                                    : "bg-surface-card border-surface-border text-slate-400 hover:text-slate-800 hover:bg-surface-elevated"
                            )}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="glass-card p-5 min-h-[500px]">

                {/* 1. TAOMLAR */}
                {activeTab === "dish" && (
                    <div className="space-y-6 animate-slide-up">
                        <h2 className="section-title">Taomlar reytingi (Batafsil ro'yxat)</h2>
                        {DISH_DATA.length === 0 ? renderEmptyData() : (
                            <div className="overflow-x-auto">
                                <table className="data-table w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Taom rasm</th>
                                            <th>Taom nomi</th>
                                            <th className="text-right">Sotilgan soni</th>
                                            <th className="text-right">Tushum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DISH_DATA.map((d: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-100 transition-colors">
                                                <td className="w-10 text-slate-400 font-bold">{i + 1}</td>
                                                <td className="w-14">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                                                        {d.image ? <img src={d.image} alt={d.name} className="w-full h-full object-cover" /> : <Utensils size={14} className="text-slate-500" />}
                                                    </div>
                                                </td>
                                                <td className="font-bold text-slate-200">{d.name}</td>
                                                <td className="text-right whitespace-nowrap">
                                                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-medium">{d.qty} ta</span>
                                                </td>
                                                <td className="text-right whitespace-nowrap text-emerald-400 font-black tracking-tight">{formatCurrency(d.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. ZAKAZLAR */}
                {activeTab === "order" && (
                    <div className="space-y-6 animate-slide-up">
                        <h2 className="section-title">Kunlik zakazlar dinamikasi</h2>
                        {totalOrders === 0 ? renderEmptyData() : (
                            <>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={ORDER_DATA}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                                            <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} />
                                            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCurrencyShort(v)} stroke="#64748b" tick={{ fontSize: 11 }} />
                                            <Tooltip
                                                formatter={(v: number, n: string) => [n === "revenue" ? formatCurrency(v) : `${v} ta`, n === "revenue" ? "Tushum" : "Zakazlar"]}
                                                contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "10px" }}
                                            />
                                            <Legend />
                                            <Line yAxisId="left" type="monotone" dataKey="count" name="Zakazlar soni" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                            <Line yAxisId="right" type="monotone" dataKey="revenue" name="Tushum" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                    <div className="p-4 rounded-xl border border-surface-border bg-surface-elevated">
                                        <p className="text-sm text-slate-400">Jami zakazlar</p>
                                        <p className="text-2xl font-bold text-slate-800 mt-1">{totalOrders} ta</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-surface-border bg-surface-elevated">
                                        <p className="text-sm text-slate-400">Jami tushum</p>
                                        <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(totalRevenue)}</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-surface-border bg-surface-elevated">
                                        <p className="text-sm text-slate-400">O'rtacha chek</p>
                                        <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(avgCheck)}</p>
                                    </div>
                                </div>
                                <div className="mt-8 border-t border-surface-border pt-6">
                                    <h3 className="text-lg font-bold text-slate-200 mb-4">So'nggi tranzaksiyalar hujjati ({recentTransactions.length} ta)</h3>
                                    {recentTransactions.length === 0 ? (
                                        <p className="text-slate-400 text-sm">Tranzaksiyalar mavjud emas.</p>
                                    ) : (
                                        <div className="overflow-x-auto max-h-96 custom-scrollbar">
                                            <table className="data-table w-full text-sm">
                                                <thead className="sticky top-0 bg-surface-card z-10">
                                                    <tr>
                                                        <th>Sana / Vaqt</th>
                                                        <th>Kassir/Ofitsiant</th>
                                                        <th>To'lov turi</th>
                                                        <th>Summa</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentTransactions.map((tx: any, i: number) => {
                                                        const d = new Date(tx.createdAt);
                                                        const dStr = d.toLocaleDateString("en-GB") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
                                                        const isExpanded = expandedTxId === tx.id;
                                                        return (
                                                            <Fragment key={tx.id || i}>
                                                                <tr 
                                                                    className="cursor-pointer hover:bg-surface-elevated/50 transition-colors"
                                                                    onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                                                                >
                                                                    <td className="text-slate-400 whitespace-nowrap">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-slate-500 text-[10px]">{isExpanded ? '▼' : '▶'}</span>
                                                                            {dStr}
                                                                        </div>
                                                                    </td>
                                                                    <td className="font-medium text-slate-200">{tx.kassirName || "Admin"}</td>
                                                                    <td>
                                                                        <span className={clsx(
                                                                            "px-2 py-1 rounded text-xs font-semibold whitespace-nowrap",
                                                                            tx.method?.includes("Naqd") ? "bg-emerald-500/10 text-emerald-400" :
                                                                            tx.method?.includes("Karta") || tx.method?.includes("Plastik") ? "bg-blue-500/10 text-blue-400" :
                                                                            "bg-slate-500/10 text-slate-400"
                                                                        )}>
                                                                            {tx.method || "Boshqa"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="font-bold text-emerald-400">{formatCurrency(tx.amount)}</td>
                                                                </tr>
                                                                {isExpanded && tx.items && tx.items.length > 0 && (
                                                                    <tr className="bg-surface-card/40">
                                                                        <td colSpan={4} className="p-0 border-0">
                                                                            <div className="bg-white rounded-lg m-2 p-3 shadow-inner">
                                                                                <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Buyurtma tarkibi</h4>
                                                                                <ul className="space-y-1">
                                                                                    {tx.items.map((it: any, j: number) => (
                                                                                        <li key={it.id || j} className="flex justify-between items-center text-sm py-1.5 border-b border-surface-border/50 last:border-0 hover:bg-surface-elevated/30 rounded px-2">
                                                                                            <span className="flex items-center gap-2">
                                                                                                <span className="text-emerald-400 font-bold tracking-wide text-sm">{it.name}</span>
                                                                                                <span className="text-slate-500 font-bold text-[10px] mx-1">x</span> 
                                                                                                <span className="bg-slate-700/60 border border-slate-600/50 text-white font-black text-xs px-2 py-0.5 rounded-md min-w-[28px] text-center shadow-sm">
                                                                                                    {it.quantity}
                                                                                                </span>
                                                                                            </span>
                                                                                            <span className="text-emerald-400/90 font-semibold">{formatCurrency(it.price * it.quantity)}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 3. OFITSIANTLAR */}
                {activeTab === "waiter" && (
                    <div className="space-y-6 animate-slide-up">
                        <h2 className="section-title">Ofitsiantlar faoliyati (KPI)</h2>
                        {WAITER_DATA.length === 0 ? renderEmptyData() : (
                            <div className="overflow-x-auto">
                                <table className="data-table w-full">
                                    <thead>
                                        <tr>
                                            <th>Ofitsiant</th>
                                            <th className="whitespace-nowrap">Xizmat qilingan zakazlar</th>
                                            <th className="whitespace-nowrap">Keltirilgan tushum</th>
                                            <th className="whitespace-nowrap">Reyting / Choy-chaqa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {WAITER_DATA.map((w, i) => (
                                            <tr key={i}>
                                                <td className="font-semibold text-brand-400 whitespace-nowrap">👤 {w.name}</td>
                                                <td className="whitespace-nowrap">{w.orders} ta</td>
                                                <td className="font-medium text-emerald-400 whitespace-nowrap">{formatCurrency(w.revenue)}</td>
                                                <td className="whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-amber-400">★ {w.rating.toFixed(1)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. KASSIRLAR */}
                {activeTab === "cashier" && (
                    <div className="space-y-6 animate-slide-up">
                        <h2 className="section-title">Kassirlar hisoboti</h2>
                        {CASHIER_DATA.length === 0 ? renderEmptyData() : (
                            <div className="overflow-x-auto">
                                <table className="data-table w-full">
                                    <thead>
                                        <tr>
                                            <th className="whitespace-nowrap">Kassir ismi</th>
                                            <th className="whitespace-nowrap">Tranzaksiyalar soni</th>
                                            <th className="whitespace-nowrap">Naqd (tushum)</th>
                                            <th className="whitespace-nowrap">Plastik Karta (tushum)</th>
                                            <th className="whitespace-nowrap">Jami O'tkazilgan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {CASHIER_DATA.map((c, i) => (
                                            <tr key={i}>
                                                <td className="font-semibold whitespace-nowrap">👩‍💼 {c.name}</td>
                                                <td className="whitespace-nowrap">{c.transactions} ta</td>
                                                <td className="text-green-400 whitespace-nowrap">{formatCurrency(c.cash)}</td>
                                                <td className="text-blue-400 whitespace-nowrap">{formatCurrency(c.card)}</td>
                                                <td className="font-bold text-emerald-400 whitespace-nowrap">{formatCurrency(c.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. QAYTARILGAN */}
                {activeTab === "return" && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="section-title text-red-400">Bekor qilingan / Qaytarilgan zakazlar</h2>
                            <p className="font-bold text-red-500">
                                Jami yo'qotish: {formatCurrency(RETURN_DATA.reduce((s, r) => s + r.amount, 0))}
                            </p>
                        </div>
                        {RETURN_DATA.length === 0 ? renderEmptyData() : (
                            <div className="overflow-x-auto">
                                <table className="data-table w-full">
                                    <thead>
                                        <tr>
                                            <th className="whitespace-nowrap">Sana / Vaqt</th>
                                            <th className="whitespace-nowrap">Taom nomi</th>
                                            <th className="whitespace-nowrap">Ofitsiant</th>
                                            <th className="whitespace-nowrap">Sabab</th>
                                            <th className="whitespace-nowrap">Summa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {RETURN_DATA.map((r, i) => (
                                            <tr key={i}>
                                                <td className="text-slate-400 whitespace-nowrap">{r.date}</td>
                                                <td className="font-medium whitespace-nowrap">{r.dish}</td>
                                                <td className="whitespace-nowrap">{r.waiter}</td>
                                                <td className="text-red-400 whitespace-nowrap">{r.reason}</td>
                                                <td className="font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(r.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* 6. EXPENSES */}
                {activeTab === "expense" && (
                    <div className="space-y-6 animate-slide-up">
                        {EXPENSE_DATA.length === 0 ? renderEmptyData() : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h2 className="section-title mb-6 text-red-400">Xarajatlar tarkibi</h2>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={EXPENSE_DATA} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                                                    {EXPENSE_DATA.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "10px" }} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
                                        <p className="text-sm text-red-400/80 mb-1">Ushbu oydagi umumiy xarajatlar</p>
                                        <p className="text-3xl font-bold text-red-500">{formatCurrency(EXPENSE_DATA.reduce((sum, e) => sum + e.amount, 0))}</p>
                                    </div>
                                    <ul className="space-y-3">
                                        {EXPENSE_DATA.map((e, i) => (
                                            <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-surface-border">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                    <span className="font-medium text-slate-200">{e.category}</span>
                                                </div>
                                                <span className="font-semibold text-slate-800">{formatCurrency(e.amount)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 7. INCOME */}
                {activeTab === "income" && (
                    <div className="space-y-6 animate-slide-up">
                        {INCOME_DATA.length === 0 ? renderEmptyData() : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h2 className="section-title mb-6 text-emerald-400">Kirimlar manbalari</h2>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={INCOME_DATA.filter(i => i.amount > 0)} dataKey="amount" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                                                    {INCOME_DATA.filter(i => i.amount > 0).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "10px" }} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                                        <p className="text-sm text-emerald-400/80 mb-1">Ushbu oydagi to'liq daromad</p>
                                        <p className="text-3xl font-bold text-emerald-500">{formatCurrency(INCOME_DATA.reduce((sum, e) => sum + e.amount, 0))}</p>
                                    </div>
                                    <ul className="space-y-3">
                                        {INCOME_DATA.map((e, i) => (
                                            <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-surface-border">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                    <span className="font-medium text-slate-200">{e.type}</span>
                                                </div>
                                                <span className="font-semibold text-slate-800">{formatCurrency(e.amount)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
