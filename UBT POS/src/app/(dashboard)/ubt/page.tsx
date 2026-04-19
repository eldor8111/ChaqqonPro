"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
    ShoppingBag, ShoppingCart, Wallet, TrendingUp, TrendingDown,
    DollarSign, Package, PackageMinus, Warehouse, Receipt,
    Users, CreditCard, ChevronLeft, ChevronRight,
    Banknote, QrCode, UtensilsCrossed, ChefHat, Calendar, Clock, X, CheckCircle,
    Bike, RefreshCw,
    FileText, Search, Printer
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, Cell, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useStore } from "@/lib/store";
import type { UbtTable } from "@/lib/store";
import { useFrontendStore } from "@/lib/frontend/store";
import { formatCurrency, formatCurrencyShort } from "@/lib/mockData";
import DateRangePicker, { type DateRange } from "@/components/ui/DateRangePicker";
import { useLang } from "@/lib/LangContext";

const fmt = (n: number) => Math.round(n).toLocaleString();

// ─── Types ────────────────────────────────────────────────────────────────────
interface UbtStats {
    today: {
        revenue: number;
        count: number;
        byMethod: Record<string, { total: number; count: number }>;
    };
    hourly: { hour: string; amount: number }[];
    tables: { total: number; occupied: number; reserved: number; free: number };
    pendingDeliveries: number;
    finance: { totalIncome: number; totalExpense: number; netProfit: number };
    debt: { qarzdorlar: number; bizningQarz: number };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, gradient, sub }: {
    label: string; value: string; icon: React.ElementType;
    gradient: string; sub?: string;
}) {
    return (
        <div className={`rounded-3xl p-6 text-white relative overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.03] transition-transform duration-300 cursor-default ${gradient}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/20 blur-xl rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 backdrop-blur-md flex items-center justify-center mb-4 border border-brand/20">
                    <Icon size={24} className="text-white" />
                </div>
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1.5">{label}</p>
                <p className="text-white font-black text-2xl leading-none drop-shadow-md">{value}</p>
                {sub && <p className="text-white/70 text-[11px] font-medium mt-2 bg-black/20 px-2 py-0.5 rounded-md inline-block backdrop-blur-sm border border-black/10">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Reservation Modal ────────────────────────────────────────────────────────
function ReservationModal({ tables, onConfirm, onClose }: {
    tables: UbtTable[];
    onConfirm: (tableId: string, guestName: string, since: string) => void;
    onClose: () => void;
}) {
    const freeTables = tables.filter(tb => tb.status === "free");
    const [tableId, setTableId] = useState(freeTables[0]?.id ?? "");
    const [guestName, setGuestName] = useState("");
    const [since, setSince] = useState("20:00");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div className="p-6 border-b border-surface-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Calendar size={18} className="text-blue-400" />
                        </div>
                        <h2 className="font-bold text-white text-base">Bron qo&apos;shish</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (tableId) { onConfirm(tableId, guestName, since); onClose(); } }} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Stol tanlang</label>
                        <select value={tableId} onChange={e => setTableId(e.target.value)} required
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                            {freeTables.length === 0 && <option value="">Bo&apos;sh stol yo&apos;q</option>}
                            {freeTables.map(tb => <option key={tb.id} value={tb.id}>{tb.name} ({tb.seats} kishi)</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Mehmon ismi</label>
                        <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Ixtiyoriy"
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none placeholder-slate-500"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Bron vaqti</label>
                        <input type="time" value={since} onChange={e => setSince(e.target.value)} required
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-slate-300 text-sm font-semibold hover:bg-white/10 transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.15)" }}>Bekor</button>
                        <button type="submit" disabled={!tableId || freeTables.length === 0}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold shadow-lg disabled:opacity-40 flex items-center justify-center gap-2">
                            <Calendar size={14} /> Tasdiqlash
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Table Action Modal ───────────────────────────────────────────────────────
function TableActionModal({ table, onClose, onFree, onOccupy }: {
    table: UbtTable; onClose: () => void; onFree: () => void; onOccupy: () => void;
}) {
    const statusCfg: Record<string, { label: string; color: string }> = {
        free:     { label: "Bo'sh",  color: "bg-slate-500/30 text-slate-300" },
        occupied: { label: "Band",   color: "bg-emerald-500/20 text-emerald-400" },
        reserved: { label: "Bron",   color: "bg-amber-500/20 text-amber-400" },
        receipt:  { label: "Hisob",  color: "bg-blue-500/20 text-blue-400" },
    };
    const cfg = statusCfg[table.status] ?? statusCfg.free;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div className="p-5 border-b border-surface-border flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-white text-base">{table.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <Users size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-400">{table.seats} kishi</span>
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-3">
                    {table.status === "occupied" && (
                        <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <p className="text-xs text-emerald-400 font-semibold mb-1">{table.order}</p>
                            <p className="text-xl font-black text-white">{formatCurrency(table.amount)}</p>
                            {table.since && <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><Clock size={10} /> {table.since} dan beri</p>}
                        </div>
                    )}
                    {table.status === "reserved" && (
                        <div className="rounded-xl p-4" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                            {table.order && <p className="text-sm font-semibold text-amber-400 mb-1">Mehmon: {table.order}</p>}
                            <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} /> Bron: {table.since}</p>
                        </div>
                    )}
                    {table.status === "free" && (
                        <p className="text-center text-sm text-slate-400 py-3">Bo&apos;sh stol — bron tugmasidan foydalaning</p>
                    )}
                    <div className="flex flex-col gap-2">
                        {table.status !== "free" && (
                            <button onClick={() => { onFree(); onClose(); }}
                                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-red-400 hover:text-white transition-all"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <X size={14} /> Bo&apos;shatish
                            </button>
                        )}
                        {table.status === "reserved" && (
                            <button onClick={() => { onOccupy(); onClose(); }}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg">
                                <CheckCircle size={14} /> Band qilish
                            </button>
                        )}
                        <button onClick={onClose}
                            className="w-full py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}>Yopish</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Hourly Chart ─────────────────────────────────────────────────────────────
function HourlyChart({ data }: { data: { hour: string; amount: number }[] }) {
    const total   = data.reduce((s, d) => s + d.amount, 0);
    const peak    = data.reduce((max, d) => d.amount > max.amount ? d : max, { hour: "--", amount: 0 });
    const nonZero = data.filter(d => d.amount > 0);
    const avgHour = nonZero.length > 0 ? Math.round(nonZero.reduce((s, d) => s + d.amount, 0) / nonZero.length) : 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const val: number = payload[0].value;
        const isPeak = label === peak.hour;
        return (
            <div style={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 14, padding: "10px 14px", boxShadow: "0 8px 30px rgba(59,130,246,0.15)" }}>
                <p style={{ color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>{label}</p>
                <p style={{ color: isPeak ? "#fbbf24" : "#a78bfa", fontSize: 15, fontWeight: 900 }}>
                    {isPeak ? "⚡ " : ""}{val.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>so&apos;m</span>
                </p>
                {isPeak && <p style={{ fontSize: 9, color: "#fbbf24", marginTop: 2, fontWeight: 700 }}>ENG YUQORI SOAT</p>}
            </div>
        );
    };

    return (
        <div className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #bfdbfe 100%)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 20px 60px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.8)" }}>

            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
                        <TrendingUp size={15} className="text-white" />
                    </div>
                    <div>
                        <p className="text-slate-800 font-bold text-sm leading-none">Soatlik savdo</p>
                        <p className="text-blue-600 text-[10px] font-semibold mt-0.5">Bugungi dinamika</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-600"
                    style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                    ⚡ {peak.hour} da eng yuqori
                </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-0 mx-5 mb-4 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.15)" }}>
                {[
                    { label: "Jami tushum",  value: `${Math.round(total / 1000)}K so'm`, color: "#6366f1" },
                    { label: "Eng yuqori",   value: `${Math.round(peak.amount / 1000)}K`, color: "#d97706" },
                    { label: "O'rtacha/soat", value: `${Math.round(avgHour / 1000)}K`, color: "#059669" },
                ].map((kpi, i) => (
                    <div key={i} className={`px-3 py-2.5 text-center ${i < 2 ? "border-r border-blue-200/50" : ""}`}
                        style={{ background: "rgba(255,255,255,0.5)" }}>
                        <p className="font-black text-sm" style={{ color: kpi.color }}>{kpi.value}</p>
                        <p className="text-[9px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={data} margin={{ top: 5, right: 16, bottom: 0, left: -10 }}>
                    <defs>
                        <linearGradient id="gradMain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"  stopColor="#6366f1" stopOpacity={0.5} />
                            <stop offset="60%" stopColor="#6366f1" stopOpacity={0.1} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"  stopColor="#818cf8" />
                            <stop offset="50%" stopColor="#a78bfa" />
                            <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="rgba(59,130,246,0.12)" />
                    <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }}
                        axisLine={false} tickLine={false}
                        interval={3}
                    />
                    <YAxis
                        tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }}
                        axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`}
                        width={36}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(59,130,246,0.3)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="url(#gradStroke)"
                        strokeWidth={2.5}
                        fill="url(#gradMain)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#a78bfa", stroke: "#fff", strokeWidth: 2, filter: "url(#glow)" }}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Bottom glow bar */}
            <div className="h-px mx-5 mb-1 rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)" }} />
        </div>
    );
}

// ─── Table Card ───────────────────────────────────────────────────────────────
const TABLE_STATUS: Record<string, { border: string; glow: string; badge: string; label: string; emoji: string }> = {
    free:     { border: "border-slate-600",   glow: "",                                                badge: "bg-slate-700 text-slate-300",     label: "Bo'sh",  emoji: "🪑" },
    occupied: { border: "border-emerald-500", glow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]",         badge: "bg-emerald-500/20 text-emerald-400", label: "Band",  emoji: "🍽️" },
    reserved: { border: "border-amber-500",   glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",         badge: "bg-amber-500/20 text-amber-400",   label: "Bron",   emoji: "📅" },
    receipt:  { border: "border-blue-500",    glow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",         badge: "bg-blue-500/20 text-blue-400",     label: "Hisob",  emoji: "🧾" },
};
function UbtTableCard({ table, onClick }: { table: UbtTable; onClick: () => void }) {
    const cfg = TABLE_STATUS[table.status] ?? TABLE_STATUS.free;
    return (
        <div onClick={onClick}
            className={`rounded-2xl p-4 border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none ${cfg.border} ${cfg.glow}`}
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm">{table.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            </div>
            <div className="text-3xl text-center py-2">{cfg.emoji}</div>
            <div className="flex items-center gap-1 text-slate-300 text-xs font-bold mt-2 justify-center">
                <Users size={11} /> <span>{table.seats} kishi</span>
            </div>
            {table.status === "occupied" && (
                <div className="mt-3 pt-3 border-t border-surface-border">
                    <p className="text-sm font-black text-white">{formatCurrency(table.amount)}</p>
                    {table.since && <p className="text-[10px] text-slate-300 font-semibold flex items-center gap-1 mt-0.5"><Clock size={9} /> {table.since}</p>}
                    {table.waiter && <p className="text-[10px] text-slate-300 font-semibold mt-0.5">👤 {table.waiter}</p>}
                </div>
            )}
            {table.status === "reserved" && table.order && (
                <p className="mt-2 text-xs text-amber-300 font-bold truncate">{table.order}</p>
            )}
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const EMPTY_STATS: UbtStats = {
    today: { revenue: 0, count: 0, byMethod: {} },
    hourly: Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2,"0")}:00`, amount: 0 })),
    tables: { total: 0, occupied: 0, reserved: 0, free: 0 },
    pendingDeliveries: 0,
    finance: { totalIncome: 0, totalExpense: 0, netProfit: 0 },
    debt: { qarzdorlar: 0, bizningQarz: 0 },
};

