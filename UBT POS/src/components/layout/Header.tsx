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

// ─── MAIN HEADER ──────────────────────────────────────────────────────────────
export default function Header({ onMobileMenuOpen }: { onMobileMenuOpen?: () => void }) {
    const { lang, setLang } = useLang();
    const { user } = useFrontendStore();
    const [showLang, setShowLang] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(mockBranches[0]);
    const [showBranch, setShowBranch] = useState(false);
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
            <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-surface-card border-b border-surface-border flex-shrink-0 relative">
                {/* Center: Logo (Absolute) */}
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className="animate-fade-in flex items-center gap-2">
                        <span className="font-black text-[22px] md:text-[26px] tracking-wider text-slate-800 uppercase">
                            CHAQQON<span className="text-blue-600">PRO</span>
                        </span>
                    </div>
                </div>
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
                            onClick={() => { setShowBranch(!showBranch); setShowLang(false); setShowNotif(false); }}
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
                            onClick={() => { setShowLang(!showLang); setShowNotif(false); setShowBranch(false); }}
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
                            onClick={() => { setShowNotif(!showNotif); setShowLang(false); setShowBranch(false); }}
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

                </div>
            </header>
        </>
    );
}
