"use client";
/**
 * POS Printer sozlamalari — alohida sahifa
 * - Printerlar ro'yxati: jonli status (online/offline), rol, test chek
 * - LAN discovery (IPC → server scan fallback)
 * - Qo'lda qo'shish
 * - Print navbati: pending/failed joblar, retry/cancel
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Printer as PrinterIcon, RefreshCw, Wifi, WifiOff, Plus,
    Trash2, ScanLine, CheckCircle2, XCircle, Clock, RotateCcw, Ban,
    ChefHat, Receipt, Wine, HelpCircle, Usb, Network, Pencil, Check, X,
} from "lucide-react";

type PrinterRow = {
    id: string; name: string; ipAddress: string; port: number; role: string;
    status: string; lastSeenAt: string | null; latencyMs: number | null;
    isActive: boolean; isDefault: boolean; paperWidth: number; description: string;
};

type JobRow = {
    id: string; type: string; status: string; attempts: number; maxAttempts: number;
    lastError: string | null; createdAt: string;
    printer: { name: string; ipAddress: string; port: number; role: string };
};

type Discovered = { ip: string; port: number; method?: string; name?: string };

const ROLE_META: Record<string, { label: string; icon: typeof Receipt; cls: string }> = {
    cashier: { label: "Kassa",   icon: Receipt, cls: "bg-sky-100 text-sky-700" },
    kitchen: { label: "Oshxona", icon: ChefHat, cls: "bg-orange-100 text-orange-700" },
    bar:     { label: "Bar",     icon: Wine,    cls: "bg-purple-100 text-purple-700" },
};

const JOB_STATUS_META: Record<string, { label: string; cls: string }> = {
    pending:   { label: "Navbatda",     cls: "bg-amber-100 text-amber-700" },
    claimed:   { label: "Jarayonda",    cls: "bg-blue-100 text-blue-700" },
    printing:  { label: "Chop etilmoqda", cls: "bg-blue-100 text-blue-700" },
    done:      { label: "Bajarildi",    cls: "bg-emerald-100 text-emerald-700" },
    failed:    { label: "Xato",         cls: "bg-red-100 text-red-700" },
    cancelled: { label: "Bekor",        cls: "bg-slate-100 text-slate-600" },
    expired:   { label: "Muddati o'tdi", cls: "bg-slate-100 text-slate-600" },
};

export default function PosPrintersPage() {
    const router = useRouter();
    const [printers, setPrinters] = useState<PrinterRow[]>([]);
    const [jobs, setJobs] = useState<JobRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [probing, setProbing] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [discovered, setDiscovered] = useState<Discovered[]>([]);
    const [discoverNote, setDiscoverNote] = useState("");
    const [savingIp, setSavingIp] = useState<string | null>(null);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [manualIp, setManualIp] = useState("");
    const [manualName, setManualName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editIp, setEditIp] = useState("");
    const [editPort, setEditPort] = useState("");
    const [saving, setSaving] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 4000);
    };

    // ── Data loading ────────────────────────────────────────────
    const loadPrinters = useCallback(async () => {
        try {
            const r = await fetch("/api/smart/printer-heartbeat", { cache: "no-store" });
            const d = await r.json();
            setPrinters(d.printers || []);
        } catch {}
    }, []);

    const loadJobs = useCallback(async () => {
        try {
            const r = await fetch("/api/smart/print-queue?status=pending,claimed,printing,failed&limit=30", { cache: "no-store" });
            const d = await r.json();
            setJobs(d.jobs || []);
        } catch {}
    }, []);

    const probeAll = useCallback(async () => {
        setProbing(true);
        try {
            await fetch("/api/smart/printer-heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            await loadPrinters();
        } catch {}
        setProbing(false);
    }, [loadPrinters]);

    // Worker tick — server pending joblarni chop etadi (EXE rejimida ishlaydi)
    const processTick = useCallback(async () => {
        try {
            await fetch("/api/smart/print-queue/process", { method: "POST" });
        } catch {}
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            await loadPrinters();
            await loadJobs();
            if (active) setLoading(false);
            probeAll();
        })();
        // Har 30s: navbat + statuslar (processTick desktop agent tomonidan bajariladi, brauzerdan emas)
        pollRef.current = setInterval(async () => {
            await Promise.all([loadPrinters(), loadJobs()]);
        }, 30000);
        return () => {
            active = false;
            if (pollRef.current) clearInterval(pollRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // bo'sh deps: useCallback funksiyalar barqaror, qayta ro'yxatdan o'tish kerak emas


    // ── Discovery ───────────────────────────────────────────────
    const handleDiscover = async () => {
        setDiscovering(true);
        setDiscovered([]);
        setDiscoverNote("");
        try {
            // 1) Electron IPC (EXE) — eng tez va aniq
            const ipc = (window as any).ipcAPI;
            if (ipc?.discoverPrinters) {
                const res = await ipc.discoverPrinters();
                const list: Discovered[] = (res?.printers || res || [])
                    .map((p: any) => ({ ip: p.ip || p.address || "", port: p.port || 9100, method: p.method, name: p.name }))
                    .filter((p: Discovered) => p.ip);
                if (list.length > 0) {
                    setDiscovered(dedupe(list));
                    setDiscovering(false);
                    return;
                }
            }
            // 2) Server-side TCP scan
            const r = await fetch("/api/smart/discover-printers", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            const d = await r.json();
            const list: Discovered[] = d.printers || [];
            setDiscovered(dedupe(list));
            if (list.length === 0) setDiscoverNote(`Printer topilmadi. Tekshirilgan tarmoqlar: ${(d.subnets || []).join(", ") || "yo'q"}`);
        } catch (e) {
            setDiscoverNote("Qidirishda xato: " + String(e));
        }
        setDiscovering(false);
    };

    const dedupe = (list: Discovered[]) => {
        const seen = new Set(printers.map(p => `${p.ipAddress}:${p.port}`));
        const out: Discovered[] = [];
        for (const p of list) {
            const key = `${p.ip}:${p.port}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(p);
        }
        return out;
    };

    // ── Actions ─────────────────────────────────────────────────
    const addPrinter = async (ip: string, port: number, name?: string) => {
        setSavingIp(ip);
        try {
            const r = await fetch("/api/smart/printers", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name || `Printer ${ip}`, ipAddress: ip, port }),
            });
            const d = await r.json();
            if (d.success) {
                showToast(`${ip} qo'shildi`);
                setDiscovered(prev => prev.filter(p => p.ip !== ip));
                setManualIp(""); setManualName("");
                await loadPrinters();
                probeAll();
            } else showToast(d.error || "Xato", false);
        } catch (e) { showToast(String(e), false); }
        setSavingIp(null);
    };

    const updatePrinter = async (id: string, patch: Record<string, unknown>) => {
        try {
            await fetch("/api/smart/printers", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...patch }),
            });
            await loadPrinters();
        } catch (e) { showToast(String(e), false); }
    };

    const deletePrinter = async (id: string, name: string) => {
        if (!confirm(`"${name}" o'chirilsinmi?`)) return;
        try {
            await fetch("/api/smart/printers", {
                method: "DELETE", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            showToast("O'chirildi");
            await loadPrinters();
        } catch (e) { showToast(String(e), false); }
    };

    const testPrint = async (p: PrinterRow) => {
        setTestingId(p.id);
        try {
            const r = await fetch("/api/smart/print-queue", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    printerId: p.id, type: "test", priority: 1,
                    payload: {
                        receiptType: "client",
                        orderNum: "TEST",
                        items: [{ name: "Test chek", qty: 1, price: 0 }],
                        total: 0,
                    },
                }),
            });
            const d = await r.json();
            if (d.success) {
                showToast("Test chek navbatga qo'yildi");
                await processTick(); // darhol chop etishga urinish
                await loadJobs();
            } else showToast(d.error || "Xato", false);
        } catch (e) { showToast(String(e), false); }
        setTestingId(null);
    };

    const startEdit = (p: PrinterRow) => {
        setEditingId(p.id);
        setEditName(p.name);
        setEditIp(p.ipAddress.startsWith("usb://") ? p.ipAddress : p.ipAddress);
        setEditPort(String(p.port));
    };

    const cancelEdit = () => { setEditingId(null); setSaving(false); };

    const saveEdit = async (p: PrinterRow) => {
        const name = editName.trim();
        const ip = editIp.trim();
        const port = Number(editPort) || 9100;
        if (!name || !ip) return;
        setSaving(true);
        try {
            await fetch("/api/smart/printers", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: p.id, name, ipAddress: ip, port }),
            });
            showToast("Saqlandi");
            setEditingId(null);
            await loadPrinters();
        } catch (e) { showToast(String(e), false); }
        setSaving(false);
    };

    const jobAction = async (id: string, action: "retry" | "cancel") => {
        try {
            await fetch("/api/smart/print-queue", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action }),
            });
            await loadJobs();
            if (action === "retry") processTick();
        } catch (e) { showToast(String(e), false); }
    };

    // ── UI ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                <button onClick={() => router.push("/smart-pos")}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <PrinterIcon size={20} className="text-sky-600" />
                    <h1 className="font-black text-lg tracking-tight">Printer sozlamalari</h1>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={probeAll} disabled={probing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-600 transition-colors disabled:opacity-50">
                        <RefreshCw size={14} className={probing ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">Holatni tekshirish</span>
                    </button>
                    <button onClick={handleDiscover} disabled={discovering}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-sm font-bold text-white transition-colors disabled:opacity-50">
                        <ScanLine size={14} className={discovering ? "animate-pulse" : ""} />
                        {discovering ? "Qidirilmoqda..." : "Printer qidirish"}
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-6 pb-20">

                {/* ── Topilgan printerlar ── */}
                {(discovered.length > 0 || discoverNote || discovering) && (
                    <section className="bg-white rounded-2xl border border-sky-200 overflow-hidden">
                        <div className="px-4 py-3 bg-sky-50 border-b border-sky-100 flex items-center gap-2">
                            <ScanLine size={16} className="text-sky-600" />
                            <h2 className="font-bold text-sm text-sky-800">Tarmoqdan topilgan printerlar</h2>
                            {discovering && <RefreshCw size={14} className="animate-spin text-sky-500 ml-auto" />}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {discovered.map((p) => (
                                <div key={`${p.ip}:${p.port}`} className="px-4 py-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        {p.method === "usb" ? <Usb size={16} className="text-emerald-600" /> : <Network size={16} className="text-emerald-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{p.name || p.ip}</p>
                                        <p className="text-xs text-slate-500">{p.ip}:{p.port} {p.method ? `· ${p.method}` : ""}</p>
                                    </div>
                                    <button onClick={() => addPrinter(p.ip, p.port, p.name)} disabled={savingIp === p.ip}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50">
                                        {savingIp === p.ip ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                                        Qo'shish
                                    </button>
                                </div>
                            ))}
                            {discovered.length === 0 && !discovering && discoverNote && (
                                <p className="px-4 py-3 text-sm text-slate-500">{discoverNote}</p>
                            )}
                        </div>
                    </section>
                )}

                {/* ── Saqlangan printerlar ── */}
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                        <PrinterIcon size={16} className="text-slate-500" />
                        <h2 className="font-bold text-sm">Printerlar</h2>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{printers.length}</span>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400"><RefreshCw size={20} className="animate-spin mx-auto" /></div>
                    ) : printers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <PrinterIcon size={32} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-semibold">Hali printer qo'shilmagan</p>
                            <p className="text-xs mt-1">Yuqoridagi &quot;Printer qidirish&quot; tugmasini bosing yoki pastda qo'lda kiriting</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {printers.map((p) => {
                                const role = ROLE_META[p.role] || ROLE_META.cashier;
                                const isUsb = p.ipAddress.startsWith("usb://");
                                const online = p.status === "online";
                                return (
                                    <div key={p.id} className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {/* Status indikator */}
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${online ? "bg-emerald-50" : p.status === "offline" ? "bg-red-50" : "bg-slate-100"}`}>
                                                {online ? <Wifi size={16} className="text-emerald-600" />
                                                    : p.status === "offline" ? <WifiOff size={16} className="text-red-500" />
                                                    : <HelpCircle size={16} className="text-slate-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-sm truncate">{p.name}</p>
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${role.cls}`}>{role.label}</span>
                                                    {p.isDefault && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-800 text-white">Asosiy</span>}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {isUsb ? `USB: ${p.ipAddress.slice(6)}` : `${p.ipAddress}:${p.port}`}
                                                    {online && p.latencyMs != null && <span className="text-emerald-600"> · {p.latencyMs}ms</span>}
                                                    {p.status === "offline" && <span className="text-red-500"> · ulanmayapti</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => testPrint(p)} disabled={testingId === p.id}
                                                    className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 text-xs font-bold transition-colors disabled:opacity-50">
                                                    {testingId === p.id ? <RefreshCw size={12} className="animate-spin" /> : "Test chek"}
                                                </button>
                                                <button onClick={() => editingId === p.id ? cancelEdit() : startEdit(p)} title="Tahrirlash"
                                                    className={`p-1.5 rounded-lg transition-colors ${editingId === p.id ? "bg-sky-100 text-sky-600" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"}`}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => deletePrinter(p.id, p.name)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tahrirlash formasi */}
                                        {editingId === p.id && (
                                            <div className="mt-2 ml-12 flex items-center gap-2 flex-wrap">
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    placeholder="Printer nomi"
                                                    className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg border border-sky-300 text-xs outline-none focus:border-sky-500 bg-white"
                                                />
                                                <input
                                                    value={editIp}
                                                    onChange={e => setEditIp(e.target.value)}
                                                    placeholder="IP manzil"
                                                    className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg border border-sky-300 text-xs outline-none focus:border-sky-500 bg-white font-mono"
                                                />
                                                <input
                                                    value={editPort}
                                                    onChange={e => setEditPort(e.target.value)}
                                                    placeholder="Port"
                                                    className="w-16 px-2.5 py-1.5 rounded-lg border border-sky-300 text-xs outline-none focus:border-sky-500 bg-white font-mono"
                                                />
                                                <button onClick={() => saveEdit(p)} disabled={saving || !editName.trim() || !editIp.trim()}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50">
                                                    {saving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />} Saqlash
                                                </button>
                                                <button onClick={cancelEdit}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                                                    <X size={11} /> Bekor
                                                </button>
                                            </div>
                                        )}

                                        {/* Rol tanlash */}
                                        {editingId !== p.id && (
                                        <div className="mt-2 ml-12 flex items-center gap-1.5">
                                            {Object.entries(ROLE_META).map(([key, meta]) => (
                                                <button key={key} onClick={() => updatePrinter(p.id, { role: key })}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${p.role === key ? meta.cls : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>
                                                    <meta.icon size={11} /> {meta.label}
                                                </button>
                                            ))}
                                            <button onClick={() => updatePrinter(p.id, { isDefault: !p.isDefault })}
                                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${p.isDefault ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>
                                                Asosiy
                                            </button>
                                        </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Qo'lda qo'shish */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                        <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Nomi (ixtiyoriy)"
                            className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-sky-300 bg-white" />
                        <input value={manualIp} onChange={e => setManualIp(e.target.value)} placeholder="IP manzil (192.168.1.50)"
                            className="flex-1 min-w-[150px] px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-sky-300 bg-white font-mono" />
                        <button onClick={() => manualIp.trim() && addPrinter(manualIp.trim(), 9100, manualName.trim() || undefined)}
                            disabled={!manualIp.trim() || savingIp === manualIp.trim()}
                            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-colors disabled:opacity-40">
                            <Plus size={14} /> Qo'shish
                        </button>
                    </div>
                </section>

                {/* ── Print navbati ── */}
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                        <Clock size={16} className="text-slate-500" />
                        <h2 className="font-bold text-sm">Print navbati</h2>
                        {jobs.length > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{jobs.length}</span>}
                    </div>
                    {jobs.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                            <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-400" />
                            <p className="text-sm">Navbat bo'sh — barcha cheklar chop etilgan</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {jobs.map((j) => {
                                const meta = JOB_STATUS_META[j.status] || JOB_STATUS_META.pending;
                                return (
                                    <div key={j.id} className="px-4 py-2.5 flex items-center gap-3">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 ${meta.cls}`}>{meta.label}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">
                                                {j.type === "kitchen" ? "Oshxona cheki" : j.type === "test" ? "Test chek" : j.type === "report" ? "Hisobot" : "Mijoz cheki"}
                                                <span className="text-slate-400 font-normal"> → {j.printer?.name}</span>
                                            </p>
                                            {j.lastError && <p className="text-xs text-red-500 truncate">{j.lastError}</p>}
                                            <p className="text-[11px] text-slate-400">
                                                {new Date(j.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                {j.attempts > 0 && ` · urinish ${j.attempts}/${j.maxAttempts}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {j.status === "failed" && (
                                                <button onClick={() => jobAction(j.id, "retry")} title="Qayta urinish"
                                                    className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors">
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                            {["pending", "claimed", "failed"].includes(j.status) && (
                                                <button onClick={() => jobAction(j.id, "cancel")} title="Bekor qilish"
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Ban size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-bold ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
                    {toast.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
