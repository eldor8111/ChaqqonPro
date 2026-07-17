"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell, Globe, ChevronDown, Search, LogOut,
    Building2, Check, Settings, Eye, EyeOff, X, Lock, KeyRound, CheckCircle2, AlertCircle, Printer,
    Trash2, AlertTriangle, ShieldAlert, Menu, BellRing, Utensils
} from "lucide-react";
import { api } from "@/lib/frontend/api";
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
    
    // Waiter calls state
    const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
    const [showWaiterNotif, setShowWaiterNotif] = useState(false);

    const settings = user?.tenant?.settings || {};
    const useMultiBranch = settings.useMultiBranch ?? false;

    useEffect(() => {
        let mounted = true;
        const fetchNotifs = async () => {
            try {
                const res = await fetch("/api/smart/notifications");
                if (res.ok) {
                    const data = await res.json();
                    if (mounted && data.notifications) setNotifications(data.notifications);
                }
            } catch {}
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 120000); // 2 daqiqada yangilanadi
        return () => { mounted = false; clearInterval(interval); };
    }, [user?.id]); // showNotif olib tashlandi — har ochilganda re-subscribe bo'lmas uchun

    // Waiter calls fetcher
    useEffect(() => {
        let mounted = true;
        const tenantId = user?.tenant?.id;
        if (!tenantId) return;

        const fetchWaiterCalls = async () => {
            try {
                const data = await api.menu.waiterCalls(tenantId);
                if (mounted && data.calls) {
                    setWaiterCalls(data.calls);
                }
            } catch {}
        };
        
        fetchWaiterCalls();
        const interval = setInterval(fetchWaiterCalls, 10000); // Har 10 soniyada tekshiradi
        return () => { mounted = false; clearInterval(interval); };
    }, [user?.tenant?.id]);

    const removeWaiterCall = async (tableId: string) => {
        const tenantId = user?.tenant?.id;
        if (!tenantId) return;
        setWaiterCalls(prev => prev.filter(c => c.tableId !== tableId));
        try {
            await api.menu.dismissWaiterCall(tenantId, tableId);
        } catch {}
    };


    return (
        <>
            <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-surface-card border-b border-surface-border flex-shrink-0 relative">
                {/* Left: Logo + Branch selector + Search */}
                <div className="flex items-center gap-3 md:gap-4">
                    {/* Logo */}
                    <div className="animate-fade-in flex items-center gap-2 mr-2">
                        <span className="font-black text-lg md:text-2xl tracking-wider text-slate-800 uppercase">
                            EVIKO<span className="text-blue-600"> POS</span>
                        </span>
                    </div>

                    {/* Branch selector */}
                    {useMultiBranch && (
                        <div className="relative">
                            <button
                                onClick={() => { setShowBranch(!showBranch); setShowLang(false); setShowNotif(false); }}
                                className="flex items-center gap-2 bg-surface-elevated px-3 py-2 rounded-xl border border-surface-border hover:border-brand-500/50 transition-all text-sm text-slate-200"
                            >
                                <Building2 size={15} className="text-brand-400" />
                                <span className="max-w-[100px] md:max-w-[140px] truncate">{selectedBranch.name}</span>
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
                    )}

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
                            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-surface-elevated transition-all text-xs md:text-sm border border-surface-border"
                        >
                            <Globe size={14} className="md:w-[15px] md:h-[15px]" />
                            <span>{languages.find(l => l.code === lang)?.flag}</span>
                            <span className="uppercase text-[10px] md:text-xs font-medium">{lang}</span>
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

                    {/* Waiter Calls Notification */}
                    {waiterCalls.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => { setShowWaiterNotif(!showWaiterNotif); setShowNotif(false); setShowLang(false); setShowBranch(false); }}
                                className="relative p-2 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-all shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse"
                            >
                                <BellRing size={18} />
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                                    {waiterCalls.length}
                                </span>
                            </button>
                            {showWaiterNotif && (
                                <div className="absolute top-full mt-2 right-0 w-80 glass-card shadow-card py-2 z-50 animate-fade-in max-h-96 overflow-y-auto" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
                                    <p className="px-4 pb-2 text-xs font-bold text-danger uppercase tracking-wider border-b border-danger/10 flex items-center gap-2">
                                        <BellRing size={14} /> Ofitsiant chaqiruvlari
                                    </p>
                                    {waiterCalls.map(call => (
                                        <div key={call.tableId} className="px-4 py-3 hover:bg-danger/5 transition-colors border-b border-danger/10 last:border-0 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                                                    <Utensils size={14} className="text-danger" /> Stol {call.tableNumber}
                                                </p>
                                                {call.message && <p className="text-[11px] font-bold text-danger mt-0.5">{call.message}</p>}
                                                <p className="text-[10px] text-slate-500 mt-1">{new Date(call.calledAt).toLocaleTimeString("uz-UZ")} da chaqirdi</p>
                                            </div>
                                            <button
                                                onClick={() => removeWaiterCall(call.tableId)}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors"
                                            >
                                                <Check size={12} /> Bajarildi
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

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
