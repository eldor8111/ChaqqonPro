"use client";

import { useState, useEffect, useMemo } from "react";
import {
    TrendingUp, TrendingDown, DollarSign, Plus, X, Check, RotateCw,
    Wallet, ArrowUpCircle, ArrowDownCircle, PieChart as PieIcon, FileSpreadsheet, Trash2,
    Users, Truck, UserCircle2, PenLine, Building2
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLang } from "@/lib/LangContext";

const INCOME_CATEGORIES = ["Sotuv tushumi", "Boshqa kirim", "Qarz qaytarish", "Invest"];
const EXPENSE_CATEGORIES = ["Ijara", "Maosh / Oylik", "Bozor-ochar (xomashyo)", "Kommunal (suv, gaz, elektr)", "Reklama", "Transport", "Soliq", "Jihozlar ta'miri", "Boshqa xarajat"];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#ec4899", "#06b6d4"];

const fmt = (n: number) => Math.round(n).toLocaleString("uz-UZ");

function StatCard({ label, value, sub, icon: Icon, gradient }: any) {
    return (
        <div className={`rounded-2xl p-5 text-white relative overflow-hidden shadow-xl ${gradient}`}>
            <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-white" />
                </div>
                <p className="text-white/70 text-xs font-medium mb-1">{label}</p>
                <p className="text-white font-black text-xl">{value}</p>
                {sub && <p className="text-white/60 text-[10px] mt-1">{sub}</p>}
            </div>
        </div>
    );
}

