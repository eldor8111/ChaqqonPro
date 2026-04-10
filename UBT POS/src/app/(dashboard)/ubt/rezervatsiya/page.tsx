"use client";

import { useState, useEffect } from "react";
import {
    CalendarCheck, Plus, X, Check, RotateCw, Phone, Users,
    Clock, CheckCircle, XCircle, Star, ChevronDown
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PhoneInput } from "@/components/ui/PhoneInput";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    confirmed:  { label: "Tasdiqlangan", color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30",    icon: CheckCircle },
    completed:  { label: "Bajarildi",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: Star },
    cancelled:  { label: "Bekor qilindi", color: "text-red-400",   bg: "bg-red-500/10 border-red-500/30",      icon: XCircle },
};

const fmt = (d: string) => new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function RezervatsiyaPage() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState("all");

    const { ubtTables, addUbtReservation } = useStore();
    const freeTables = ubtTables.filter(t => t.status === "free" || t.status === "reserved");

    const [form, setForm] = useState({
        tableId: "",
        customerName: "",
        customerPhone: "",
        guestCount: 2,
        reservationTime: "",
        notes: "",
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/tables");
            // Get reservations from ubtReservations if endpoint exists
            // For now, use the local store since reservations are tracked locally
            setIsLoading(false);
        } catch { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // Get reservations from ubtTables (reserved status)
    const tableReservations = ubtTables
        .filter(t => t.status === "reserved" && t.order)
        .map(t => ({
            id: t.id,
            tableId: t.id,
            tableLabel: t.name,
            customerName: t.order || "Mehmon",
            reservationTime: t.since || new Date().toISOString(),
            status: "confirmed",
            guestCount: "--",
        }));

    const handleSave = async (e: any) => {
        e.preventDefault();
        if (!form.tableId || !form.customerName || !form.reservationTime) return alert("Iltimos barcha maydonlarni to'ldiring!");
        setIsSaving(true);
        try {
            addUbtReservation(form.tableId, form.customerName, form.reservationTime);

            // Also call API for persistence
            await fetch("/api/ubt/tables", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: form.tableId,
                    status: "reserved",
                    order: form.customerName,
                    since: form.reservationTime,
                }),
            });

            setIsModalOpen(false);
            setForm({ tableId: "", customerName: "", customerPhone: "", guestCount: 2, reservationTime: "", notes: "" });
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2"><CalendarCheck size={26} className="text-sky-400" /> Rezervatsiyalar</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Stol bron qilish va mehmonlarni boshqarish</p>
                </div>
                <button onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-sky-500/30 hover:-translate-y-0.5 transition-all">
                    <Plus size={16} /> Yangi Bron
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-sky-600 to-indigo-700 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2"><CalendarCheck size={16} /></div>
                    <p className="text-white/70 text-xs">Jami bronlar</p>
                    <p className="text-white font-black text-2xl">{tableReservations.length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2"><Clock size={16} /></div>
                    <p className="text-white/70 text-xs">Bugungi</p>
                    <p className="text-white font-black text-2xl">{tableReservations.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2"><CheckCircle size={16} /></div>
                    <p className="text-white/70 text-xs">Bo'sh stollar</p>
                    <p className="text-white font-black text-2xl">{ubtTables.filter(t => t.status === "free").length}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2"><Users size={16} /></div>
                    <p className="text-white/70 text-xs">Band stollar</p>
                    <p className="text-white font-black text-2xl">{ubtTables.filter(t => t.status === "occupied").length}</p>
                </div>
            </div>

            {/* Tables visual map */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
                <h3 className="text-slate-800 font-bold mb-4">Zal Xaritasi</h3>
                <div className="flex flex-wrap gap-3">
                    {ubtTables.map(table => (
                        <div key={table.id}
                            className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer hover:scale-105
                            ${table.status === "free" ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" :
                              table.status === "occupied" ? "bg-red-500/10 border-red-500/50 text-red-400" :
                              "bg-sky-500/10 border-sky-500/50 text-sky-400"}`}>
                            <span className="text-xs font-bold">{table.name}</span>
                            <span className={`text-[10px] mt-1 ${table.status === "free" ? "text-emerald-500" : table.status === "occupied" ? "text-red-500" : "text-sky-500"}`}>
                                {table.status === "free" ? "Bo'sh" : table.status === "occupied" ? "Band" : "Bron"}
                            </span>
                        </div>
                    ))}
                    {ubtTables.length === 0 && <p className="text-slate-500 text-sm">Stollar topilmadi. Dashboard → Stollar bo'limidan qo'shing.</p>}
                </div>
            </div>

            {/* Active Reservations */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
                <h3 className="text-slate-800 font-bold mb-4">Faol Bronlar</h3>
                {tableReservations.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">Hozircha faol bron yo'q</div>
                ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                        {tableReservations.map(r => (
                            <div key={r.id} className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sky-300 font-bold text-sm">{r.tableLabel}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Tasdiqlangan</span>
                                </div>
                                <p className="text-white font-semibold">{r.customerName}</p>
                                {r.reservationTime && <p className="text-slate-400 text-xs flex items-center gap-1"><Clock size={11} /> {fmt(r.reservationTime)}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Reservation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <h3 className="text-white font-bold text-lg">📅 Yangi Bron</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stol *</label>
                                <select required value={form.tableId} onChange={e => setForm(p => ({...p, tableId: e.target.value}))}
                                    className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-sky-500">
                                    <option value="">-- Stol tanlang --</option>
                                    {freeTables.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status === "free" ? "Bo'sh" : "Bron"})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mehmon ismi *</label>
                                    <input required type="text" placeholder="Jamshid..." value={form.customerName} onChange={e => setForm(p => ({...p, customerName: e.target.value}))}
                                        className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-sky-500 transition" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefon</label>
                                    <PhoneInput value={form.customerPhone} onChange={val => setForm(p => ({...p, customerPhone: val}))}
                                        className="w-full mt-1.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus-within:border-sky-500 transition" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bron vaqti *</label>
                                    <input required type="datetime-local" value={form.reservationTime} onChange={e => setForm(p => ({...p, reservationTime: e.target.value}))}
                                        className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-sky-500 transition" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mehmonlar soni</label>
                                    <input type="number" min="1" value={form.guestCount} onChange={e => setForm(p => ({...p, guestCount: Number(e.target.value)}))}
                                        className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-sky-500 transition" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Maxsus so'rov</label>
                                <input type="text" placeholder="Tug'ilgan kun, allergiya..." value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                                    className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-sky-500 transition" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700 transition border border-slate-600">Bekor</button>
                                <button type="submit" disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 rounded-xl font-bold text-sm text-white shadow-lg shadow-sky-500/30 disabled:opacity-60 transition">
                                    {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />} Bronni Saqlash
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
