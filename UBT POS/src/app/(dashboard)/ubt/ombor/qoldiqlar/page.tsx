"use client";

import { useState } from "react";
import { Plus, Search, FileSpreadsheet, PackageX } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";

export default function OmborQoldiqlarPage() {
    const [searchQuery, setSearchQuery] = useState("");
    
    // Nomenklaturadan real ma'lumotlarni olish
    const { nomenklaturaTaomlar, nomenklaturaXomashyo } = useStore();

    // Ikkala ro'yxatni birlashtiramiz (Tayyor taomlar va Xomashyolar)
    const products = [
        ...nomenklaturaTaomlar.map(t => ({ ...t, type: t.type || 'taom', category: t.categoryId })),
        ...nomenklaturaXomashyo.map(x => ({ ...x, type: 'xomashyo', category: 'Xomashyo' }))
    ];

    const filtered = products.filter(p => 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Xomashyo va Mahsulotlarni farqlash uchun ranglar
    const getTypeColor = (type: string) => {
        if (type === 'xomashyo') return "bg-orange-100 text-orange-700 border-orange-200";
        if (type === 'taom') return "bg-blue-100 text-blue-700 border-blue-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    return (
        <div className="animate-fade-in relative bg-white border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-7 bg-blue-500 rounded text-transparent">|</div>
                    <h1 className="text-[22px] font-bold text-slate-800">Ombor Qoldiqlari (Nomenklatura)</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5">
                        <FileSpreadsheet size={16} /> EXCEL
                    </button>
                    <Link href="/ubt/nomenklatura/taomlar">
                        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm hover:from-blue-700 hover:to-indigo-700 transition-all font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5">
                            <Plus size={16} strokeWidth={2.5} /> Yangi mahsulot guruhini yaratish
                        </button>
                    </Link>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1 max-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Qidiruv (Mahsulot nomi)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 placeholder:text-slate-300 transition-all"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                        Jami: {filtered.length} xil mahsulot
                    </div>
                </div>
            </div>

            <div className="p-4 overflow-x-auto flex-1">
                <table className="w-full text-xs text-left whitespace-nowrap border-separate border-spacing-y-2">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                            <th className="px-4 py-3 rounded-l-xl">Nomi</th>
                            <th className="px-4 py-3">Kategoriya / Turi</th>
                            <th className="px-4 py-3">Joriy qoldiq</th>
                            <th className="px-4 py-3">Kelish narxi (Tannarx)</th>
                            <th className="px-4 py-3">Sotish narxi</th>
                            <th className="px-4 py-3 rounded-r-xl">Ombordagi Jami Summa</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                                        <PackageX size={48} className="text-slate-300" />
                                        <span className="text-sm font-medium">Omborda yoki Nomenklaturada hech qanday mahsulot mavjud emas.</span>
                                        <Link href="/ubt/nomenklatura/taomlar" className="text-blue-500 hover:underline">Hozir Nomenklaturadan qo'shish</Link>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((item) => {
                                const stockVal = (item as any).stock || 0;
                                const costVal = (item as any).cost || (item as any).price || 0; // xomashyo uses price as cost
                                const sellVal = (item as any).type === 'taom' ? (item as any).price : 0;
                                
                                return (
                                <tr key={item.id} className="bg-white border hover:shadow-sm transition-all group">
                                    <td className="px-4 py-3 border-y border-l rounded-l-xl border-slate-100 font-bold text-slate-800">
                                        {item.name}
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100">
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getTypeColor(item.type)}`}>
                                            {item.type === 'xomashyo' ? 'XOMASHYO' : 'TAYYOR TAOM'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100">
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-black ${stockVal <= 5 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {stockVal} <span className="text-xs font-normal opacity-70">{(item as any).unit || 'sht'}</span>
                                            </span>
                                            {stockVal <= 5 && <span className="text-[9px] text-red-500 tracking-wider uppercase font-bold mt-0.5">Kam zaxira</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100 font-medium">{costVal.toLocaleString()} so'm / {(item as any).unit || 'sht'}</td>
                                    <td className="px-4 py-3 border-y border-slate-100">{sellVal.toLocaleString()} so'm</td>
                                    <td className="px-4 py-3 border-y border-r rounded-r-xl border-slate-100 font-bold text-slate-800">
                                        {(stockVal * costVal).toLocaleString()} so'm
                                    </td>
                                </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
