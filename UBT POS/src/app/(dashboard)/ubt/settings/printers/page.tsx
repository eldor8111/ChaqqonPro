"use client";

import { useState, useEffect } from "react";
import { Printer, Plus, Trash2, X, CheckCircle, AlertCircle, Wifi, WifiOff, Loader2, Usb } from "lucide-react";

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
        <div className="p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Printer size={20} className="text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-800">Printerlar</h1>
                        <p className="text-sm text-gray-500">ESC/POS termik printerlar (WiFi va USB)</p>
                    </div>
                </div>
                <button onClick={handleOpenModal}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.97]">
                    <Plus size={16} /> Printer qo&apos;shish
                </button>
            </div>

            {/* Success */}
            {success && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                    <CheckCircle size={16} /> {success}
                </div>
            )}

            {/* Printers list */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                    <Loader2 size={28} className="animate-spin mr-2" /> Yuklanmoqda...
                </div>
            ) : printers.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                    <Printer size={48} className="text-gray-200" />
                    <p className="font-bold text-gray-500">Hech qanday printer qo&apos;shilmagan</p>
                    <p className="text-sm text-center">Printer qo&apos;shish tugmasini bosib, printer nomi va IP manzilini kiriting</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {printers.map(p => (
                        <div key={p.id}
                            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isUsb(p) ? "bg-sky-50" : "bg-orange-50"}`}>
                                {isUsb(p)
                                    ? <Usb size={22} className="text-sky-500" />
                                    : <Printer size={22} className="text-orange-500" />}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-gray-800 text-base leading-tight">{p.name}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUsb(p) ? "bg-sky-100 text-sky-600" : "bg-orange-100 text-orange-600"}`}>
                                        {isUsb(p) ? "USB" : "WiFi"}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 font-mono">
                                    {isUsb(p) ? p.ipAddress.replace("usb://", "") : `${p.ipAddress}:${p.port}`}
                                </p>
                            </div>
                            {/* Ping status */}
                            {pingStatus[p.id] === "checking" && (
                                <Loader2 size={16} className="animate-spin text-sky-500 flex-shrink-0" />
                            )}
                            {pingStatus[p.id] === "ok" && (
                                <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                    <Wifi size={14} /> Ulandi
                                </span>
                            )}
                            {pingStatus[p.id] === "fail" && (
                                <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                                    <WifiOff size={14} /> Xato
                                </span>
                            )}
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button onClick={() => handlePing(p)}
                                    className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 text-xs font-bold border border-sky-100 transition-all">
                                    Test chek
                                </button>
                                <button onClick={() => handleDelete(p.id)}
                                    className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info box */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-sm font-bold text-amber-700 mb-1">📡 Ulanish turlari</p>
                <ul className="text-xs text-amber-600 space-y-1">
                    <li>• <strong>WiFi/LAN:</strong> Printer va server bir xil tarmoqda bo&apos;lishi kerak, port 9100</li>
                    <li>• <strong>USB:</strong> Printer kompyuterga USB orqali ulangan va Windows da o&apos;rnatilgan bo&apos;lishi kerak</li>
                    <li>• ESC/POS protokolini qo&apos;llab-quvvatlashi kerak (Epson, Star, XP-Printer)</li>
                </ul>
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 font-bold text-lg">
                                    <Printer size={20} /> Printer qo&apos;shish
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-white/20">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Connect type tabs */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                                <button
                                    onClick={() => setConnectType("wifi")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${connectType === "wifi" ? "bg-white shadow text-orange-600" : "text-gray-500 hover:text-gray-700"}`}>
                                    <Wifi size={16} /> WiFi / LAN
                                </button>
                                <button
                                    onClick={handleSwitchToUsb}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${connectType === "usb" ? "bg-white shadow text-sky-600" : "text-gray-500 hover:text-gray-700"}`}>
                                    <Usb size={16} /> USB
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                                    <AlertCircle size={15} /> {error}
                                </div>
                            )}

                            {/* Printer name */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Printer nomi *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Masalan: Kassa printer" autoFocus
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-orange-400" />
                            </div>

                            {connectType === "wifi" ? (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">IP manzil *</label>
                                    <input value={form.ipAddress} onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))}
                                        placeholder="192.168.1.100"
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono font-semibold text-gray-800 focus:outline-none focus:border-orange-400" />
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-gray-500">Windows printer nomi *</label>
                                        <button onClick={loadWindowsPrinters} className="text-xs text-sky-500 font-bold hover:underline flex items-center gap-1">
                                            {loadingWinPrinters ? <Loader2 size={12} className="animate-spin" /> : null}
                                            Yangilash
                                        </button>
                                    </div>
                                    {winPrinters.length > 0 ? (
                                        <select value={form.usbName} onChange={e => setForm(f => ({ ...f, usbName: e.target.value }))}
                                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-sky-400">
                                            <option value="">Printer tanlang...</option>
                                            {winPrinters.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    ) : (
                                        <div className="space-y-2">
                                            <input value={form.usbName} onChange={e => setForm(f => ({ ...f, usbName: e.target.value }))}
                                                placeholder="Masalan: XP-80"
                                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-sky-400" />
                                            {loadingWinPrinters
                                                ? <p className="text-xs text-gray-400">Printerlar yuklanmoqda...</p>
                                                : <p className="text-xs text-gray-400">Windows &quot;Printerlar va skanerlar&quot; bo&apos;limidagi printer nomini kiriting</p>}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button onClick={handleAdd} disabled={saving}
                                className={`w-full py-3 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] ${connectType === "usb" ? "bg-sky-500 hover:bg-sky-600" : "bg-orange-500 hover:bg-orange-600"}`}>
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Qo&apos;shish</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
