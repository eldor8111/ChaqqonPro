"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, X, Users, Phone, FileText, Building2 } from "lucide-react";
import { PhoneInput } from "@/components/ui/PhoneInput";
import clsx from "clsx";

interface Supplier {
    id: string;
    name: string;
    phone?: string;
    info?: string;
}

const emptyForm = { name: "", phone: "", info: "" };

async function fetchSuppliers(): Promise<Supplier[]> {
    const res = await fetch("/api/ubt/kontragent");
    if (!res.ok) throw new Error("Kontragentlarni yuklashda xatolik");
    const data = await res.json();
    return data.suppliers || [];
}

async function createSupplier(body: typeof emptyForm) {
    const res = await fetch("/api/ubt/kontragent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Xatolik");
    return data;
}

async function updateSupplier(id: string, body: typeof emptyForm) {
    const res = await fetch(`/api/ubt/kontragent/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Xatolik");
    return data;
}

async function deleteSupplier(id: string) {
    const res = await fetch(`/api/ubt/kontragent/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Xatolik");
    return data;
}

export default function KontragentPage() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ["suppliers"],
        queryFn: fetchSuppliers,
    });

    const createMutation = useMutation({
        mutationFn: createSupplier,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); closeForm(); },
        onError: (e: any) => setErrorMsg(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: typeof emptyForm }) => updateSupplier(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); closeForm(); },
        onError: (e: any) => setErrorMsg(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSupplier,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); setDeleteConfirmId(null); },
    });

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm });
        setErrorMsg("");
    };

    const openNew = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setErrorMsg("");
        setShowForm(true);
    };

    const openEdit = (s: Supplier) => {
        setEditingId(s.id);
        setForm({ name: s.name, phone: s.phone || "", info: s.info || "" });
        setErrorMsg("");
        setShowForm(true);
    };

    const handleSave = () => {
        if (!form.name.trim()) { setErrorMsg("Nom majburiy"); return; }
        setErrorMsg("");
        if (editingId) {
            updateMutation.mutate({ id: editingId, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone || "").includes(search) ||
        (s.info || "").toLowerCase().includes(search.toLowerCase())
    );

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Kontragentlar</h1>
                    <p className="text-sm text-slate-400 mt-1">{suppliers.length} ta yetkazib beruvchi</p>
                </div>
                <button
                    onClick={openNew}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={16} /> Kontragent qo&apos;shish
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 rounded-xl border border-surface-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Building2 size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{suppliers.length}</p>
                            <p className="text-xs text-slate-400">Jami kontragent</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl border border-surface-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Phone size={20} className="text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">
                                {suppliers.filter(s => s.phone).length}
                            </p>
                            <p className="text-xs text-slate-400">Telefon bor</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl border border-surface-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <FileText size={20} className="text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">
                                {suppliers.filter(s => s.info).length}
                            </p>
                            <p className="text-xs text-slate-400">Izoh bor</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Ism, telefon yoki izoh..."
                    className="input-field pl-9"
                />
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nomi</th>
                            <th>Telefon</th>
                            <th>Izoh / Manzil</th>
                            <th>Harakat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center text-slate-500 py-10">Yuklanmoqda...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-14">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <Users size={40} className="opacity-30" />
                                        <p className="text-sm font-medium">
                                            {search ? "Qidiruv bo'yicha natija topilmadi" : "Hali kontragent qo'shilmagan"}
                                        </p>
                                        {!search && (
                                            <button onClick={openNew} className="text-xs text-blue-500 hover:underline">
                                                Birinchi kontragentni qo&apos;shish
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map((s, i) => (
                            <tr key={s.id}>
                                <td className="text-slate-400 text-sm w-10">{i + 1}</td>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-500 flex-shrink-0">
                                            {s.name[0]?.toUpperCase()}
                                        </div>
                                        <span className="font-medium text-slate-800">{s.name}</span>
                                    </div>
                                </td>
                                <td className="text-slate-500 text-sm">{s.phone || <span className="text-slate-300">—</span>}</td>
                                <td className="text-slate-500 text-sm max-w-xs truncate">{s.info || <span className="text-slate-300">—</span>}</td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEdit(s)}
                                            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-brand/20 text-slate-400 hover:text-brand transition-all"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(s.id)}
                                            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-danger/20 text-slate-400 hover:text-danger transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeForm} />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                            <h2 className="font-semibold text-gray-800 text-[15px]">
                                {editingId ? "Kontragentni tahrirlash" : "Yangi kontragent qo'shish"}
                            </h2>
                            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto px-5 py-5 space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                                    Nomi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Masalan: Toshkent Savdo MChJ"
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Telefon</label>
                                <PhoneInput
                                    value={form.phone}
                                    onChange={val => setForm(f => ({ ...f, phone: val }))}
                                    className="w-full text-sm border border-gray-200 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Izoh / Manzil</label>
                                <textarea
                                    value={form.info}
                                    onChange={e => setForm(f => ({ ...f, info: e.target.value }))}
                                    placeholder="Manzil, bank rekvizitlari yoki qo'shimcha ma'lumot..."
                                    rows={4}
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                                />
                            </div>

                            {errorMsg && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                                    {errorMsg}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isPending || !form.name.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? "Saqlanmoqda..." : editingId ? "Saqlash" : "Qo'shish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
                    <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="font-bold text-slate-800 text-lg mb-2">O&apos;chirishni tasdiqlang</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Ushbu kontragent butunlay o&apos;chirib tashlanadi. Bu amalni qaytarib bo&apos;lmaydi.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Bekor
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                                disabled={deleteMutation.isPending}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-colors disabled:opacity-50"
                            >
                                {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
