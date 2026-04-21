"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Pencil, Trash2, X, Cuboid, RotateCw } from "lucide-react";
import { formatCurrency } from "@/lib/mockData";
import { useLang } from "@/lib/LangContext";


interface NomenklaturaXomashyo {
    id: string;
    name: string;
    unit: string;
    stock: number;
    price: number;
    categoryId?: string;
}

export default function XomashyoPage() {
    const { t } = useLang();
    const [nomenklaturaXomashyo, setXomashyo] = useState<NomenklaturaXomashyo[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NomenklaturaXomashyo | null>(null);
    const [formData, setFormData] = useState({ name: "", unit: "kg", stock: 0, price: 0, categoryId: "" });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/xomashyo?type=xomashyo");
            if (res.ok) setXomashyo(await res.json());
            const catRes = await fetch("/api/ubt/categories?type=xomashyo");
            if (catRes.ok) setCategories(await catRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Filter
    const filteredXomashyolar = nomenklaturaXomashyo.filter(x =>
        x.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenModal = (item?: NomenklaturaXomashyo) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, unit: item.unit, stock: item.stock, price: item.price, categoryId: item.categoryId || "" });
        } else {
            setEditingItem(null);
            setFormData({ name: "", unit: "kg", stock: 0, price: 0, categoryId: "" });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = editingItem ? { id: editingItem.id, ...formData, type: "xomashyo" } : { ...formData, type: "xomashyo" };
            const res = await fetch("/api/ubt/xomashyo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Haqiqatan ham bu xomashyoni o'chirmoqchimisiz?")) {
            await fetch("/api/ubt/xomashyo", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });
            fetchData();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{t('nav.nom_raw')}</h1>
                    <p className="text-sm text-slate-500 mt-1">{t('nav.ombor')} — {t('nav.nom_raw')}</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium">
                    <Plus size={18} /> {t('common.add')} {t('nav.nom_raw')}
                </button>
            </div>

            {/* Content area */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                        placeholder={t('common.search') + ' ' + t('nav.nom_raw') + '...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition text-sm text-slate-700"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center bg-slate-50/50">
                        <RotateCw size={24} className="animate-spin text-emerald-500 mx-auto" />
                        <p className="mt-2 text-slate-500 text-sm">{t('common.loading')}</p>
                    </div>
                ) : filteredXomashyolar.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/50">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Cuboid size={24} className="text-slate-400" />
                        </div>
                        <h3 className="text-slate-800 font-semibold mb-1">{t('common.noData')}</h3>
                        <p className="text-slate-500 text-sm mb-4">{t('nav.nom_raw')} {t('common.add')}.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-5 py-3 border-b border-slate-100">{t('common.name')}</th>
                                    <th className="px-5 py-3 border-b border-slate-100 whitespace-nowrap">{t('nav.nom_raw_cats')}</th>
                                    <th className="px-5 py-3 border-b border-slate-100 text-center whitespace-nowrap">{t('inventory.unit') || 'Birlik'}</th>
                                    <th className="px-5 py-3 border-b border-slate-100 text-right whitespace-nowrap">{t('inventory.currentStock')}</th>
                                    <th className="px-5 py-3 border-b border-slate-100 text-right whitespace-nowrap">{t('inventory.wholesalePrice')}</th>
                                    <th className="px-5 py-3 border-b border-slate-100 text-right whitespace-nowrap">{t('common.total')} {t('common.amount')}</th>
                                    <th className="px-5 py-3 border-b border-slate-100 text-right whitespace-nowrap">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredXomashyolar.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                        <td className="px-5 py-3 font-medium text-slate-800 whitespace-nowrap">{item.name}</td>
                                        <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{categories.find(c => c.id === item.categoryId)?.name || "-"}</td>
                                        <td className="px-5 py-3 text-center whitespace-nowrap">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-semibold">
                                                {item.unit}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-semibold text-right whitespace-nowrap">
                                            <span className={item.stock > 10 ? "text-emerald-600" : "text-amber-500"}>
                                                {item.stock} {item.unit}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-slate-500 whitespace-nowrap">{formatCurrency(item.price)}</td>
                                        <td className="px-5 py-3 text-right font-semibold text-blue-600 whitespace-nowrap">{formatCurrency(item.stock * item.price)}</td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => handleOpenModal(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={15} /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4" style={{backdropFilter: "blur(4px)"}}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Cuboid size={22} />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-800 text-lg leading-tight">
                                        {editingItem ? t('common.edit') + ' ' + t('nav.nom_raw') : t('common.add') + ' ' + t('nav.nom_raw')}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">{t('nav.nom_raw')} {t('common.name')}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 overflow-y-auto flex-1 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('common.name')}</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required 
                                        placeholder="Piyoz (Oq)..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm transition-all" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('nav.nom_raw_cats')}</label>
                                    <select value={formData.categoryId || ""} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} 
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm bg-white transition-all">
                                        <option value="">Kategoriya tanlang...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('inventory.unit') || 'Birlik'}</label>
                                        <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} required 
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm bg-white transition-all">
                                            <option value="kg">kg</option>
                                            <option value="gramm">gramm</option>
                                            <option value="litr">litr</option>
                                            <option value="ml">ml</option>
                                            <option value="dona">dona</option>
                                            <option value="qop">qop</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('inventory.currentStock')}</label>
                                        <input type="number" step="any" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} required 
                                            placeholder="0"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm transition-all text-emerald-700 font-bold" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('inventory.wholesalePrice')}</label>
                                    <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} required 
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm transition-all" />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} 
                                    className="flex-1 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all border border-slate-200 bg-white">
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" disabled={isSaving} 
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all disabled:opacity-70">
                                    {isSaving ? <RotateCw size={18} className="animate-spin" /> : t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
