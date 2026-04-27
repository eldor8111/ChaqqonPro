"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronUp, LogOut, Settings, Printer, Trash2, KeyRound, CheckCircle2, AlertCircle, X, Lock, Eye, EyeOff, Check, ShieldAlert, AlertTriangle
} from "lucide-react";
import { useFrontendStore } from "@/lib/frontend/store";
import clsx from "clsx";

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (newPw !== confirmPw) { setError("Yangi parollar mos kelmadi"); return; }
        if (newPw.length < 4) { setError("Parol kamida 4 ta belgi bo'lishi kerak"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword: newPw }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(onClose, 1800);
            } else {
                setError(data.error || "Xatolik yuz berdi");
            }
        } catch {
            setError("Server bilan bog'lanishda xatolik");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
                style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(255,255,255,0.12)" }} onClick={e => e.stopPropagation()}>
                <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
                            <KeyRound size={17} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base">Parolni o&apos;zgartirish</h2>
                            <p className="text-slate-400 text-xs">Admin hisob paroli</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
                </div>
                <div className="px-6 py-5">
                    {success ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                                <CheckCircle2 size={30} className="text-emerald-400" />
                            </div>
                            <p className="text-white font-semibold">Parol muvaffaqiyatli o&apos;zgartirildi!</p>
                            <p className="text-slate-400 text-sm">Oyna yopilmoqda...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Yangi parol</label>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                                    <input type={showNew ? "text" : "password"} value={newPw} onChange={e => { setNewPw(e.target.value); setError(""); }} required placeholder="••••••••"
                                        className="w-full pl-9 pr-10 py-3 rounded-xl text-sm placeholder-slate-500 outline-none transition-all font-mono"
                                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                                        onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.background = "rgba(255,255,255,0.09)"; }}
                                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                                    />
                                    <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors">
                                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Yangi parolni tasdiqlang</label>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                                    <input type={showConfirm ? "text" : "password"} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(""); }} required placeholder="••••••••"
                                        className="w-full pl-9 pr-10 py-3 rounded-xl text-sm placeholder-slate-500 outline-none transition-all font-mono"
                                        style={{
                                            background: "rgba(255,255,255,0.06)", color: "#fff",
                                            border: confirmPw && newPw && confirmPw !== newPw ? "1px solid rgba(239,68,68,0.5)" : confirmPw && confirmPw === newPw ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.12)"
                                        }}
                                        onFocus={e => { if (!confirmPw) e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.background = "rgba(255,255,255,0.09)"; }}
                                        onBlur={e => { if (!confirmPw || confirmPw === newPw) e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors">
                                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {confirmPw && confirmPw === newPw && <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1"><Check size={11} /> Parollar mos keldi</p>}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-slate-300 text-sm font-medium transition-all hover:bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>Bekor</button>
                                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>
                                    {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saqlanmoqda...</> : <><KeyRound size={15} />Saqlash</>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function ClearReportsModal({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState<Record<string, number> | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    const handleClear = async () => {
        if (!confirmed) { setError("Iltimos, tasdiqlash katakchasini belgilang"); return; }
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/ubt/reports/clear", { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Xatolik yuz berdi"); return; }
            setDone(data.deleted);
        } catch {
            setError("Server bilan bog'lanishda xatolik");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl animate-fade-in" style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(255,255,255,0.12)" }} onClick={e => e.stopPropagation()}>
                <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)" }}>
                            <ShieldAlert size={17} className="text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base">Barcha hisobotlarni o&apos;chirish</h2>
                            <p className="text-slate-400 text-xs">Bu amalni bekor qilib bo&apos;lmaydi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    {done ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                                <CheckCircle2 size={30} className="text-emerald-400" />
                            </div>
                            <p className="text-white font-semibold text-center">Hisobotlar muvaffaqiyatli tozalandi!</p>
                            <div className="w-full rounded-xl p-4 space-y-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                {[["Tranzaksiyalar", done.transactions], ["Chiqim yozuvlari", done.expenditures], ["Kirim yozuvlari", done.receipts], ["Ko'chirish yozuvlari", done.transfers], ["Inventarizatsiya", done.counts], ["Hisobdan chiqarish", done.writeoffs], ["Audit yozuvlari", done.auditLogs]].map(([label, cnt]) => (
                                    <div key={label as string} className="flex justify-between text-sm">
                                        <span className="text-slate-400">{label}</span>
                                        <span className="text-red-400 font-bold">{cnt} ta o&apos;chirildi</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={onClose} className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>Yopish</button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-xl p-4 flex gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1 text-sm">
                                    <p className="text-red-300 font-semibold">Quyidagilar butunlay o&apos;chiriladi:</p>
                                    <ul className="text-slate-400 space-y-0.5 list-disc list-inside text-xs leading-relaxed">
                                        <li>Barcha to&apos;lov tranzaksiyalari</li>
                                        <li>Ombor kirim / chiqim yozuvlari</li>
                                        <li>Ko&apos;chirish va inventarizatsiya tarixi</li>
                                        <li>Hisobdan chiqarish yozuvlari</li>
                                        <li>Audit log yozuvlari</li>
                                    </ul>
                                    <p className="text-amber-400 font-semibold text-xs mt-2">⚠️ Mahsulot katalogi, xodimlar va sozlamalar o&apos;CHIRILMAYDI.</p>
                                </div>
                            </div>
                            {error && (
                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            )}
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setError(""); }} className="mt-0.5 w-4 h-4 rounded accent-red-500 cursor-pointer flex-shrink-0" />
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors leading-snug">Men barcha hisobot ma&apos;lumotlarini qaytarib bo&apos;lmas tarzda o&apos;chirishni tasdiqlayman</span>
                            </label>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-slate-300 text-sm font-medium transition-all hover:bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>Bekor</button>
                                <button type="button" onClick={handleClear} disabled={loading || !confirmed} className="flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40" style={{ background: confirmed ? "linear-gradient(135deg,#ef4444,#dc2626)" : "rgba(239,68,68,0.3)", boxShadow: confirmed ? "0 4px 20px rgba(239,68,68,0.35)" : "none" }}>
                                    {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />O&apos;chirilmoqda...</> : <><Trash2 size={15} /> O&apos;chirish</>}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function UserProfile({ collapsed }: { collapsed?: boolean }) {
    const { user, logout } = useFrontendStore();
    const router = useRouter();
    const [showUser, setShowUser] = useState(false);
    const [showChangePw, setShowChangePw] = useState(false);
    const [showClearReports, setShowClearReports] = useState(false);

    // Close dropdown when collapsed state changes
    useState(() => { setShowUser(false); });

    return (
        <div className="relative mt-auto border-t border-surface-border px-2 py-4">
            {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
            {showClearReports && <ClearReportsModal onClose={() => setShowClearReports(false)} />}

            {/* Click away listener overlay */}
            {showUser && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUser(false)} 
                />
            )}

            {/* User Dropdown */}
            {showUser && (
                <div 
                    className={clsx(
                        "absolute z-50 glass-card shadow-card py-1 animate-fade-in",
                        collapsed ? "bottom-0 left-full ml-2 w-52" : "bottom-full mb-2 left-2 right-2"
                    )}
                >
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-surface-border">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">{user?.name || "Admin"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mt-0.5">{user?.role || "Administrator"}</p>
                    </div>

                    <button
                        onClick={() => { setShowChangePw(true); setShowUser(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-elevated transition-colors"
                    >
                        <KeyRound size={15} className="text-indigo-500 dark:text-indigo-400" /> Parolni o&apos;zgartirish
                    </button>

                    <button
                        onClick={() => { router.push("/settings"); setShowUser(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-elevated transition-colors"
                    >
                        <Settings size={15} className="text-slate-500 dark:text-slate-400" /> Sozlamalar
                    </button>

                    <button
                        onClick={() => { router.push("/ubt/settings/printers"); setShowUser(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-elevated transition-colors"
                    >
                        <Printer size={15} className="text-slate-500 dark:text-slate-400" /> Printerlar
                    </button>

                    <div className="border-t border-slate-200 dark:border-surface-border my-1" />

                    <button
                        onClick={() => { setShowClearReports(true); setShowUser(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 size={15} /> Hisobotlarni tozalash
                    </button>

                    <div className="border-t border-slate-200 dark:border-surface-border mt-1 pt-1">
                        <button
                            onClick={async () => { 
                                logout(); 
                                try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
                                router.replace("/?mode=admin"); 
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-danger hover:bg-red-50 dark:hover:bg-surface-elevated transition-colors"
                        >
                            <LogOut size={15} /> Chiqish
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setShowUser(!showUser)}
                className={clsx(
                    "flex items-center gap-2 rounded-xl hover:bg-surface-elevated transition-all w-full",
                    collapsed ? "justify-center p-2" : "px-3 py-2"
                )}
            >
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-glow">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
                {!collapsed && (
                    <>
                        <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate capitalize">{user?.name || "Admin"}</p>
                            <p className="text-[10px] text-slate-400 truncate">{user?.role || "Administrator"}</p>
                        </div>
                        <ChevronUp 
                            size={14} 
                            className={clsx("text-slate-400 transition-transform", showUser && "rotate-180")} 
                        />
                    </>
                )}
            </button>
        </div>
    );
}