export default function MoliyaPage() {
    const { t } = useLang();
    const [entries, setEntries] = useState<any[]>([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
    const [usdRate, setUsdRate] = useState(12500);
    const [isUpdatingRate, setIsUpdatingRate] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"all" | "income" | "expense">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [modalType, setModalType] = useState<"income" | "expense">("expense");

    // Kontragent state
    const [kontragentType, setKontragentType] = useState(""); // "mijoz" | "supplier" | "xodim" | "boshqa"
    const [kontragentList, setKontragentList] = useState<any[]>([]);
    const [kontragentLoading, setKontragentLoading] = useState(false);
    const [kontragentRaw, setKontragentRaw] = useState<{customers: any[], suppliers: any[], staff: any[]}>(
        { customers: [], suppliers: [], staff: [] }
    );

    const [form, setForm] = useState({
        type: "expense" as "income" | "expense",
        category: "",
        amount: "",
        description: "",
        paymentMethod: "Naqd pul",
        kontragent: "",
    });

    const fetchKontragents = async () => {
        setKontragentLoading(true);
        try {
            const res = await fetch("/api/ubt/kontragent");
            if (res.ok) {
                const data = await res.json();
                setKontragentRaw(data);
            }
        } catch (e) { console.error(e); }
        finally { setKontragentLoading(false); }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/moliya");
            if (res.ok) {
                const data = await res.json();
                setEntries(data.entries || []);
                setSummary(data.summary || { totalIncome: 0, totalExpense: 0, netProfit: 0 });
                setUsdRate(data.usdRate || 12500);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleUpdateRate = async () => {
        const newRate = prompt("Yangi AQSh Dollari kursini kiriting (1 $ = ? UZS):", String(usdRate));
        if (!newRate || isNaN(Number(newRate))) return;
        
        setIsUpdatingRate(true);
        try {
            const res = await fetch("/api/ubt/moliya", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usdRate: Number(newRate) }),
            });
            if (res.ok) {
                const data = await res.json();
                setUsdRate(data.usdRate);
            } else {
                alert("Kursni saqlashda xatolik yuz berdi.");
            }
        } catch (e) {
            console.error(e);
            alert("Internet yoki server xatosi");
        } finally {
            setIsUpdatingRate(false);
        }
    };

    const openModal = (type: "income" | "expense") => {
        setModalType(type);
        setForm({ type, category: "", amount: "", description: "", paymentMethod: "Naqd pul", kontragent: "" });
        setKontragentType("");
        setKontragentList([]);
        setIsModalOpen(true);
        fetchKontragents(); // preload in background
    };

    const handleKontragentTypeChange = (t: string) => {
        setKontragentType(t);
        setForm(f => ({ ...f, kontragent: "" }));
        if (t === "mijoz") setKontragentList(kontragentRaw.customers);
        else if (t === "supplier") setKontragentList(kontragentRaw.suppliers);
        else if (t === "xodim") setKontragentList(kontragentRaw.staff);
        else setKontragentList([]);
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        if (!form.amount || !form.category) return alert("Kategoriya va Miqdor majburiy!");
        setIsSaving(true);
        try {
            const res = await fetch("/api/ubt/moliya", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form }),
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchData();
            }
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
        await fetch("/api/ubt/moliya", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        fetchData();
    };

    const filtered = useMemo(() => {
        if (activeTab === "all") return entries;
        return entries.filter(e => e.type === activeTab);
    }, [entries, activeTab]);

    // Expense pie chart data
    const expenseByCategory = useMemo(() => {
        const grouped: Record<string, number> = {};
        entries.filter(e => e.type === "expense").forEach(e => {
            grouped[e.category] = (grouped[e.category] || 0) + Number(e.amount);
        });
        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [entries]);

    const profitColor = summary.netProfit >= 0 ? "text-emerald-400" : "text-red-400";

    return (
        <div className="min-h-screen bg-transparent p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">💰 {t('nav.finance')}</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Kirim, xarajatlar va sof foyda nazorati</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleUpdateRate} disabled={isUpdatingRate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition rounded-xl font-bold text-sm shadow-sm">
                        <DollarSign size={16} className="text-blue-500" />
                        {isUpdatingRate ? "Saqlanmoqda..." : `1 $ = ${fmt(usdRate)} UZS`}
                    </button>
                    <button onClick={() => openModal("income")}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-all">
                        <ArrowUpCircle size={16} /> {t('common.add')} (Kirim)
                    </button>
                    <button onClick={() => openModal("expense")}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/30 hover:-translate-y-0.5 transition-all">
                        <ArrowDownCircle size={16} /> {t('common.add')} (Xarajat)
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-5">
                <StatCard label="Jami Kirimlar" value={`${fmt(summary.totalIncome)} UZS`} icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600" sub="Barcha daromadlar" />
                <StatCard label="Jami Xarajatlar" value={`${fmt(summary.totalExpense)} UZS`} icon={TrendingDown}
                    gradient="bg-gradient-to-br from-red-500 to-rose-600" sub="Barcha chiqimlar" />
                <StatCard label="Sof Foyda (P&L)" value={`${fmt(Math.abs(summary.netProfit))} UZS`}
                    icon={DollarSign} gradient={summary.netProfit >= 0 ? "bg-gradient-to-br from-blue-600 to-indigo-700" : "bg-gradient-to-br from-orange-500 to-red-600"}
                    sub={summary.netProfit >= 0 ? "✅ Foyda" : "⚠️ Zarar"} />
            </div>

            {/* Charts + Table */}
            <div className="grid grid-cols-3 gap-5">
                {/* Expense breakdown pie */}
                <div className="col-span-1 bg-white border border-surface-border rounded-2xl p-5 shadow-sm">
                    <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2"><PieIcon size={18} className="text-blue-400" /> Xarajatlar tarkibi</h3>
                    {expenseByCategory.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                                    {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => `${fmt(v)} UZS`} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", color: "#f8fafc" }} />
                                <Legend iconType="circle" iconSize={10} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-10 text-slate-500 text-sm">Hali xarajat qo'shilmagan</div>
                    )}
                </div>

                {/* Entries table */}
                <div className="col-span-2 bg-white border border-surface-border rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-800 font-bold">Kassa Harakatlari</h3>
                        <div className="flex gap-2">
                            {(["all", "income", "expense"] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? "bg-blue-500 text-white" : "text-slate-500 hover:text-slate-800 bg-slate-100"}`}>
                                    {tab === "all" ? t('common.all') || "Barchasi" : tab === "income" ? "✅ Kirimlar" : "❌ Xarajatlar"}
                                </button>
                            ))}
                            <button onClick={fetchData} className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg transition">
                                <RotateCw size={14} className={isLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-64 space-y-2">
                        {isLoading ? (
                            <div className="text-center py-8"><RotateCw className="animate-spin mx-auto text-blue-400" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">{t('common.noData')}</div>
                        ) : (
                            filtered.map(entry => (
                                <div key={entry.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all group
                                    ${entry.type === "income" ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.type === "income" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                            {entry.type === "income" ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-slate-800 font-semibold text-sm">{entry.category}</p>
                                            <p className="text-slate-500 text-xs">
                                                {entry.kontragent && <span className="inline-flex items-center gap-1 mr-1.5 text-blue-600 font-bold"><Users size={10}/>{entry.kontragent} •</span>}
                                                {entry.description || entry.paymentMethod} • {new Date(entry.date).toLocaleDateString("uz-UZ")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-black text-base ${entry.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                                            {entry.type === "income" ? "+" : "-"}{fmt(Number(entry.amount))} UZS
                                        </span>
                                        <button onClick={() => handleDelete(entry.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white border border-surface-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalType === "income" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                    {modalType === "income" ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                </div>
                                <h3 className="text-slate-800 font-bold text-lg">{modalType === "income" ? `${t('common.add')} (Kirim)` : `${t('common.add')} (Xarajat)`}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategoriya *</label>
                                <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-blue-500 transition">
                                    <option value="">-- Tanlang --</option>
                                    {(modalType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Miqdori (UZS) *</label>
                                <input required type="number" min="0" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                                    className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-blue-500 transition" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">To'lov usuli</label>
                                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                                    className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-blue-500 transition">
                                    <option>Naqd pul</option>
                                    <option>Plastik karta</option>
                                    <option>Bank o'tkazma</option>
                                    <option>QR kod</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Izoh</label>
                                <input type="text" placeholder="Qo'shimcha ma'lumot..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-blue-500 transition" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users size={12} className="text-blue-400" /> Kontragent
                                </label>

                                {/* Step 1: Type selector */}
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {[
                                        { key: "mijoz",    label: "Mijoz",    Icon: UserCircle2, bg: "from-blue-500 to-blue-600",     ring: "ring-blue-400" },
                                        { key: "supplier", label: "Ta'minotchi", Icon: Truck,     bg: "from-violet-500 to-purple-600",ring: "ring-violet-400" },
                                        { key: "xodim",    label: "Xodim",    Icon: Building2,   bg: "from-emerald-500 to-teal-600",   ring: "ring-emerald-400" },
                                        { key: "boshqa",   label: "Boshqa",   Icon: PenLine,     bg: "from-slate-500 to-slate-600",    ring: "ring-slate-400" },
                                    ].map(({ key, label, Icon, bg, ring }) => (
                                        <button key={key} type="button"
                                            onClick={() => handleKontragentTypeChange(key)}
                                            className={`group flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all duration-200
                                                ${ kontragentType === key
                                                    ? `bg-gradient-to-br ${bg} border-transparent shadow-lg ring-2 ${ring}/50 scale-[1.04]`
                                                    : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100" }`}>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all
                                                ${ kontragentType === key
                                                    ? "bg-white/20 shadow-inner"
                                                    : `bg-gradient-to-br ${bg} opacity-100` }`}>
                                                <Icon size={16} className="text-white" />
                                            </div>
                                            <span className={`text-[10px] font-bold tracking-wide transition-colors
                                                ${ kontragentType === key ? "text-white" : "text-slate-500 group-hover:text-slate-800" }`}>
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Step 2: Dynamic list / free text */}
                                {kontragentType === "boshqa" && (
                                    <input type="text" placeholder="Kontragent nomini kiriting..."
                                        value={form.kontragent} onChange={e => setForm({ ...form, kontragent: e.target.value })}
                                        className="w-full mt-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-blue-500 transition" />
                                )}

                                {(kontragentType === "mijoz" || kontragentType === "supplier" || kontragentType === "xodim") && (
                                    kontragentLoading ? (
                                        <div className="mt-2 flex items-center justify-center py-4">
                                            <RotateCw size={16} className="animate-spin text-blue-400" />
                                        </div>
                                    ) : (
                                        <select value={form.kontragent} onChange={e => setForm({ ...form, kontragent: e.target.value })}
                                            className="w-full mt-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-blue-500 transition">
                                            <option value="">-- Tanlang --</option>
                                            {kontragentList.map((item: any) => (
                                                <option key={item.id} value={item.name}>
                                                    {item.name}{item.phone ? ` (${item.phone})` : ""}
                                                </option>
                                            ))}
                                            {kontragentList.length === 0 && (
                                                <option disabled>Ro’yxat bo’sh</option>
                                            )}
                                        </select>
                                    )
                                )}

                                {!kontragentType && (
                                    <p className="text-slate-600 text-[11px] mt-2 italic">Yuqoridan kontragent turini tanlang</p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition border border-slate-200">
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" disabled={isSaving}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all disabled:opacity-60
                                    ${modalType === "income" ? "bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30" : "bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30"}`}>
                                    {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
