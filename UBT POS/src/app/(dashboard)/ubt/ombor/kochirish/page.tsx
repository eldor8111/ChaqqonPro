"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileSpreadsheet, X, Check, ArrowRightLeft, RotateCw, AlertTriangle } from "lucide-react";

export default function OmborKochirishPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [transfers, setTransfers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        productId: "",
        productName: "",
        quantity: "",
        fromWarehouse: "Asosiy Ombor",
        toWarehouse: "Oshxona Ombori",
        employee: "",
        notes: "",
        unit: "dona"
    });
    const [isSaving, setIsSaving] = useState(false);

    const fetchTransfers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/ombor/kochirish");
            if (res.ok) {
                const data = await res.json();
                setTransfers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransfers();
    }, []);

    const handleSave = async (e: any) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch("/api/ubt/ombor/kochirish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: new Date(),
                    ...formData,
                })
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ productId: "", productName: "", quantity: "", fromWarehouse: "Asosiy Ombor", toWarehouse: "Oshxona Ombori", employee: "", notes: "", unit: "dona" });
                fetchTransfers();
            } else {
                alert("Xatolik yuz berdi");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const filtered = transfers.filter(t => 
        t.productName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.fromWarehouse?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.toWarehouse?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fade-in relative bg-white border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-7 bg-blue-500 rounded text-transparent">|</div>
                    <h1 className="text-[22px] font-bold text-slate-800">Omborlararo Ko'chirish</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5">
                        <FileSpreadsheet size={16} /> EXCEL
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm hover:from-sky-600 hover:to-blue-700 transition-all font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5">
                        <Plus size={16} strokeWidth={2.5} /> Yangi ko'chirish
                    </button>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1 max-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Qidiruv (Mahsulot yoki Ombor)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400 placeholder:text-slate-300 transition-all"
                        />
                    </div>
                </div>
                <button onClick={fetchTransfers} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                    <RotateCw size={16} className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="p-4 overflow-x-auto flex-1">
                <table className="w-full text-xs text-left whitespace-nowrap border-separate border-spacing-y-2">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                            <th className="px-4 py-3 rounded-l-xl">Sana</th>
                            <th className="px-4 py-3">Mahsulot nomi</th>
                            <th className="px-4 py-3">Qaysi ombordan</th>
                            <th className="px-4 py-3">Qaysi omborga</th>
                            <th className="px-4 py-3">Miqdori</th>
                            <th className="px-4 py-3">Mas'ul xodim</th>
                            <th className="px-4 py-3 rounded-r-xl">Holati</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {isLoading ? (
                            <tr><td colSpan={7} className="text-center py-10"><RotateCw className="animate-spin mx-auto text-sky-500" /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-slate-500">Hech qanday hujjat topilmadi</td></tr>
                        ) : (
                            filtered.map((item) => (
                                <tr key={item.id} className="bg-white border hover:shadow-sm transition-all group">
                                    <td className="px-4 py-3 border-y border-l rounded-l-xl border-slate-100">
                                        {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100 font-medium text-blue-700">{item.productName}</td>
                                    <td className="px-4 py-3 border-y border-slate-100">{item.fromWarehouse}</td>
                                    <td className="px-4 py-3 border-y border-slate-100">{item.toWarehouse}</td>
                                    <td className="px-4 py-3 border-y border-slate-100 font-bold text-sky-600">
                                        {item.quantity} <span className="text-xs text-sky-500/70 font-normal">{item.unit}</span>
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100">{item.employee}</td>
                                    <td className="px-4 py-3 border-y border-r rounded-r-xl border-slate-100">
                                        <span className="px-2 py-1 bg-sky-100 text-sky-800 rounded-md text-[10px] font-bold uppercase tracking-wider">Ko'chirildi</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Premium Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-sky-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
                                    <ArrowRightLeft size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-sky-900">Yangi Ko'chirish Hujjati</h2>
                                    <p className="text-xs text-sky-700/70">Ikki ombor o'rtasida mahsulot almashish</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mahsulot nomi <span className="text-red-500">*</span></label>
                                    <input required type="text" placeholder="Mahsulot nomini kiriting..." value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-sm" />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Miqdori <span className="text-red-500">*</span></label>
                                    <div className="flex">
                                        <input required type="number" step="0.01" min="0" placeholder="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-l-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-sm" />
                                        <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="px-3 py-2.5 rounded-r-xl border-y border-r border-slate-200 bg-slate-50 outline-none text-sm font-medium text-slate-600">
                                            <option value="dona">dona</option>
                                            <option value="kg">kg</option>
                                            <option value="litr">litr</option>
                                            <option value="qop">qop</option>
                                            <option value="blok">blok</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mas'ul xodim</label>
                                    <input type="text" placeholder="Xodim ismini kiriting..." value={formData.employee} onChange={e => setFormData({...formData, employee: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-sm" />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Qaysi Ombordan</label>
                                    <select value={formData.fromWarehouse} onChange={e => setFormData({...formData, fromWarehouse: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-sm bg-white">
                                        <option value="Asosiy Ombor">Asosiy Ombor</option>
                                        <option value="Oshxona Ombori">Oshxona Ombori</option>
                                        <option value="Bar Ombori">Bar Ombori</option>
                                        <option value="Filial Ombori">Filial Ombori</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Qaysi Omborga</label>
                                    <select value={formData.toWarehouse} onChange={e => setFormData({...formData, toWarehouse: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-sm bg-white">
                                        <option value="Oshxona Ombori">Oshxona Ombori</option>
                                        <option value="Bar Ombori">Bar Ombori</option>
                                        <option value="Asosiy Ombor">Asosiy Ombor</option>
                                        <option value="Filial Ombori">Filial Ombori</option>
                                    </select>
                                </div>

                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Izoh</label>
                                    <textarea placeholder="Ko'chirish sababi..." rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-sm resize-none"></textarea>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-sky-100">
                                    <AlertTriangle size={14} /> Umumiy qoldiq o'zgarmaydi, faqat saqlash joyi o'zgaradi.
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">
                                        Bekor qilish
                                    </button>
                                    <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0">
                                        {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
                                        Ko'chirish
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
