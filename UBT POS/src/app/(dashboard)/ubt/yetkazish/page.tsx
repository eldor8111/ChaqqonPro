"use client";

import { useState, useEffect } from "react";
import {
    Bike, Plus, X, Check, RotateCw, Phone, MapPin, Package,
    CheckCircle, Clock, Truck, XCircle, DollarSign, User
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PhoneInput } from "@/components/ui/PhoneInput";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
    new:         { label: "Yangi",       color: "text-blue-400",    icon: Clock,        bg: "bg-blue-500/10 border-blue-500/30" },
    assigned:    { label: "Biriktirildi", color: "text-yellow-400", icon: User,         bg: "bg-yellow-500/10 border-yellow-500/30" },
    on_the_way:  { label: "Yo'lda",      color: "text-orange-400",  icon: Truck,        bg: "bg-orange-500/10 border-orange-500/30" },
    delivered:   { label: "Yetkazildi",  color: "text-emerald-400", icon: CheckCircle,  bg: "bg-emerald-500/10 border-emerald-500/30" },
    cancelled:   { label: "Bekor",       color: "text-red-400",     icon: XCircle,      bg: "bg-red-500/10 border-red-500/30" },
};

const fmt = (n: number) => Math.round(n).toLocaleString("uz-UZ");

export default function YetkazishPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [couriers, setCouriers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState("all");

    const { nomenklaturaTaomlar } = useStore();

    const [form, setForm] = useState({
        customerName: "", customerPhone: "", address: "",
        totalAmount: "", paymentMethod: "Naqd pul", notes: "",
        items: [] as { name: string; qty: number; price: number }[],
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/yetkazish");
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
                setCouriers((data.couriers || []).filter((c: any) => {
                    const role = Array.isArray(c.role) ? c.role : [c.role];
                    return role.some((r: string) => r?.toLowerCase().includes("kuryer"));
                }));
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddItem = () => {
        setForm(prev => ({ ...prev, items: [...prev.items, { name: "", qty: 1, price: 0 }] }));
    };

    const handleItemChange = (idx: number, field: string, value: any) => {
        const newItems = [...form.items];
        (newItems[idx] as any)[field] = value;
        if (field === "name") {
            const prod = nomenklaturaTaomlar.find(p => p.id === value || p.name === value);
            if (prod) newItems[idx].price = prod.price;
        }
        setForm(prev => ({ ...prev, items: newItems }));
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        const total = form.items.reduce((s, i) => s + i.qty * i.price, 0);
        setIsSaving(true);
        try {
            const res = await fetch("/api/ubt/yetkazish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, totalAmount: total || Number(form.totalAmount) }),
            });
            if (res.ok) { setIsModalOpen(false); fetchData(); }
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const updateStatus = async (id: string, status: string) => {
        await fetch("/api/ubt/yetkazish", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        fetchData();
    };

    const assignCourier = async (orderId: string, courier: any) => {
        await fetch("/api/ubt/yetkazish", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: orderId, courierId: courier.id, courierName: courier.name, status: "assigned" }),
        });
        setIsAssignOpen(null);
        fetchData();
    };

    const filtered = filterStatus === "all" ? orders : orders.filter(o => o.status === filterStatus);

    const stats = {
        new: orders.filter(o => o.status === "new").length,
        on_the_way: orders.filter(o => o.status === "on_the_way" || o.status === "assigned").length,
        delivered: orders.filter(o => o.status === "delivered").length,
        total: orders.reduce((s, o) => s + Number(o.totalAmount), 0),
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2"><Bike size={28} className="text-orange-400" /> Yetkazish (Delivery)</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Buyurtmalarni qabul qilish va kuryerlarga biriktirish</p>
                </div>
                <button onClick={() => { setForm({ customerName: "", customerPhone: "", address: "", totalAmount: "", paymentMethod: "Naqd pul", notes: "", items: [{ name: "", qty: 1, price: 0 }] }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-all">
                    <Plus size={16} /> Yangi Buyurtma
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Yangi buyurtmalar", value: stats.new, color: "from-blue-600 to-blue-700", icon: Clock },
                    { label: "Yo'lda / Biriktirildi", value: stats.on_the_way, color: "from-orange-500 to-orange-700", icon: Truck },
                    { label: "Yetkazildi (bugun)", value: stats.delivered, color: "from-emerald-500 to-teal-600", icon: CheckCircle },
                    { label: "Jami summa", value: `${fmt(stats.total)} UZS`, color: "from-sky-600 to-indigo-700", icon: DollarSign },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-xl relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                            <s.icon size={16} className="text-white" />
                        </div>
                        <p className="text-white/70 text-xs">{s.label}</p>
                        <p className="text-white font-black text-xl mt-0.5">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {["all", "new", "assigned", "on_the_way", "delivered", "cancelled"].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700"}`}>
                        {s === "all" ? "Barchasi" : STATUS_CONFIG[s]?.label}
                    </button>
                ))}
                <button onClick={fetchData} className="ml-auto p-1.5 text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700 rounded-lg transition">
                    <RotateCw size={14} className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-3 text-center py-12"><RotateCw className="animate-spin mx-auto text-orange-400 w-8 h-8" /></div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-slate-500">Buyurtma topilmadi</div>
                ) : (
                    filtered.map(order => {
                        const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                        const StatusIcon = sc.icon;
                        return (
                            <div key={order.id} className={`rounded-2xl border p-4 space-y-3 transition-all hover:scale-[1.01] ${sc.bg} bg-slate-800/40 backdrop-blur`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-xs text-slate-400 font-mono">{order.orderNumber}</span>
                                        <p className="text-white font-bold mt-0.5">{order.customerName}</p>
                                    </div>
                                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${sc.color} ${sc.bg} border`}>
                                        <StatusIcon size={12} /> {sc.label}
                                    </span>
                                </div>
                                <div className="space-y-1.5 text-xs text-slate-400">
                                    <div className="flex items-center gap-2"><Phone size={12} /> {order.customerPhone}</div>
                                    <div className="flex items-center gap-2"><MapPin size={12} /> {order.address}</div>
                                    {order.courierName && <div className="flex items-center gap-2"><Bike size={12} className="text-orange-400" /> <span className="text-orange-300">{order.courierName}</span></div>}
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                    <span className="text-white font-black text-base">{fmt(Number(order.totalAmount))} UZS</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>{order.isPaid ? "To'landi" : order.paymentMethod}</span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {order.status === "new" && (
                                        <button onClick={() => setIsAssignOpen(order.id)} className="flex-1 px-3 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold hover:bg-orange-500/30 transition">
                                            <User size={12} className="inline mr-1" /> Kuryer Biriktir
                                        </button>
                                    )}
                                    {order.status === "assigned" && (
                                        <button onClick={() => updateStatus(order.id, "on_the_way")} className="flex-1 px-3 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold hover:bg-orange-500/30 transition">
                                            <Truck size={12} className="inline mr-1" /> Yo'lga chiqdi
                                        </button>
                                    )}
                                    {order.status === "on_the_way" && (
                                        <button onClick={() => updateStatus(order.id, "delivered")} className="flex-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition">
                                            <CheckCircle size={12} className="inline mr-1" /> Yetkazildi ✓
                                        </button>
                                    )}
                                    {!["delivered", "cancelled"].includes(order.status) && (
                                        <button onClick={() => updateStatus(order.id, "cancelled")} className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/30 transition">
                                            <XCircle size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Assign courier modal */}
                                {isAssignOpen === order.id && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-80 shadow-2xl">
                                            <h4 className="text-white font-bold mb-4">Kuryer tanlang</h4>
                                            {couriers.length === 0 ? (
                                                <p className="text-slate-400 text-sm">Kuryer xodimlari topilmadi. Xodimlar bo'limiga Kuryer qo'shing.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {couriers.map(c => (
                                                        <button key={c.id} onClick={() => assignCourier(order.id, c)}
                                                            className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-left border border-slate-700">
                                                            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">{c.name[0]}</div>
                                                            <span className="text-white font-medium">{c.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <button onClick={() => setIsAssignOpen(null)} className="w-full mt-3 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm border border-slate-700">Bekor</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* New Order Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <h3 className="text-white font-bold text-lg">🛵 Yangi Buyurtma</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mijoz ismi *</label>
                                    <input required type="text" placeholder="Akbar..." value={form.customerName} onChange={e => setForm(p => ({...p, customerName: e.target.value}))}
                                        className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-orange-500 transition" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefon *</label>
                                    <PhoneInput value={form.customerPhone} onChange={val => setForm(p => ({...p, customerPhone: val}))}
                                        className="w-full mt-1.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus-within:border-orange-500 transition" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manzil *</label>
                                <input required type="text" placeholder="Shahar, ko'cha, uy raqami..." value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))}
                                    className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-orange-500 transition" />
                            </div>

                            {/* Items */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                    Taomlar <button type="button" onClick={handleAddItem} className="text-orange-400 hover:text-orange-300 flex items-center gap-1"><Plus size={14} /> Qo'shish</button>
                                </label>
                                <div className="mt-2 space-y-2">
                                    {form.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select value={item.name} onChange={e => handleItemChange(idx, "name", e.target.value)}
                                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-orange-500 appearance-none">
                                                <option value="">-- Tanlang --</option>
                                                {nomenklaturaTaomlar.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                            </select>
                                            <input type="number" min="1" value={item.qty} onChange={e => handleItemChange(idx, "qty", Number(e.target.value))}
                                                className="w-16 px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none" />
                                            <button type="button" onClick={() => setForm(p => ({...p, items: p.items.filter((_, i) => i !== idx)}))}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jami summa</label>
                                    <input type="number" placeholder="0" value={form.totalAmount} onChange={e => setForm(p => ({...p, totalAmount: e.target.value}))}
                                        className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-orange-500 transition" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">To'lov usuli</label>
                                    <select value={form.paymentMethod} onChange={e => setForm(p => ({...p, paymentMethod: e.target.value}))}
                                        className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-orange-500">
                                        <option>Naqd pul</option>
                                        <option>Plastik karta</option>
                                        <option>Oldindan to'langan</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Izoh</label>
                                <input type="text" placeholder="Maxsus so'rov..." value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                                    className="w-full mt-1.5 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm outline-none focus:border-orange-500 transition" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700 transition border border-slate-600">Bekor</button>
                                <button type="submit" disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl font-bold text-sm text-white shadow-lg shadow-orange-500/30 disabled:opacity-60 transition">
                                    {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />} Yuborish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
