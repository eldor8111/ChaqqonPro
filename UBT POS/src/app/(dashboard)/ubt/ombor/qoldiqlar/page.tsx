"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, FileSpreadsheet, PackageX, TrendingUp, ShoppingBag, ArrowUpDown, AlertTriangle } from "lucide-react";
import Link from "next/link";

type FilterType = "all" | "xomashyo" | "mahsulot";

interface StockItem {
    id: string;
    name: string;
    type: "xomashyo" | "mahsulot";
    category: string;
    stock: number;
    minStock: number;
    unit: string;
    costPrice: number;
}

export default function OmborQoldiqlarPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortRule, setSortRule] = useState({ key: "name", dir: "asc" });

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch: xomashyo (raw materials) + mahsulot (products like Pepsi, Kola)
                const [xomashyoRes, mahsulotRes] = await Promise.all([
                    fetch("/api/ubt/xomashyo?type=xomashyo"),
                    fetch("/api/ubt/menu?type=mahsulot"),   // products from Taomlar section
                ]);
                const xomashyoData = xomashyoRes.ok ? await xomashyoRes.json() : [];
                const mahsulotData = mahsulotRes.ok ? await mahsulotRes.json() : [];

                // Map xomashyo (raw materials)
                const xomashyo: StockItem[] = (Array.isArray(xomashyoData) ? xomashyoData : []).map((x: any) => ({
                    id: x.id,
                    name: x.name,
                    type: "xomashyo" as const,
                    category: x.categoryId || "Xomashyo",
                    stock: Number(x.stock) || 0,
                    minStock: Number(x.minStock) || 5,
                    unit: x.unit || "kg",
                    costPrice: Number(x.price) || 0,
                }));

                // Map mahsulot — items from Taomlar section with type='mahsulot' or hasBarcode=true
                // These are sellable goods (Pepsi, Cola, water, etc.)
                const mahsulot: StockItem[] = (Array.isArray(mahsulotData) ? mahsulotData : [])
                    .filter((m: any) => m.type === "mahsulot" || m.hasBarcode)
                    .map((m: any) => ({
                        id: m.id,
                        name: m.name,
                        type: "mahsulot" as const,
                        category: m.categoryId || "Mahsulot",
                        stock: Number(m.stock) || 0,
                        minStock: Number(m.minStock) || 3,
                        unit: m.unit || "dona",
                        costPrice: Number(m.cost || m.price) || 0,
                    }));

                setItems([...xomashyo, ...mahsulot]);
            } catch (e) {
                console.error("Qoldiqlar yuklanmadi:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredAndSorted = useMemo(() => {
        let res = items.filter(p => {
            const matchType = activeFilter === "all" || p.type === activeFilter;
            const matchSearch = !searchQuery ||
                p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.category?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchType && matchSearch;
        });
        res.sort((a, b) => {
            const vA = sortRule.key === "totalValue" ? (a.stock * a.costPrice) : (a as any)[sortRule.key];
            const vB = sortRule.key === "totalValue" ? (b.stock * b.costPrice) : (b as any)[sortRule.key];
            if (vA < vB) return sortRule.dir === "asc" ? -1 : 1;
            if (vA > vB) return sortRule.dir === "asc" ? 1 : -1;
            return 0;
        });
        return res;
    }, [items, searchQuery, sortRule, activeFilter]);

    const handleSort = (key: string) => {
        setSortRule(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
    };

    // Metrics
    const totalValue = items.reduce((s, i) => s + i.stock * i.costPrice, 0);
    const xomashyoCount = items.filter(i => i.type === "xomashyo").length;
    const mahsulotCount = items.filter(i => i.type === "mahsulot").length;
    const criticalCount = items.filter(i => i.stock > 0 && i.stock <= i.minStock).length;
    const emptyCount = items.filter(i => i.stock <= 0).length;

    const TABS: { key: FilterType; label: string; count: number; color: string }[] = [
        { key: "all",      label: "Barchasi",  count: items.length,    color: "blue"   },
        { key: "xomashyo", label: "Xomashyo",  count: xomashyoCount,   color: "orange" },
        { key: "mahsulot", label: "Mahsulotlar (Pepsi, Kola...)", count: mahsulotCount, color: "emerald" },
    ];

    const typeConfig = {
        xomashyo: { label: "XOMASHYO",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
        mahsulot:  { label: "MAHSULOT",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    };

    const SortTh = ({ label, field }: { label: string; field: string }) => (
        <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
            onClick={() => handleSort(field)}>
            <div className="flex items-center gap-1.5">
                {label}
                <ArrowUpDown size={13} className={sortRule.key === field ? "opacity-100 text-blue-500" : "opacity-30"} />
            </div>
        </th>
    );

    return (
        <div className="animate-fade-in relative bg-slate-50 min-h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Ombor Qoldiqlari</h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Xomashyo va tayyor mahsulotlar (Pepsi, Kola va h.k.) balansi</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-sm hover:bg-emerald-50 transition-all font-bold shadow-sm">
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                        <Link href="/ubt/nomenklatura/xomashyo">
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-500/30 hover:-translate-y-0.5">
                                <Plus size={18} strokeWidth={2.5} /> Yangi xomashyo
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="px-6 py-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-slate-200 bg-white/50">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Jami ombor qiymati</p>
                        <h3 className="text-xl font-black text-slate-800">{loading ? "..." : totalValue.toLocaleString()} <span className="text-sm font-semibold text-slate-400">UZS</span></h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform"><TrendingUp size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Tayyor mahsulotlar</p>
                        <h3 className="text-xl font-black text-emerald-600">{loading ? "..." : mahsulotCount} <span className="text-sm font-semibold text-slate-400">tur</span></h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform"><ShoppingBag size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Kritik kam qoldiq</p>
                        <h3 className="text-xl font-black text-amber-500">{loading ? "..." : criticalCount} <span className="text-sm font-semibold text-amber-300">ta</span></h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform"><AlertTriangle size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Tugagan mahsulotlar</p>
                        <h3 className="text-xl font-black text-red-600">{loading ? "..." : emptyCount} <span className="text-sm font-semibold text-red-300">ta</span></h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform"><PackageX size={22} /></div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 flex flex-col p-6">
                {/* Filter Tabs + Search */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1 flex-wrap">
                        {TABS.map(tab => (
                            <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    activeFilter === tab.key
                                        ? tab.color === "orange"
                                            ? "bg-orange-500 text-white shadow-sm"
                                            : tab.color === "emerald"
                                            ? "bg-emerald-500 text-white shadow-sm"
                                            : "bg-blue-600 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                }`}>
                                {tab.label}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${activeFilter === tab.key ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm min-w-0">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Mahsulot yoki kategoriya nomi..."
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 transition-all" />
                        </div>
                        <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-100 whitespace-nowrap">{filteredAndSorted.length} ta</div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-5 py-4 w-8 text-center">#</th>
                                    <SortTh label="Nomi" field="name" />
                                    <SortTh label="Turi" field="type" />
                                    <SortTh label="Joriy qoldiq" field="stock" />
                                    <SortTh label="Kelish narxi" field="costPrice" />
                                    <SortTh label="Ombordagi Jami" field="totalValue" />
                                    <th className="px-5 py-4">Holati</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                {loading ? (
                                    <tr><td colSpan={7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                                            <span className="text-sm">Yuklanmoqda...</span>
                                        </div>
                                    </td></tr>
                                ) : filteredAndSorted.length === 0 ? (
                                    <tr><td colSpan={7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <PackageX size={48} className="text-slate-300" />
                                            <span className="text-sm font-medium text-slate-500">Hech qanday mahsulot topilmadi</span>
                                            <Link href="/ubt/nomenklatura/xomashyo" className="text-blue-600 font-semibold hover:underline text-sm">Nomenklaturadan qo&apos;shish</Link>
                                        </div>
                                    </td></tr>
                                ) : filteredAndSorted.map((item, idx) => {
                                    const isLow = item.stock > 0 && item.stock <= item.minStock;
                                    const isEmpty = item.stock <= 0;
                                    const tc = typeConfig[item.type];
                                    return (
                                        <tr key={item.id} className={`hover:bg-blue-50/20 transition-colors ${isEmpty ? "bg-red-50/30" : isLow ? "bg-amber-50/30" : ""}`}>
                                            <td className="px-5 py-3.5 text-center text-xs text-slate-400 font-medium">{idx + 1}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {(isEmpty || isLow) && <AlertTriangle size={14} className={isEmpty ? "text-red-500" : "text-amber-500"} />}
                                                    <span className="font-bold text-slate-800">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${tc.cls}`}>{tc.label}</span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className={`text-base font-black ${isEmpty ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                                                        {item.stock.toLocaleString()} <span className="text-xs font-semibold opacity-60">{item.unit}</span>
                                                    </span>
                                                    {isEmpty && <span className="text-[10px] text-red-500 font-bold">🔴 Tugagan</span>}
                                                    {isLow && !isEmpty && <span className="text-[10px] text-amber-500 font-bold">⚠️ Min: {item.minStock} {item.unit}</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-600">
                                                {item.costPrice.toLocaleString()} <span className="text-xs opacity-60">UZS/{item.unit}</span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap font-black text-slate-800">
                                                {(item.stock * item.costPrice).toLocaleString()} <span className="text-xs text-slate-400 font-semibold">UZS</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {isEmpty
                                                    ? <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-bold uppercase">Tugagan</span>
                                                    : isLow
                                                    ? <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase">Kam qoldiq</span>
                                                    : <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">Normal</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
