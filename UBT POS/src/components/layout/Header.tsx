"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell, Globe, ChevronDown, Search, LogOut,
    Building2, Check, Settings, Eye, EyeOff, X, Lock, KeyRound, CheckCircle2, AlertCircle, Printer,
    Trash2, AlertTriangle, ShieldAlert, Menu
} from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { useFrontendStore } from "@/lib/frontend/store";
import { mockBranches } from "@/lib/mockData";
import clsx from "clsx";

const languages = [
    { code: "uz", label: "O'zbekcha", flag: "🇺🇿" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "en", label: "English", flag: "🇬🇧" },
] as const;

type AppNotification = {
    id: number;
    type: "alert" | "info" | "warning" | "success";
    title: string;
    desc: string;
    time: string;
};

// ─── Parol o'zgartirish modali ────────────────────────────────────────────────
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
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
                style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(255,255,255,0.12)" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
                            <KeyRound size={17} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base">Parolni o&apos;zgartirish</h2>
                            <p className="text-slate-400 text-xs">Admin hisob paroli</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-5">
                    {success ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                                <CheckCircle2 size={30} className="text-emerald-400" />
                            </div>
                            <p className="text-white font-semibold">Parol muvaffaqiyatli o&apos;zgartirildi!</p>
                            <p className="text-slate-400 text-sm">Oyna yopilmoqda...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Yangi parol */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    Yangi parol
                                </label>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                                    <input
                                        type={showNew ? "text" : "password"}
                                        value={newPw}
                                        onChange={e => { setNewPw(e.target.value); setError(""); }}
                                        required
                                        placeholder="••••••••"
                                        className="w-full pl-9 pr-10 py-3 rounded-xl text-sm placeholder-slate-500 outline-none transition-all font-mono"
                                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                                        onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.background = "rgba(255,255,255,0.09)"; }}
                                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                                    />
                                    <button type="button" onClick={() => setShowNew(v => !v)}
                                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors">
                                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            {/* Yangi parolni tasdiqlash */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    Yangi parolni tasdiqlang
                                </label>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPw}
                                        onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                                        required
                                        placeholder="••••••••"
                                        className="w-full pl-9 pr-10 py-3 rounded-xl text-sm placeholder-slate-500 outline-none transition-all font-mono"
                                        style={{
                                            background: "rgba(255,255,255,0.06)",
                                            color: "#fff",
                                            border: confirmPw && newPw && confirmPw !== newPw
                                                ? "1px solid rgba(239,68,68,0.5)"
                                                : confirmPw && confirmPw === newPw
                                                    ? "1px solid rgba(16,185,129,0.5)"
                                                    : "1px solid rgba(255,255,255,0.12)"
                                        }}
                                        onFocus={e => { if (!confirmPw) e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.background = "rgba(255,255,255,0.09)"; }}
                                        onBlur={e => { if (!confirmPw || confirmPw === newPw) e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors">
                                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {confirmPw && confirmPw === newPw && (
                                    <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                                        <Check size={11} /> Parollar mos keldi
                                    </p>
                                )}
                            </div>

                            {/* Tugmalar */}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose}
                                    className="flex-1 py-3 rounded-xl text-slate-300 text-sm font-medium transition-all hover:bg-white/10"
                                    style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                                    Bekor
                                </button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saqlanmoqda...
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound size={15} />Saqlash
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Hisobotlarni tozalash modali ─────────────────────────────────────────────
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
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
                style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(255,255,255,0.12)" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)" }}>
                            <ShieldAlert size={17} className="text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base">Barcha hisobotlarni o&apos;chirish</h2>
                            <p className="text-slate-400 text-xs">Bu amalni bekor qilib bo&apos;lmaydi</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {done ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                                <CheckCircle2 size={30} className="text-emerald-400" />
                            </div>
                            <p className="text-white font-semibold text-center">Hisobotlar muvaffaqiyatli tozalandi!</p>
                            <div className="w-full rounded-xl p-4 space-y-1.5"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                {[
                                    ["Tranzaksiyalar", done.transactions],
                                    ["Chiqim yozuvlari", done.expenditures],
                                    ["Kirim yozuvlari", done.receipts],
                                    ["Ko'chirish yozuvlari", done.transfers],
                                    ["Inventarizatsiya", done.counts],
                                    ["Hisobdan chiqarish", done.writeoffs],
                                    ["Audit yozuvlari", done.auditLogs],
                                ].map(([label, cnt]) => (
                                    <div key={label as string} className="flex justify-between text-sm">
                                        <span className="text-slate-400">{label}</span>
                                        <span className="text-red-400 font-bold">{cnt} ta o&apos;chirildi</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={onClose}
                                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all"
                                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                                Yopish
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Warning box */}
                            <div className="rounded-xl p-4 flex gap-3"
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
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
                                    <p className="text-amber-400 font-semibold text-xs mt-2">
                                        ⚠️ Mahsulot katalogi, xodimlar va sozlamalar o&apos;CHIRILMAYDI.
                                    </p>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Confirm checkbox */}
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setError(""); }}
                                    className="mt-0.5 w-4 h-4 rounded accent-red-500 cursor-pointer flex-shrink-0" />
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors leading-snug">
                                    Men barcha hisobot ma&apos;lumotlarini qaytarib bo&apos;lmas tarzda o&apos;chirishni tasdiqlayman
                                </span>
                            </label>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={onClose}
                                    className="flex-1 py-3 rounded-xl text-slate-300 text-sm font-medium transition-all hover:bg-white/10"
                                    style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                                    Bekor
                                </button>
                                <button type="button" onClick={handleClear} disabled={loading || !confirmed}
                                    className="flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                                    style={{ background: confirmed ? "linear-gradient(135deg,#ef4444,#dc2626)" : "rgba(239,68,68,0.3)", boxShadow: confirmed ? "0 4px 20px rgba(239,68,68,0.35)" : "none" }}>
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            O&apos;chirilmoqda...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={15} /> O&apos;chirish
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── MAIN HEADER ──────────────────────────────────────────────────────────────
export default function Header({ onMobileMenuOpen }: { onMobileMenuOpen?: () => void }) {
    const { lang, setLang } = useLang();
    const { user, logout } = useFrontendStore();
    const router = useRouter();
    const [showLang, setShowLang] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const [showUser, setShowUser] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(mockBranches[0]);
    const [showBranch, setShowBranch] = useState(false);
    const [showChangePw, setShowChangePw] = useState(false);
    const [showClearReports, setShowClearReports] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        let mounted = true;
        const fetchNotifs = async () => {
            try {
                const res = await fetch("/api/ubt/notifications");
                if (res.ok) {
                    const data = await res.json();
                    if (mounted && data.notifications) setNotifications(data.notifications);
                }
            } catch {}
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 60000); // 1 daqiqada yangilanadi
        return () => { mounted = false; clearInterval(interval); };
    }, [user?.id, showNotif]); // Also refresh when opened

    return (
        <>
            {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
            {showClearReports && <ClearReportsModal onClose={() => setShowClearReports(false)} />}

            <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-surface-card border-b border-surface-border flex-shrink-0">
                {/* Left: Hamburger (mobile) + Branch selector + Search */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Mobile hamburger */}
                    <button
                        onClick={onMobileMenuOpen}
                        className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-surface-elevated transition-all"
                        aria-label="Menyu"
                    >
                        <Menu size={20} />
                    </button>
                    {/* Branch selector */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowBranch(!showBranch); setShowLang(false); setShowNotif(false); setShowUser(false); }}
                            className="flex items-center gap-2 bg-surface-elevated px-3 py-2 rounded-xl border border-surface-border hover:border-brand-500/50 transition-all text-sm text-slate-200"
                        >
                            <Building2 size={15} className="text-brand-400" />
                            <span className="max-w-[140px] truncate">{selectedBranch.name}</span>
                            <ChevronDown size={14} className="text-slate-400" />
                        </button>
                        {showBranch && (
                            <div className="absolute top-full mt-2 left-0 w-56 glass-card shadow-card py-1 z-50 animate-fade-in">
                                {mockBranches.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => { setSelectedBranch(b); setShowBranch(false); }}
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-200 hover:bg-surface-elevated transition-colors"
                                    >
                                        <span>{b.name}</span>
                                        {selectedBranch.id === b.id && <Check size={14} className="text-brand-400" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative hidden md:flex items-center">
                        <Search size={15} className="absolute left-3 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Qidirish..."
                            className="bg-surface-elevated border border-surface-border rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 w-56 transition-all"
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">

                    {/* Language */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowLang(!showLang); setShowNotif(false); setShowBranch(false); setShowUser(false); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-surface-elevated transition-all text-sm border border-surface-border"
                        >
                            <Globe size={15} />
                            <span>{languages.find(l => l.code === lang)?.flag}</span>
                            <span className="uppercase text-xs font-medium">{lang}</span>
                        </button>
                        {showLang && (
                            <div className="absolute top-full mt-2 right-0 w-44 glass-card shadow-card py-1 z-50 animate-fade-in">
                                {languages.map(l => (
                                    <button
                                        key={l.code}
                                        onClick={() => { setLang(l.code); setShowLang(false); }}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-surface-elevated transition-colors",
                                            lang === l.code ? "text-brand-400" : "text-slate-200"
                                        )}
                                    >
                                        <span>{l.flag} {l.label}</span>
                                        {lang === l.code && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowNotif(!showNotif); setShowLang(false); setShowBranch(false); setShowUser(false); }}
                            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-surface-elevated transition-all"
                        >
                            <Bell size={18} />
                            {notifications.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"></span>
                            )}
                        </button>
                        {showNotif && (
                            <div className="absolute top-full mt-2 right-0 w-80 glass-card shadow-card py-2 z-50 animate-fade-in max-h-96 overflow-y-auto">
                                <p className="px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-surface-border">
                                    Bildirishnomalar
                                </p>
                                {notifications.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-sm">Bildirishnomalar yo'q 🎉</div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className="px-4 py-3 hover:bg-surface-elevated transition-colors cursor-pointer border-b border-surface-border last:border-0 opacity-90 blur-0">
                                            <div className="flex items-start justify-between">
                                                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                                    {n.type === 'alert' && <AlertCircle size={14} className="text-danger flex-shrink-0" />}
                                                    {n.type === 'info' && <Bell size={14} className="text-brand-500 flex-shrink-0" />}
                                                    {n.title}
                                                </p>
                                                {n.time && <p className="text-[10px] whitespace-nowrap text-slate-400 font-semibold">{n.time === "Doimiy" ? n.time : `${n.time} oldin`}</p>}
                                            </div>
                                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* User */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowUser(!showUser); setShowLang(false); setShowNotif(false); setShowBranch(false); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-elevated transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold shadow-glow">
                                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-slate-800 leading-tight capitalize">{user?.name || "Admin"}</p>
                                <p className="text-xs text-slate-400">{user?.role || "Administrator"}</p>
                            </div>
                            <ChevronDown size={14} className="text-slate-400" />
                        </button>
                        {showUser && (
                            <div className="absolute top-full mt-2 right-0 w-52 glass-card shadow-card py-1 z-50 animate-fade-in">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-surface-border">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">{user?.name || "Admin"}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mt-0.5">{user?.role || "Administrator"}</p>
                                </div>

                                {/* Parolni o'zgartirish */}
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
                    </div>
                </div>
            </header>
        </>
    );
}