// ─── Akt Sverka Modal ───────────────────────────────────────────────────────
// isPreview=true → to'lovdan oldin (joriy qarz ko'rsatiladi)
// isPreview=false → to'lovdan keyin (to'langan hujjat)
function AktSverkaModal({ data, onClose }: { data: any, onClose: () => void }) {
    const handlePrint = () => { window.print(); };
    if (!data) return null;

    const isPreview = data.isPreview;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 print:p-0 print:bg-white print:block">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col print:shadow-none print:w-full print:border-none print:rounded-none">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        body * { visibility: hidden; }
                        #akt-sverka-receipt, #akt-sverka-receipt * { visibility: visible; }
                        #akt-sverka-receipt { position: absolute; left: 0; top: 0; width: 100%; font-family: monospace; }
                        .no-print { display: none !important; }
                    }
                `}} />

                {/* Header Banner */}
                <div className={`px-5 py-3 flex items-center gap-2 no-print ${isPreview ? "bg-amber-50 border-b border-amber-200" : "bg-emerald-50 border-b border-emerald-200"}`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isPreview ? "text-amber-700" : "text-emerald-700"}`}>
                        {isPreview ? "📋 Joriy qarz holati" : "✅ To'lov tasdiqlandi"}
                    </span>
                </div>

                <div id="akt-sverka-receipt" className="p-5 flex flex-col print:pt-4">
                    <div className="text-center mb-5 border-b border-dashed border-slate-300 pb-4">
                        <h2 className="font-extrabold text-xl uppercase tracking-widest text-slate-800">Akt Sverka</h2>
                        <p className="text-xs font-bold text-slate-500 mt-1">Solishtirma Dalolatnoma</p>
                        {isPreview && <p className="text-[10px] text-amber-600 font-bold mt-1 bg-amber-50 px-2 py-0.5 rounded-md inline-block">(To'lovdan oldingi holat)</p>}
                    </div>

                    <div className="space-y-3.5 text-sm font-semibold text-slate-700">
                        <div className="flex justify-between items-center pb-2.5 border-b border-dashed border-slate-200">
                            <span className="text-slate-500">Sana:</span>
                            <span>{data.date}</span>
                        </div>
                        <div className="flex justify-between items-end pb-2.5 border-b border-dashed border-slate-200">
                            <span className="text-slate-500">Mijoz / Hamkor:</span>
                            <span className="text-right max-w-[180px] break-words leading-tight font-black">{data.customerName}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-dashed border-slate-200">
                            <span className="text-slate-500">Holat turi:</span>
                            <span className="text-right">{data.isOurDebt ? "Bizning kredit" : "Mijoz qarzi"}</span>
                        </div>

                        <div className="pt-1"></div>

                        {isPreview ? (
                            /* Preview mode: just show current debt */
                            <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-slate-700">
                                <span className="text-slate-800 font-black">Joriy Qarz:</span>
                                <span className="text-rose-600 font-black text-2xl">
                                    {fmt(data.currentDebt)} <span className="text-sm font-bold font-sans">so'm</span>
                                </span>
                            </div>
                        ) : (
                            /* Post-payment mode: show breakdown */
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Oldingi qarz:</span>
                                    <span className="text-rose-600 font-bold">{fmt(data.oldDebt)} so'm</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">To'landi:</span>
                                    <span className="text-emerald-600 font-black">- {fmt(data.paidAmount)} so'm</span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-slate-700">
                                    <span className="text-slate-800 font-black">Qolgan Qarz:</span>
                                    <span className="text-slate-900 font-black text-xl">
                                        {fmt(data.newDebt)} <span className="text-sm font-bold font-sans">so'm</span>
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="text-center mt-7 pt-5 border-t border-dashed border-slate-300">
                        {isPreview
                            ? <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-2">Berilgan hujjat sifatida tasdiqlansin</p>
                            : <p className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase mb-2">To'lov tasdiqlandi</p>
                        }
                        <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 font-semibold mb-4">Mijoz imzosi</p>
                                <div className="border-b border-slate-400 w-full" />
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 font-semibold mb-4">Kassir imzosi</p>
                                <div className="border-b border-slate-400 w-full" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 no-print">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors">
                        Yopish
                    </button>
                    <button onClick={handlePrint} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                        <Printer size={16} /> Chop etish
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Debt Ledger Modal ────────────────────────────────────────────────────────
function DebtDetailsModal({ type, onClose, data, loading, onRefresh, onSverkaGenerated }: any) {
    const [paying, setPaying] = useState<string | null>(null);
    const [previewSverka, setPreviewSverka] = useState<any>(null);

    if (!type) return null;

    const isOurDebt = type === "bizningQarz";
    const headerColor = isOurDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400";
    const headerTitle = isOurDebt ? "Bizning Qarzlarimiz (Chiqim tarixi)" : "Qarzdorlar (Mijozlar qarzi tarixi)";
    
    // Action handler
    const handlePay = async (id: string, fullAmount: number, currentPaid: number, title: string) => {
        const remaining = fullAmount - currentPaid;
        const inputStr = window.prompt(`Qarzni kiriting (Qolgan qarz: ${fmt(remaining)} so'm):\n\n(${title})`, remaining.toString());
        if (!inputStr) return;
        
        const amountToPay = parseInt(inputStr.replace(/\D/g, ""), 10);
        if (isNaN(amountToPay) || amountToPay <= 0) return alert("Noto'g'ri summa kiritildi");
        
        const isFullPayment = amountToPay >= remaining;

        setPaying(id);
        try {
            const res = await fetch("/api/ubt/stats/debts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, amount: amountToPay, title, isOurDebt, isFullPayment })
            });
            if (res.ok) {
                if (onSverkaGenerated) {
                    onSverkaGenerated({
                        customerName: title,
                        date: new Date().toLocaleString("uz-UZ"),
                        oldDebt: remaining,
                        paidAmount: amountToPay,
                        newDebt: remaining - amountToPay,
                        isOurDebt
                    });
                }
                onRefresh();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setPaying(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h2 className={`text-lg font-black uppercase tracking-widest flex items-center gap-2.5 ${headerColor}`}>
                        {isOurDebt ? <TrendingDown size={18} /> : <Users size={18} />} 
                        {headerTitle}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-10 h-10 rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-blue-500 animate-spin" />
                        </div>
                    ) : (data &&
                        <div className="grid grid-cols-2 gap-8">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/10 pb-2 mb-4">
                                    {isOurDebt ? "Kassadan Olingan Qarzlar (Kirim)" : "Qarzga berilgan savdolar (Cheklar)"}
                                </h3>
                                <div className="space-y-3">
                                    {(isOurDebt ? data.bizningQarz?.olingan : data.qarzdorlar?.transactions)?.map((t: any) => {
                                        // Customer Fallback Logics
                                        const fallbackInfo = (t.notes ? t.notes.replace(" | TOLANGAN", "") : "") || t.description || t.category || "Ma'lumot yo'q";
                                        const cName = t.customer?.name;
                                        const tName = cName ? cName : `Noma'lum Mijoz (${fallbackInfo})`;

                                        // Partial Payments Logic
                                        const trxRef = isOurDebt ? `(Harakat #${t.id.slice(-6).toUpperCase()})` : `(Trx #${t.id.slice(-6).toUpperCase()})`;
                                        const relatedPayments = (isOurDebt ? data.bizningQarz?.uzilgan : data.qarzdorlar?.payments)?.filter((p: any) => p.description && p.description.includes(trxRef)) || [];
                                        const alreadyPaid = relatedPayments.reduce((acc: number, p: any) => acc + p.amount, 0);
                                        const remainingAmount = t.amount - alreadyPaid;
                                        
                                        if (remainingAmount <= 0) return null; // Safe guard, fully paid UI hide

                                        return (
                                        <div key={t.id} className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 hover:border-blue-400 dark:hover:bg-slate-100 transition-colors group shadow-sm dark:shadow-none relative">
                                            {alreadyPaid > 0 && (
                                                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl">
                                                    Qisman to'langan
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-base font-black text-slate-900 dark:text-slate-800 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                                                        {tName}
                                                    </p>
                                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                                                        <Clock size={12} /> {new Date(t.createdAt || t.date).toLocaleString("uz-UZ")}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-black text-lg ${isOurDebt ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                        {isOurDebt ? "+" : "-"} {fmt(remainingAmount)} <span className="text-xs font-bold">so'm</span>
                                                    </p>
                                                    {alreadyPaid > 0 && (
                                                        <p className="text-[10px] text-slate-400 line-through mt-0.5">{fmt(t.amount)} so'm</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-4 gap-2">
                                                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono tracking-wider flex items-center gap-1"><FileText size={10}/> ID: {t.id.slice(-8)}</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setPreviewSverka({ isPreview: true, customerName: tName, date: new Date().toLocaleString("uz-UZ"), currentDebt: remainingAmount, isOurDebt })}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5">
                                                        <Printer size={12}/> Akt Sverka
                                                    </button>
                                                    <button onClick={() => handlePay(t.id, t.amount, alreadyPaid, tName)} disabled={paying === t.id}
                                                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                                                        {paying === t.id ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"/> : <CheckCircle size={13}/>}
                                                        To’lov qilish
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    {previewSverka && <AktSverkaModal data={previewSverka} onClose={() => setPreviewSverka(null)} />}
                                    {(isOurDebt ? data.bizningQarz?.olingan : data.qarzdorlar?.transactions)?.length === 0 && (
                                        <div className="p-8 text-center text-slate-500 text-xs font-bold bg-white dark:bg-white/[0.01] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">Ma'lumot topilmadi</div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4 relative">
                                <div className="absolute -left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-100" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/10 pb-2 mb-4">
                                    {isOurDebt ? "Uzilgan Qarzlar (Chiqim tarixi)" : "Qaytarilgan qarz tushumlari (Kirim)"}
                                </h3>
                                <div className="space-y-3">
                                    {(isOurDebt ? data.bizningQarz?.uzilgan : data.qarzdorlar?.payments)?.map((p: any) => (
                                        <div key={p.id} className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 transition-colors shadow-sm dark:shadow-none">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {p.description || p.category || "Izohsiz"}
                                                    </p>
                                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                                                        <Clock size={12} /> {new Date(p.createdAt || p.date).toLocaleString("uz-UZ")}
                                                    </p>
                                                </div>
                                                <p className={`font-black text-sm ${isOurDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                    {isOurDebt ? "-" : "+"} {fmt(p.amount)} <span className="text-[10px]">so'm</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-100 px-2 py-0.5 rounded-md">{p.paymentMethod || "Kassa"}</span>
                                                {p.createdBy && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Menejer: {p.createdBy}</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {(isOurDebt ? data.bizningQarz?.uzilgan : data.qarzdorlar?.payments)?.length === 0 && (
                                        <div className="p-8 text-center text-slate-500 text-xs font-bold bg-white dark:bg-white/[0.01] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">Ma'lumot topilmadi</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Stats Overview Chart ─────────────────────────────────────────────────────
function StatsOverviewChart({ finance, tables, byMethod }: {
    finance: { totalIncome: number; totalExpense: number; netProfit: number };
    tables: { total: number; occupied: number; reserved: number; free: number };
    byMethod: Record<string, { total: number; count: number }>;
}) {
    const { t } = useLang();
    const financeRows = [
        { label: "Pul kirimi",  value: finance.totalIncome,  color: "#10b981" },
        { label: "Pul chiqimi", value: finance.totalExpense, color: "#f43f5e" },
        { label: "Sof foyda",   value: Math.max(finance.netProfit, 0), color: "#3b82f6" },
    ];
    const maxFin = Math.max(...financeRows.map(r => r.value), 1);

    const methodEntries = Object.entries(byMethod)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);
    const totalMethod = methodEntries.reduce((s, [, d]) => s + d.total, 0);
    const methodColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];

    const tableRows = [
        { label: "Bo'sh", value: tables.free,     color: "#64748b", bg: "rgba(100,116,139,0.12)" },
        { label: "Band",  value: tables.occupied, color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
        { label: "Bron",  value: tables.reserved, color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
    ];

    const financeChartData = [
        { name: "Kirim",  value: finance.totalIncome  },
        { name: "Chiqim", value: finance.totalExpense },
        { name: "Foyda",  value: Math.max(finance.netProfit, 0) },
    ];

    return (
        <div className="rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #e0f2fe 100%)", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 4px 24px rgba(59,130,246,0.1)" }}>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
                    <TrendingUp size={15} className="text-white" />
                </div>
                <div>
                    <p className="text-slate-800 font-bold text-sm leading-none">Moliyaviy statistika</p>
                    <p className="text-blue-600 text-[10px] font-semibold mt-0.5">Bugun · Barcha ko&apos;rsatkichlar</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                {/* Finance bars */}
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Moliya</p>
                    <div className="space-y-3">
                        {financeRows.map(row => {
                            const pct = maxFin > 0 ? (row.value / maxFin) * 100 : 0;
                            return (
                                <div key={row.label}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-600">{row.label}</span>
                                        <span className="text-xs font-black" style={{ color: row.color }}>{fmt(row.value)}</span>
                                    </div>
                                    <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.7)" }}>
                                        <div className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${Math.max(pct, 2)}%`, background: row.color, opacity: 0.85 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Mini bar chart */}
                    <div className="mt-4 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.5)" }}>
                        <ResponsiveContainer width="100%" height={80}>
                            <BarChart data={financeChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                                <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="rgba(59,130,246,0.1)" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`} />
                                <Tooltip
                                    contentStyle={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, fontSize: 11, fontWeight: 700, boxShadow: "0 4px 16px rgba(59,130,246,0.12)" }}
                                    formatter={(v: any) => [`${fmt(v)} so'm`, ""]}
                                    labelStyle={{ color: "#64748b", fontSize: 10, fontWeight: 700 }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {financeChartData.map((_, i) => (
                                        <Cell key={i} fill={["#10b981","#f43f5e","#3b82f6"][i]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment methods + Table status */}
                <div className="flex flex-col gap-4">
                    {/* Payment methods */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">To&apos;lov turlari</p>
                        {methodEntries.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Ma&apos;lumot yo&apos;q</p>
                        ) : (
                            <div className="space-y-3">
                                {methodEntries.map(([name, d], i) => {
                                    const pct = totalMethod > 0 ? (d.total / totalMethod) * 100 : 0;
                                    return (
                                        <div key={name}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-slate-600 truncate max-w-[90px]">{name}</span>
                                                <span className="text-[10px] font-bold text-slate-500">{Math.round(pct)}%</span>
                                            </div>
                                            <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.7)" }}>
                                                <div className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.max(pct, 2)}%`, background: methodColors[i % methodColors.length], opacity: 0.85 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Table status */}
                    {tables.total > 0 && (
                        <div className="pt-3 border-t border-blue-200/50">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">{t('ubt.tablesStatus') || 'Stollar holati'}</p>
                            <div className="grid grid-cols-3 gap-2">
                                {tableRows.map(t => (
                                    <div key={t.label} className="text-center py-2.5 rounded-xl" style={{ background: t.bg }}>
                                        <p className="text-xl font-black" style={{ color: t.color }}>{t.value}</p>
                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{t.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Timeframe Selector ───────────────────────────────────────────────────────
function TimeframeSelector({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const options = [
        { id: "today", label: "Bugun" },
        { id: "week",  label: "So'nggi 7 kun" },
        { id: "month", label: "Shu oy" },
        { id: "year",  label: "Shu yil" },
        { id: "all",   label: "Barchasi" },
    ];
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 shadow-sm hover:border-blue-400 hover:shadow-md transition-all active:scale-[0.98]">
                <Calendar size={14} className="text-blue-500" />
                {options.find(o => o.id === value)?.label || "Tanlang"}
            </button>
            {open && (
                <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map(opt => (
                        <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }} className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${value === opt.id ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                </>
            )}
        </div>
    );
}

export default function UbtPage() {
    const { t } = useLang();
    const staff       = useStore((s) => s.staff);
    const ubtTables = useStore((s) => s.ubtTables);
    const router      = useRouter();

    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [selTable, setSelTable]     = useState<UbtTable | null>(null);
    const [showReservation, setShowReservation] = useState(false);
    const [dateFilter, setDateFilter] = useState<{ timeframe: string; range: DateRange }>({
        timeframe: "today",
        range: null
    });

    const dishQuery = dateFilter.range
        ? `/api/ubt/reports-data?from=${dateFilter.range.from}&to=${dateFilter.range.to}`
        : `/api/ubt/reports-data?timeframe=${dateFilter.timeframe}`;

    const store = useStore();

    // ── SWR: auto-refresh every 15 seconds ───────────────────────────────────
    const fetcher = async (url: string) => {
        const res = await fetch(url);
        if (res.status === 401) {
            useFrontendStore.getState().logout();
            window.location.replace("/");
            return;
        }
        if (!res.ok) throw new Error("Stats fetch failed");
        return res.json();
    };

    const { data: swrStats, isLoading: swrLoading, mutate } = useSWR(
        "/api/ubt/stats",
        fetcher,
        {
            refreshInterval: 15_000,          // 15 sekund — real-time
            revalidateOnFocus: true,           // Tabga qaytilganda yangilaydi
            revalidateOnReconnect: true,       // Internet qaytganda yangilaydi
            dedupingInterval: 5_000,
            onSuccess: () => setLastRefresh(new Date()),
        }
    );

    // Merge SWR stats into local state (fallback to EMPTY_STATS)
    const stats = swrStats ?? EMPTY_STATS;
    const loading = swrLoading && !swrStats;

    const { data: reportsData } = useSWR(
        dishQuery,
        fetcher,
        { refreshInterval: 60_000, revalidateOnFocus: true }
    );

    const DISH_DATA = useMemo(() => {
        if (!reportsData?.topDishes) return [];
        return reportsData.topDishes;
    }, [reportsData]);

    // Local Component State
    const [debtModalType, setDebtModalType] = useState<"qarzdorlar" | "bizningQarz" | null>(null);
    const [debtData, setDebtData] = useState<any>(null);
    const [debtLoading, setDebtLoading] = useState(false);
    
    // Akt Sverka
    const [sverkaData, setSverkaData] = useState<any>(null);

    const openDebtModal = async (type: "qarzdorlar" | "bizningQarz") => {
        setDebtModalType(type);
        setDebtLoading(true);
        try {
            const res = await fetch("/api/ubt/stats/debts");
            const data = await res.json();
            if (data.success) {
                setDebtData(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setDebtLoading(false);
        }
    };

    // Also refresh tables on interval
    useEffect(() => {
        store.fetchUbtTables();
        const ti = setInterval(() => store.fetchUbtTables(), 60_000);
        return () => clearInterval(ti);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalStaff  = staff.length;
    const activeTables = stats.tables.occupied + stats.tables.reserved;
    const totalRevenue = stats.today.revenue;

    return (
        <div className="animate-fade-in">
        <div className="rounded-2xl p-5 space-y-5" style={{ background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)" }}>

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">{t('ubt.title')}</h1>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">{t('ubt.subTitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {lastRefresh && (
                        <span className="text-xs text-slate-500 font-medium">
                            {lastRefresh.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                    )}
                    <button onClick={() => { mutate(); store.fetchUbtTables(); }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        style={{ background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.1)" }}>
                        <RefreshCw size={13} /> {t('common.refresh') || "Yangilash"}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
            )}

            {!loading && (
            <div className="space-y-4">
                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-5">
                    
                    {/* Left Column: Finance & Payment Types (4 width) */}
                    <div className="col-span-12 lg:col-span-4 space-y-5">
                        
                        {/* Bugungi savdo */}
                        <StatCard label="Bugungi savdo" value={`${fmt(totalRevenue)} so'm`} icon={ShoppingBag}
                            gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                            sub={`${stats.today.count} ta tranzaksiya`} />
                        
                        {/* Premium Finance Summary */}
                        <div className="rounded-3xl p-6 relative overflow-hidden shadow-sm" 
                             style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)" }}>
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full pointer-events-none" />
                            <p className="text-xs font-bold text-blue-600 mb-1.5 flex items-center gap-1.5"><DollarSign size={14}/>{t('reports.netProfit')}</p>
                            <p className="text-4xl font-black text-slate-800 tracking-tight">
                                {fmt(stats.finance.netProfit)} <span className="text-base text-blue-600 font-bold">so'm</span>
                            </p>
                            
                            <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-blue-500/20">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 mb-1 flex items-center gap-1"><TrendingUp size={12}/>{t('dashboard.totalRevenue')}</p>
                                    <p className="text-sm font-bold text-slate-800">{fmt(stats.finance.totalIncome)}</p>
                                </div>
                                <div className="w-px h-8 bg-blue-500/30" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-red-500 mb-1 flex items-center gap-1"><TrendingDown size={12}/>{t('reports.totalExpense')}</p>
                                    <p className="text-sm font-bold text-slate-800">- {fmt(stats.finance.totalExpense)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Payment Breakdown */}
                        <div className="rounded-3xl overflow-hidden shadow-sm bg-white border border-slate-200">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Wallet size={15} className="text-slate-400" /> Tushumlar (To'lov turlari)
                                </p>
                            </div>
                            <table className="w-full text-sm">
                                <tbody>
                                    {Object.entries(stats.today.byMethod).sort((a: any, b: any) => b[1].total - a[1].total).map(([methodName, mData]: [string, any], i) => {
                                        const amt = mData.total;
                                        const pct = totalRevenue > 0 ? Math.round((amt / totalRevenue) * 100) : 0;
                                        const colors = ["text-emerald-500", "text-blue-500", "text-sky-500", "text-amber-500", "text-rose-500", "text-cyan-500"];
                                        const color = colors[i % colors.length];
                                        return (
                                            <tr key={methodName} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full bg-current ${color} shadow-[0_0_10px_currentColor]`} />
                                                        <span className="text-slate-700 text-xs font-bold">{methodName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-right text-slate-500 font-bold text-[11px] w-16">{amt > 0 ? `${pct}%` : "—"}</td>
                                                <td className="px-5 py-3.5 text-right font-bold text-slate-800 text-xs">{fmt(amt)}</td>
                                            </tr>
                                        );
                                    })}
                                    {Object.keys(stats.today.byMethod).length === 0 && (
                                        <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500 text-xs font-medium">Ma'lumot yo'q</td></tr>
                                    )}
                                    <tr className="bg-slate-50 border-t border-slate-100">
                                        <td className="px-5 py-4 font-bold text-slate-700 text-xs">Jami tushum</td>
                                        <td className="px-5 py-4" />
                                        <td className="px-5 py-4 text-right font-black text-amber-500 text-sm">{fmt(totalRevenue)} so'm</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Hourly Chart Hero (8 width) */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
                        <HourlyChart data={stats.hourly} />

                        {/* Stats Overview Chart */}
                        <StatsOverviewChart
                            finance={stats.finance}
                            tables={stats.tables}
                            byMethod={stats.today.byMethod}
                        />

                        {/* Debt Trackers (Moved to right column) */}
                        <div className="grid grid-cols-2 gap-5 h-28 shrink-0">
                            <div onClick={() => openDebtModal("qarzdorlar")}
                                className="rounded-3xl p-5 relative overflow-hidden flex flex-col justify-center transition-all hover:scale-[1.03] shadow-sm cursor-pointer group"
                                style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500/10 blur-[30px] rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />
                                <div className="absolute right-4 top-4 bg-emerald-500/10 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Search size={14} className="text-emerald-500"/>
                                </div>
                                <p className="text-[11px] font-bold text-emerald-600 mb-1 flex items-center gap-1.5 uppercase tracking-widest"><Users size={12}/> Qarzdorlar (Bizga qarz)</p>
                                <p className="text-2xl font-black text-slate-800">{fmt(stats.debt.qarzdorlar)} <span className="text-emerald-500 text-sm font-bold tracking-normal">so'm</span></p>
                            </div>
                            <div onClick={() => openDebtModal("bizningQarz")}
                                className="rounded-3xl p-5 relative overflow-hidden flex flex-col justify-center transition-all hover:scale-[1.03] shadow-sm cursor-pointer group"
                                style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.2)" }}>
                                <div className="absolute right-0 bottom-0 w-32 h-32 bg-rose-500/10 blur-[30px] rounded-full pointer-events-none group-hover:bg-rose-500/20 transition-colors" />
                                <div className="absolute right-4 top-4 bg-rose-500/10 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Search size={14} className="text-rose-500"/>
                                </div>
                                <p className="text-[11px] font-bold text-rose-600 mb-1 flex items-center gap-1.5 uppercase tracking-widest"><TrendingDown size={12}/> Bizning qarzimiz</p>
                                <p className="text-2xl font-black text-slate-800">{fmt(stats.debt.bizningQarz)} <span className="text-rose-500 text-sm font-bold tracking-normal">so'm</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Dishes Chart */}
                <div className="rounded-2xl p-5 shadow-sm bg-white border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <UtensilsCrossed size={15} className="text-slate-400" />
                            <h2 className="text-sm font-bold text-slate-800">Taomlar reytingi (Eng ko'p sotilganlar)</h2>
                        </div>
                        <DateRangePicker value={dateFilter} onChange={setDateFilter} />
                    </div>
                    {DISH_DATA.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <UtensilsCrossed size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Ma'lumot topilmadi</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 mt-5 w-full">
                            {DISH_DATA.map((dish: any, i: number) => {
                                const maxRev = DISH_DATA[0]?.revenue || 1;
                                const pct = Math.max((dish.revenue / maxRev) * 100, 2);
                                return (
                                    <div key={dish.name} className="relative flex items-center p-4 rounded-[24px] overflow-hidden group transition-all duration-300 transform hover:-translate-y-1 bg-white border border-slate-100 shadow-sm hover:shadow-md">
                                        {/* Progress Bar Background */}
                                        <div className="absolute top-0 left-0 bottom-0 bg-blue-50 z-0 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                                        
                                        {/* Rank Badge */}
                                        <div className="relative z-10 w-12 flex-shrink-0 flex justify-center">
                                            {i === 0 ? (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 flex items-center justify-center text-lg font-black shadow-sm border border-amber-300">1</div>
                                            ) : i === 1 ? (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-lg font-black shadow-sm border border-slate-200">2</div>
                                            ) : i === 2 ? (
                                                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-lg font-black shadow-sm border border-orange-200">3</div>
                                            ) : (
                                                <div className="w-9 h-9 text-slate-500 flex items-center justify-center text-base font-bold bg-slate-50 rounded-full border border-slate-200">{i + 1}</div>
                                            )}
                                        </div>

                                        {/* Image */}
                                        <div className="relative z-10 w-16 h-16 rounded-2xl overflow-hidden ml-5 bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                                            {dish.image && dish.image !== "" ? (
                                                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-2 transition-transform duration-700" />
                                            ) : (
                                                <UtensilsCrossed size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            )}
                                        </div>

                                        {/* Name & Stats */}
                                        <div className="relative z-10 flex-1 ml-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-slate-800 text-base lg:text-lg font-extrabold truncate max-w-[280px] tracking-wide">{dish.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[11px] font-bold border border-blue-100">{dish.qty} ta</span>
                                                    <span className="text-slate-500 text-xs font-bold">sotildi</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-emerald-600 text-lg lg:text-xl font-black tracking-tighter">
                                                    {formatCurrency(dish.revenue)}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Jami tushum</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            )}
            
            {/* Modal portal rendering */}
            {debtModalType && (
                <DebtDetailsModal 
                    type={debtModalType} 
                    onClose={() => setDebtModalType(null)} 
                    data={debtData} 
                    loading={debtLoading}
                    onSverkaGenerated={(data: any) => setSverkaData(data)}
                    onRefresh={() => {
                        openDebtModal(debtModalType);
                        setTimeout(() => store.fetchUbtTables(), 300);
                    }} 
                />
            )}

            {sverkaData && (
                <AktSverkaModal 
                    data={sverkaData} 
                    onClose={() => setSverkaData(null)} 
                />
            )}
        </div>
        </div>
    );
}
