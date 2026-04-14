"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Pencil, Trash2, X, Cuboid, RotateCw } from "lucide-react";
import { formatCurrency } from "@/lib/mockData";

interface NomenklaturaXomashyo {
    id: string;
    name: string;
    unit: string;
    stock: number;
    price: number;
    categoryId?: string;
}

export default function XomashyoPage() {
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
        <div className="space-y-6 animate-fade-in relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Xomashyo</h1>
                    <p className="text-sm text-slate-500 mt-1">Ombordagi barcha xomashyo va mahsulotlar</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium">
                    <Plus size={18} /> Yangi xomashyo
                </button>
            </div>

            {/* Content area */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Xomashyo qidirish..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition text-sm text-slate-700"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center bg-slate-50/50">
                        <RotateCw size={24} className="animate-spin text-emerald-500 mx-auto" />
                        <p className="mt-2 text-slate-500 text-sm">Yuklanmoqda...</p>
                    </div>
                ) : filteredXomashyolar.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/50">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Cuboid size={24} className="text-slate-400" />
                        </div>
                        <h3 className="text-slate-800 font-semibold mb-1">Xomashyolar yo'q</h3>
                        <p className="text-slate-500 text-sm mb-4">Ombor uchun xomashyo kiriting.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-5 py-3 border-b border-slate-100">Nomi</th>
                                <th className="px-5 py-3 border-b border-slate-100">Kategoriya</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-center">O'lchov Birligi</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-right">Qoldiq</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-right">Narxi</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-right">Umumiy Summa</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredXomashyolar.map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                    <td className="px-5 py-3 font-medium text-slate-800">{item.name}</td>
                                    <td className="px-5 py-3 text-slate-600">{categories.find(c => c.id === item.categoryId)?.name || "-"}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-semibold">
                                            {item.unit}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 font-semibold text-right">
                                        <span className={item.stock > 10 ? "text-emerald-600" : "text-amber-500"}>
                                            {item.stock} {item.unit}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right text-slate-500">{formatCurrency(item.price)}</td>
                                    <td className="px-5 py-3 text-right font-semibold text-blue-600">{formatCurrency(item.stock * item.price)}</td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleOpenModal(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={15} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-slate-800 text-lg">{editingItem ? "Xomashyo Tahrirlash" : "Yangi Xomashyo"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Nomi</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Kategoriya</label>
                                <select value={formData.categoryId || ""} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
                                    <option value="">Kategoriya tanlang</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Birligi</label>
                                    <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
                                        <option value="kg">kg</option>
                                        <option value="gramm">gramm</option>
                                        <option value="litr">litr</option>
                                        <option value="dona">dona</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Dastlabki Qoldiq</label>
                                    <input type="number" step="any" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Narxi (so'm)</label>
                                <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Bekor qilish</button>
                                <button type="submit" disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                                    {isSaving ? <RotateCw size={16} className="animate-spin" /> : "Saqlash"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
