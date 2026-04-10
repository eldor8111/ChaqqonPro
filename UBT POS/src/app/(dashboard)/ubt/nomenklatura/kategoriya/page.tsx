"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Pencil, Trash2, X, Layers, RotateCw } from "lucide-react";

interface NomenklaturaKategoriya {
    id: string;
    name: string;
    itemCount?: number;
}

export default function KategoriyalarPage() {
    const [nomenklaturaKategoriyalar, setKategoriyalar] = useState<NomenklaturaKategoriya[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NomenklaturaKategoriya | null>(null);
    const [formData, setFormData] = useState({ name: "", itemCount: 0 });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/categories");
            if (res.ok) setKategoriyalar(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Filter
    const filteredKategoriyalar = nomenklaturaKategoriyalar.filter(k =>
        k.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenModal = (item?: NomenklaturaKategoriya) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, itemCount: item.itemCount || 0 });
        } else {
            setEditingItem(null);
            setFormData({ name: "", itemCount: 0 });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = editingItem ? { id: editingItem.id, ...formData } : formData;
            const res = await fetch("/api/ubt/categories", {
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
        if (confirm("Haqiqatan ham bu kategoriyani o'chirmoqchimisiz? Shu kategoriyaga tegishli taomlar ham bo'lishi mumkin!")) {
            await fetch("/api/ubt/categories", {
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
                    <h1 className="text-2xl font-bold text-slate-800">Taomlar Kategoriyasi</h1>
                    <p className="text-sm text-slate-500 mt-1">Menyu bo'limlari va ularning turkumlari</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium">
                    <Plus size={18} /> Yangi kategoriya
                </button>
            </div>

            {/* Content area */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Kategoriya qidirish..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition text-sm text-slate-700"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center bg-slate-50/50">
                        <RotateCw size={24} className="animate-spin text-blue-500 mx-auto" />
                        <p className="mt-2 text-slate-500 text-sm">Yuklanmoqda...</p>
                    </div>
                ) : filteredKategoriyalar.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/50">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Layers size={24} className="text-slate-400" />
                        </div>
                        <h3 className="text-slate-800 font-semibold mb-1">Hozircha kategoriyalar yo'q</h3>
                        <p className="text-slate-500 text-sm mb-4">"Yangi kategoriya" tugmasi orqali katalog tuzing.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-5 py-3 border-b border-slate-100 w-16">ID</th>
                                <th className="px-5 py-3 border-b border-slate-100">Kategoriya Nomi</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-center">Tegishli Taomlar</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredKategoriyalar.map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                    <td className="px-5 py-3 font-semibold text-slate-400">{item.id}</td>
                                    <td className="px-5 py-3 font-medium text-slate-800">{item.name}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold inline-block">
                                            {item.itemCount} ta
                                        </span>
                                    </td>
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
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-slate-800 text-lg">{editingItem ? "Tahrirlash" : "Yangi Kategoriya"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Nomi</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Masalan: Ichimliklar" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Bekor qilish</button>
                                <button type="submit" disabled={isSaving} className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
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
