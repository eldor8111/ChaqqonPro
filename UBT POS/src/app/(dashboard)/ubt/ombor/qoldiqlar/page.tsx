"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, FileSpreadsheet, PackageX, TrendingUp, Layers, ArrowUpDown } from "lucide-react";
import Link from "next/link";

interface StockItem {
    id: string;
    name: string;
    type: "xomashyo" | "polfabrikat";
    category: string;
    stock: number;
    unit: string;
    costPrice: number;
    sellPrice: number;
}

export default function OmborQoldiqlarPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortRule, setSortRule] = useState({key: 'name', dir: 'asc'});

    useEffect(() => {
        const load = async () => {
            try {
                const [xomashyoRes, polfabrikatRes] = await Promise.all([
                    fetch("/api/ubt/xomashyo?type=xomashyo"),
                    fetch("/api/ubt/xomashyo?type=polfabrikat"),
                ]);

                const xomashyoData = xomashyoRes.ok ? await xomashyoRes.json() : [];
                const polfabrikatData = polfabrikatRes.ok ? await polfabrikatRes.json() : [];

                const xomashyo: StockItem[] = (Array.isArray(xomashyoData) ? xomashyoData : []).map((x: any) => ({
                    id: x.id,
                    name: x.name,
                    type: "xomashyo" as const,
                    category: x.categoryId || "Xomashyo",
                    stock: Number(x.stock) || 0,
                    unit: x.unit || "kg",
                    costPrice: Number(x.price) || 0,
                    sellPrice: 0,
                }));

                const polfabrikat: StockItem[] = (Array.isArray(polfabrikatData) ? polfabrikatData : []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    type: "polfabrikat" as const,
                    category: p.categoryId || "Polfabrikat",
                    stock: Number(p.stock) || 0,
                    unit: p.unit || "kg",
                    costPrice: Number(p.price) || 0,
                    sellPrice: 0,
                }));

                setItems([...xomashyo, ...polfabrikat]);
            } catch (e) {
                console.error("Qoldiqlar yuklanmadi:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredAndSorted = useMemo(() => {
        let res = items.filter(p =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        res.sort((a, b) => {
            const vA = sortRule.key === 'totalValue' ? (a.stock * a.costPrice) : (a as any)[sortRule.key];
            const vB = sortRule.key === 'totalValue' ? (b.stock * b.costPrice) : (b as any)[sortRule.key];
            if (vA < vB) return sortRule.dir === 'asc' ? -1 : 1;
            if (vA > vB) return sortRule.dir === 'asc' ? 1 : -1;
            return 0;
        });
        return res;
    }, [items, searchQuery, sortRule]);

    const getTypeColor = (type: string) => {
        if (type === "xomashyo") return "bg-orange-100 text-orange-700 border-orange-200";
        if (type === "polfabrikat") return "bg-purple-100 text-purple-700 border-purple-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    const getTypeLabel = (type: string) => {
        if (type === "xomashyo") return "XOMASHYO";
        if (type === "polfabrikat") return "POLFABRIKAT";
        return "NOMA'LUM";
    };

    const handleSort = (key: keyof StockItem | 'totalValue') => {
        setSortRule(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const totalPortfolioValue = items.reduce((acc, curr) => acc + (curr.stock * curr.costPrice), 0);
    const lowStockCount = items.filter(u => u.stock <= 5 && u.stock > 0).length;
    const outOfStockCount = items.filter(u => u.stock <= 0).length;

    return (
        <div className="animate-fade-in relative bg-slate-50 min-h-full flex flex-col">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Ombor Qoldiqlari</h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Barcha xomashyo va yarim tayyor mahsulotlar (Polfabrikat) balansi</p>
                    </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-sm hover:bg-emerald-50 transition-all font-bold shadow-sm">
                        <FileSpreadsheet size={18} /> Excel ga yuklab olish
                    </button>
                    <Link href="/ubt/nomenklatura/xomashyo">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5">
                            <Plus size={18} strokeWidth={2.5} /> Yangi xomashyo
                        </button>
                    </Link>
                </div>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="px-6 py-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Ombordagi jami qiymat</p>
                        <h3 className="text-2xl font-black text-slate-800">{loading ? "..." : totalPortfolioValue.toLocaleString()} <span className="text-sm font-semibold text-slate-500">UZS</span></h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Aktiv mahsulotlar</p>
                        <h3 className="text-2xl font-black text-slate-800">{loading ? "..." : items.length} <span className="text-sm font-semibold text-slate-500">tur</span></h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Layers size={24} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Kam zaxira / Tugagan</p>
                        <h3 className="text-2xl font-black text-slate-800">
                            {loading ? "..." : <><span className="text-amber-500">{lowStockCount}</span> / <span className="text-red-500">{outOfStockCount}</span></>}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <PackageX size={24} />
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 flex flex-col p-6 bg-slate-50">
                <div className="flex items-center justify-between mb-4 gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex-1 max-w-[400px] relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Qidiruv (Mahsulot yoki kategoriya nomi bilan)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-700"
                        />
                    </div>
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-100">
                        Topildi: {filteredAndSorted.length} ta
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                        Yuklanmoqda...
                    </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                            <tr>
                                <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">Nomi <ArrowUpDown size={14} className="opacity-50" /></div>
                                </th>
                                <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('category')}>
                                    <div className="flex items-center gap-1">Kategoriya / Turi <ArrowUpDown size={14} className="opacity-50" /></div>
                                </th>
                                <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('stock')}>
                                    <div className="flex items-center gap-1">Joriy qoldiq <ArrowUpDown size={14} className="opacity-50" /></div>
                                </th>
                                <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('costPrice')}>
                                    <div className="flex items-center gap-1">Kelish narxi (Tannarx) <ArrowUpDown size={14} className="opacity-50" /></div>
                                </th>
                                <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalValue')}>
                                    <div className="flex items-center gap-1">Ombordagi Jami Summa <ArrowUpDown size={14} className="opacity-50" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                            {filteredAndSorted.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                                        <PackageX size={48} className="text-slate-300" />
                                        <span className="text-sm font-medium text-slate-500">Omborda yoki Nomenklaturada hech qanday mahsulot mavjud emas.</span>
                                        <Link href="/ubt/nomenklatura/xomashyo" className="text-blue-600 font-semibold hover:underline">Hozir Nomenklaturadan qo&apos;shish</Link>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredAndSorted.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-800">
                                        {item.name}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${getTypeColor(item.type)}`}>
                                            {getTypeLabel(item.type)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className={`text-base font-black ${item.stock <= 5 ? "text-red-600" : "text-emerald-600"}`}>
                                                {item.stock} <span className="text-xs font-semibold opacity-60 ml-0.5">{item.unit}</span>
                                            </span>
                                            {item.stock <= 5 && <span className="text-[10px] text-red-500 tracking-wider font-bold mt-0.5">⚠️ Kam zaxira</span>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-600">{item.costPrice.toLocaleString()} <span className="text-xs opacity-70">so&apos;m / {item.unit}</span></td>
                                    <td className="px-5 py-4 whitespace-nowrap font-black text-slate-800">
                                        {(item.stock * item.costPrice).toLocaleString()} <span className="text-xs text-slate-500 font-semibold">UZS</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
                )}
            </div>
        </div>
        </div>
    );
}
