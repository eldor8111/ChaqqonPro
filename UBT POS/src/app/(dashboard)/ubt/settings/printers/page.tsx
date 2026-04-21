"use client";

import { useState, useEffect } from "react";
import { Printer, Plus, Trash2, X, CheckCircle, AlertCircle, Wifi, WifiOff, Loader2, Usb } from "lucide-react";
import { useLang } from "@/lib/LangContext";


interface UbtPrinter {
    id: string;
    name: string;
    ipAddress: string;
    port: number;
    description: string;
    createdAt: string;
}

type ConnectType = "wifi" | "usb";

export default function PrintersPage() {
    const { t } = useLang();
    const [printers, setPrinters] = useState<UbtPrinter[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pingStatus, setPingStatus] = useState<Record<string, "ok" | "fail" | "checking">>({});
    const [connectType, setConnectType] = useState<ConnectType>("wifi");
    const [form, setForm] = useState({ name: "", ipAddress: "", usbName: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [winPrinters, setWinPrinters] = useState<string[]>([]);
    const [loadingWinPrinters, setLoadingWinPrinters] = useState(false);

    const loadPrinters = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/ubt/printers");
            const data = await res.json();
            setPrinters(Array.isArray(data) ? data : []);
        } catch {
            setPrinters([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPrinters(); }, []);

    const loadWindowsPrinters = async () => {
        setLoadingWinPrinters(true);
        try {
            const res = await fetch("/api/ubt/usb-printers");
            const data = await res.json();
            setWinPrinters(Array.isArray(data.printers) ? data.printers : []);
        } catch {
            setWinPrinters([]);
        } finally {
            setLoadingWinPrinters(false);
        }
    };

    const handleOpenModal = () => {
        setShowModal(true);
        setError("");
        setConnectType("wifi");
        setForm({ name: "", ipAddress: "", usbName: "" });
    };

    const handleSwitchToUsb = () => {
        setConnectType("usb");
        if (winPrinters.length === 0) loadWindowsPrinters();
    };

    const handleAdd = async () => {
        const finalName = form.name.trim();
        const finalIp = connectType === "usb" ? `usb://${form.usbName.trim()}` : form.ipAddress.trim();

        if (!finalName) { setError("Printer nomi kiritilishi shart"); return; }
        if (connectType === "wifi" && !form.ipAddress.trim()) { setError("IP manzil kiritilishi shart"); return; }
        if (connectType === "usb" && !form.usbName.trim()) { setError("USB printer nomi tanlanishi shart"); return; }

        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/ubt/printers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: finalName, ipAddress: finalIp, port: 9100 }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Xato"); return; }
            setSuccess("Printer qo'shildi!");
            setShowModal(false);
            setForm({ name: "", ipAddress: "", usbName: "" });
            await loadPrinters();
            setTimeout(() => setSuccess(""), 3000);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Printerni o'chirishni tasdiqlaysizmi?")) return;
        try {
            await fetch("/api/ubt/printers", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            await loadPrinters();
        } catch {}
    };

    // Test print
    const handlePing = async (p: UbtPrinter) => {
        setPingStatus(s => ({ ...s, [p.id]: "checking" }));
        try {
            const res = await fetch("/api/ubt/print", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    printerIp: p.ipAddress,
                    port: p.port,
                    tableName: "Test",
                    items: [{ name: "Test chek", qty: 1, price: 0 }],
                    total: 0,
                    time: new Date().toLocaleString("uz-UZ"),
                }),
            });
            setPingStatus(s => ({ ...s, [p.id]: res.ok ? "ok" : "fail" }));
        } catch {
            setPingStatus(s => ({ ...s, [p.id]: "fail" }));
        }
        setTimeout(() => setPingStatus(s => { const c = { ...s }; delete c[p.id]; return c; }), 4000);
    };

    const isUsb = (p: UbtPrinter) => p.ipAddress.startsWith("usb://");

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-brand/5 dark:from-brand/10 to-transparent pointer-events-none" />
            
            {/* Header */}
            <div className="glass-header flex items-center justify-between p-4 sm:p-6 shrink-0 relative z-10 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        {t('nav.printers') || 'Printerlar'}
                    </h1>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">ESC/POS Termik Printerlar</p>
                </div>
                <button onClick={handleOpenModal} className="btn-primary shadow-brand/20 shadow-lg flex items-center gap-2">
                    <Plus size={18} /> <span className="hidden sm:inline">{t('common.add')} {t('nav.printers') || 'Printer'}</span>
                </button>
            </div>

            {/* Success alert */}
            {success && (
                <div className="m-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in slide-in-from-top-2 relative z-10 mx-6">
                    <CheckCircle size={18} /> {success}
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">
                <div className="max-w-5xl mx-auto space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 size={32} className="animate-spin mb-4 text-brand" />
                            <p className="font-medium animate-pulse">Yuklanmoqda...</p>
                        </div>
                    ) : printers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 glass-card rounded-3xl border-dashed">
                            <div className="w-20 h-20 mb-4 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                                <Printer size={32} className="text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Mavjud Printerlar Yo'q</h3>
                            <p className="text-sm">Yangi printer qo'shish uchun yuqoridagi tugmadan foydalaning.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {printers.map(p => (
                                <div key={p.id} className="glass-card hover:border-brand/30 hover:shadow-brand/5 group transition-all p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4 items-center">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isUsb(p) ? "bg-sky-500/10 text-sky-500" : "bg-brand/10 text-brand"}`}>
                                                {isUsb(p) ? <Usb size={26} /> : <Printer size={26} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-none">{p.name}</h3>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isUsb(p) ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" : "bg-brand/10 text-brand"}`}>
                                                        {isUsb(p) ? "USB" : "WiFi"}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                    {isUsb(p) ? p.ipAddress.replace("usb://", "") : `${p.ipAddress}:${p.port}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDelete(p.id)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="O'chirish">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {pingStatus[p.id] === "checking" && <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-500 bg-sky-500/10 px-2 py-1 rounded-lg"><Loader2 size={14} className="animate-spin" /> Tekshirilmoqda</span>}
                                            {pingStatus[p.id] === "ok" && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg"><Wifi size={14} /> Aloqa mavjud</span>}
                                            {pingStatus[p.id] === "fail" && <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-500/10 px-2 py-1 rounded-lg"><WifiOff size={14} /> Xato</span>}
                                        </div>
                                        <button onClick={() => handlePing(p)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                            Test chek
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Info */}
                    <div className="glass-card bg-amber-500/5 border-amber-500/20 p-5 mt-8">
                        <div className="flex items-center gap-2 mb-2">
                            <Wifi className="text-amber-500" size={18} />
                            <h3 className="font-bold text-amber-600 dark:text-amber-500">Ulanish Turlari Haqqida</h3>
                        </div>
                        <ul className="text-sm text-amber-700/80 dark:text-amber-200/80 space-y-1.5 pl-7 list-disc">
                            <li><strong>WiFi/LAN:</strong> Printer pos tizimi (kassa qurilmasi) yoki server tarmog'i bilan bir xil tarmoqda bo'lishi lozim (TCP: 9100).</li>
                            <li><strong>USB:</strong> Faqatgina printer ulangan kompyuter yoki kassadan turib ishlatish mumkin. Windows "Printerlar va skanerlar" sozlamasidagi rasmiy ismi aniq yozilishi shart.</li>
                            <li>Barcha printerlar <strong>ESC/POS</strong> standartida bo'lishi (Xprinter, Epson, Star va h.k.) va kognitiv drayver bilan sozlangan bo'lishi ishlashni tezlashtiradi.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-black bg-gradient-to-r from-brand to-brand/70 bg-clip-text text-transparent flex items-center gap-2">
                                <Printer size={22} className="text-brand" /> Yangi Printer
                            </h2>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Tabs */}
                            <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                                <button onClick={() => setConnectType("wifi")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${connectType === "wifi" ? "bg-white dark:bg-surface shadow-sm text-brand" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                                    <Wifi size={16} /> Tarmoq (LAN/WiFi)
                                </button>
                                <button onClick={handleSwitchToUsb} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${connectType === "usb" ? "bg-white dark:bg-surface shadow-sm text-sky-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                                    <Usb size={16} /> USB Ulangan
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-sm font-medium">
                                    <AlertCircle size={16} className="shrink-0" /> <span className="leading-tight">{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Printer Nomi</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus
                                    placeholder="Kassa Printer / Oshxona" className="input-field w-full h-12" />
                            </div>

                            {connectType === "wifi" ? (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">IP manzil</label>
                                    <input value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })}
                                        placeholder="192.168.1.100" className="input-field w-full h-12 font-mono tracking-widest text-brand" />
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Windows qurilmasi nomi</label>
                                        <button onClick={loadWindowsPrinters} disabled={loadingWinPrinters} className="text-[10px] text-sky-500 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-sky-600 transition-colors">
                                            {loadingWinPrinters ? <Loader2 size={12} className="animate-spin" /> : "Topish"}
                                        </button>
                                    </div>
                                    {winPrinters.length > 0 ? (
                                        <div className="relative">
                                            <select value={form.usbName} onChange={e => setForm({ ...form, usbName: e.target.value })}
                                                className="input-field w-full h-12 appearance-none pr-10 font-medium">
                                                <option value="" disabled>Qurilmani tanlang...</option>
                                                {winPrinters.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <input value={form.usbName} onChange={e => setForm({ ...form, usbName: e.target.value })} placeholder="XP-80 Printer" className="input-field w-full h-12" />
                                    )}
                                    <p className="text-[11px] text-slate-400 mt-2">Kompyuteringizga ulangan USB printerning aniq nomini kiriting.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 pt-2 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={handleAdd} disabled={saving} className={`btn-primary w-full h-12 text-[15px] ${connectType === "usb" ? "bg-sky-500 hover:bg-sky-600 shadow-sky-500/20" : ""}`}>
                                {saving ? <Loader2 size={20} className="animate-spin text-white/70" /> : "Saqlash"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
