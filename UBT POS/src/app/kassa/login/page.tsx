"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, UtensilsCrossed, User, Loader2, LogOut, ArrowRight, X, CreditCard, ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";

interface StaffMember {
    id: string;
    name: string;
    role: string;
    branch: string;
    phone?: string;
}

// Role config
const ROLE_CFG: Record<string, { color: string; bg: string; border: string }> = {
    "Kassir":    { color: "text-amber-300",  bg: "rgba(245,158,11,0.2)",  border: "rgba(245,158,11,0.5)" },
    "Ofitsiant": { color: "text-sky-300",    bg: "rgba(56,189,248,0.2)",  border: "rgba(56,189,248,0.5)" },
    "Oshpaz":    { color: "text-orange-300", bg: "rgba(251,146,60,0.2)",  border: "rgba(251,146,60,0.5)" },
};

export default function KassirLoginPage() {
    const router = useRouter();
    const { deviceSession, setDeviceSession, kassirSession, setKassirSession } = useStore();

    // Device login state
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Staff list state
    const [showStaff, setShowStaff] = useState(false);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinLoading, setPinLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (kassirSession) {
            router.replace("/ubt-pos");
        }
    }, [kassirSession, router]);

    // Load staff list
    const loadStaff = async () => {
        setStaffLoading(true);
        try {
            const res = await fetch("/api/staff");
            const data = await res.json();
            const filtered = (data.staff || []).filter((s: StaffMember) =>
                s.role === "Kassir" || s.role === "Ofitsiant" || s.role === "Oshpaz"
            );
            setStaffList(filtered);
        } catch {
            setStaffList([]);
        } finally {
            setStaffLoading(false);
        }
    };

    // Device login
    const handleDeviceLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/kassir/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Login yoki parol xato"); return; }
            setDeviceSession({ ...data.session.user, token: data.session.token, shopCode: data.shopCode, shopType: data.shopType });
            setUsername(""); setPassword("");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Server bilan ulanishda xato";
            console.error("[kassir-login]", msg);
            setError("Server bilan ulanishda xato!");
        } finally { setLoading(false); }
    };

    // Open staff list
    const openStaffList = async () => {
        setShowStaff(true);
        await loadStaff();
    };

    // Staff PIN submit
    const handlePinSubmit = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedStaff || !pin.trim()) return;
        setPinLoading(true); setPinError("");
        try {
            const res = await fetch("/api/auth/staff-pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ staffId: selectedStaff.id, password: pin }),
            });
            const data = await res.json();
            if (data.success && data.staff) {
                setKassirSession({ ...data.staff, token: deviceSession?.token, shopCode: deviceSession?.shopCode, shopType: deviceSession?.shopType });
                router.push("/ubt-pos");
            } else { setPinError(data.error || "Parol noto'g'ri"); setPin(""); }
        } catch { setPinError("Tarmoq xatosi"); }
        finally { setPinLoading(false); }
    };

    const handlePinKey = (key: string) => {
        if (key === "del") setPin(p => p.slice(0, -1));
        else if (key === "C") setPin("");
        else if (pin.length < 12) setPin(p => p + key);
    };

    // ─── BACKGROUND ───────────────────────────────────────────────────────────
    const BG = (
        <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Real Samarkand aerial photo */}
            <img
                src="/samarkand-bg.png"
                alt="Samarkand"
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{ transform: "scale(1.04)" }}
            />
            {/* Dark overlay for readability */}
            <div className="absolute inset-0" style={{
                background: "linear-gradient(180deg, rgba(5,10,20,0.55) 0%, rgba(10,15,30,0.35) 50%, rgba(5,10,20,0.7) 100%)"
            }} />
            {/* Warm amber glow from bottom */}
            <div className="absolute bottom-0 inset-x-0 h-64 pointer-events-none" style={{
                background: "linear-gradient(to top, rgba(20,10,5,0.6) 0%, transparent 100%)"
            }} />
            {/* Subtle top vignette */}
            <div className="absolute top-0 inset-x-0 h-32 pointer-events-none" style={{
                background: "linear-gradient(to bottom, rgba(0,5,20,0.5) 0%, transparent 100%)"
            }} />
            {/* Golden glow accent */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none" style={{
                background: "radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 70%)",
                filter: "blur(40px)"
            }} />
        </div>
    );

    // ─── DEVICE LOGIN SCREEN ───────────────────────────────────────────────────
    if (!deviceSession) {
        return (
            <div className="h-screen flex items-center justify-center relative overflow-hidden">
                {BG}
                <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="mx-auto mb-2 relative flex justify-center">
                            <img src="/logo-pos.png" alt="ChaqqonPro" className="w-[300px] object-contain drop-shadow-2xl mix-blend-screen" />
                        </div>
                        <p className="text-white/50 text-sm mt-1 font-medium tracking-widest uppercase">Qurilma Avtorizatsiyasi</p>
                    </div>

                    <div className="rounded-3xl overflow-hidden" style={{
                        background: "rgba(255,255,255,0.08)",
                        backdropFilter: "blur(32px) saturate(180%)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        boxShadow: "0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
                    }}>
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        <form onSubmit={handleDeviceLogin} className="p-8 space-y-5">
                            {error && (
                                <div className="px-4 py-3 rounded-2xl text-sm font-semibold text-red-200 flex items-center gap-2"
                                    style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)" }}>
                                    <Lock size={15} /> {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Apparat Logini</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-4 top-3.5 text-white/40" />
                                    <input type="text" required value={username}
                                        onChange={e => { setUsername(e.target.value.toLowerCase()); setError(""); }}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white font-medium placeholder-white/30 focus:outline-none transition-all"
                                        placeholder="username" autoComplete="username"
                                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                                        onFocus={e => { e.target.style.background = "rgba(255,255,255,0.15)"; e.target.style.borderColor = "rgba(245,158,11,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.15)"; }}
                                        onBlur={e => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Parol</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-4 top-3.5 text-white/40" />
                                    <input type="password" required value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white font-medium placeholder-white/30 focus:outline-none transition-all font-mono"
                                        placeholder="••••••••" autoComplete="current-password"
                                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                                        onFocus={e => { e.target.style.background = "rgba(255,255,255,0.15)"; e.target.style.borderColor = "rgba(245,158,11,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.15)"; }}
                                        onBlur={e => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full relative overflow-hidden py-4 rounded-2xl font-bold text-white text-[15px] transition-all active:scale-[0.98] disabled:opacity-50 group"
                                style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.9) 0%, rgba(234,88,12,0.85) 100%)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 8px 32px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.3)" }}
                            >
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none" />
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : "Apparatni Ulash"}
                            </button>
                            <button type="button" onClick={() => router.push("/")}
                                className="w-full py-2 text-sm font-medium text-white/30 hover:text-white/60 transition-colors">
                                Admin panelga qaytish
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // ─── STAFF LIST VIEW ───────────────────────────────────────────────────────
    if (showStaff) {
        const kassirlar = staffList.filter(s => s.role === "Kassir");
        const ofitsiantlar = staffList.filter(s => s.role === "Ofitsiant");
        const boshqalar = staffList.filter(s => s.role !== "Kassir" && s.role !== "Ofitsiant");

        const StaffCard = ({ s }: { s: StaffMember }) => {
            const cfg = ROLE_CFG[s.role] ?? ROLE_CFG["Kassir"];
            return (
                <button onClick={() => { setSelectedStaff(s); setPin(""); setPinError(""); }}
                    className="group flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-200 active:scale-[0.97] hover:scale-[1.04] text-center"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cfg.bg; (e.currentTarget as HTMLElement).style.borderColor = cfg.border; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden"
                        style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
                        <User size={28} className={cfg.color} />
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm">{s.name}</p>
                        <p className={`text-[11px] mt-0.5 ${cfg.color} opacity-80`}>{s.role}</p>
                    </div>
                    <Lock size={12} className="text-white opacity-0 group-hover:opacity-50 transition-opacity" />
                </button>
            );
        };

        const renderGroup = (label: string, list: StaffMember[]) => list.length === 0 ? null : (
            <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3 px-1">{label}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {list.map(s => <StaffCard key={s.id} s={s} />)}
                </div>
            </div>
        );

        return (
            <div className="h-screen flex flex-col overflow-hidden relative">
                {BG}
                {/* Top bar */}
                <div className="relative z-10 flex items-center justify-between px-8 pt-6 pb-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowStaff(false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                            <ChevronLeft size={14} /> Ortga
                        </button>
                        <div className="flex items-center gap-2">
                            <UtensilsCrossed size={18} className="text-amber-400" />
                            <span className="text-white font-bold text-sm">UBT</span>
                            <span className="text-white/30 text-xs">•</span>
                            <span className="text-white/50 text-xs">{deviceSession.branch}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-white/25 text-sm font-mono">
                            {new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <button onClick={() => { setDeviceSession(null); setShowStaff(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(248,113,113,0.9)" }}>
                            <LogOut size={13} /> Chiqish
                        </button>
                    </div>
                </div>

                <div className="relative z-10 px-8 pt-7 pb-4 flex-shrink-0">
                    <h1 className="text-3xl font-black text-white" style={{ letterSpacing: "-0.02em" }}>
                        Xodimni <span className="text-amber-400">tanlang</span>
                    </h1>
                    <p className="text-white/30 text-sm mt-1">O'z ismingizni tanlang va parolingizni kiriting</p>
                </div>

                <div className="relative z-10 flex-1 overflow-y-auto px-8 pb-8">
                    {staffLoading ? (
                        <div className="flex items-center justify-center h-full gap-3">
                            <div className="w-8 h-8 border-3 border-white/10 border-t-amber-400 rounded-full animate-spin" />
                            <span className="text-white/40">Yuklanmoqda...</span>
                        </div>
                    ) : staffList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <User size={28} className="text-white/20" />
                            </div>
                            <p className="text-white/40 font-medium">Xodimlar topilmadi</p>
                            <p className="text-white/20 text-sm">Admin panelda Kassir yoki Ofitsiant qo'shing</p>
                        </div>
                    ) : (
                        <>
                            {renderGroup("💳 Kassirlar", kassirlar)}
                            {renderGroup("🍽️ Ofitsiantlar", ofitsiantlar)}
                            {renderGroup("👨‍🍳 Boshqalar", boshqalar)}
                        </>
                    )}
                </div>

                {/* PIN Modal */}
                {selectedStaff && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(16px)" }}>
                        <div className="w-full max-w-[380px] mx-4 rounded-3xl overflow-hidden relative"
                            style={{ background: "rgba(10,20,35,0.95)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                            <button onClick={() => setSelectedStaff(null)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <X size={16} />
                            </button>
                            <div className="p-8">
                                <div className="text-center mb-6">
                                    {(() => {
                                        const cfg = ROLE_CFG[selectedStaff.role] ?? ROLE_CFG["Kassir"];
                                        return (
                                            <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-4 relative overflow-hidden"
                                                style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
                                                <User size={36} className={cfg.color} />
                                                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
                                            </div>
                                        );
                                    })()}
                                    <h2 className="text-xl font-black text-white">{selectedStaff.name}</h2>
                                    <p className="text-white/40 text-sm">{selectedStaff.role}</p>
                                </div>
                                {pinError && (
                                    <div className="mb-4 px-4 py-2.5 rounded-xl text-center text-sm font-semibold text-red-300"
                                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                        {pinError}
                                    </div>
                                )}
                                <form onSubmit={handlePinSubmit}>
                                    <div className="relative mb-5">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input type="password" value={pin} readOnly
                                            className="w-full py-3.5 pl-11 pr-4 rounded-xl text-xl font-black text-center tracking-[0.5em] text-white focus:outline-none"
                                            placeholder="••••"
                                            style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", caretColor: "transparent" }} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {[1,2,3,4,5,6,7,8,9].map(n => (
                                            <button key={n} type="button" onClick={() => handlePinKey(n.toString())}
                                                className="h-13 py-3.5 rounded-xl text-xl font-bold text-white transition-all active:scale-95"
                                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"}
                                            >{n}</button>
                                        ))}
                                        <button type="button" onClick={() => handlePinKey("C")}
                                            className="h-13 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "rgba(252,211,77,0.9)" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.22)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.12)"}
                                        >C</button>
                                        <button type="button" onClick={() => handlePinKey("0")}
                                            className="h-13 py-3.5 rounded-xl text-xl font-bold text-white transition-all active:scale-95"
                                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"}
                                        >0</button>
                                        <button type="button" onClick={() => handlePinKey("del")}
                                            className="h-13 py-3.5 rounded-xl flex items-center justify-center transition-all active:scale-95 text-white/40"
                                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 4H8L1 12l7 8h13c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <button type="submit" disabled={pinLoading || pin.length === 0}
                                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 group relative overflow-hidden"
                                        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.9) 0%, rgba(234,88,12,0.85) 100%)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 8px 24px rgba(245,158,11,0.3)" }}>
                                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                                        {pinLoading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>Kirish <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── DEVICE LOGGED IN — WELCOME SCREEN ────────────────────────────────────
    return (
        <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden">
            {BG}
            <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
                {/* Logo */}
                <div className="text-center">
                    <img src="/logo-pos.png" alt="ChaqqonPro" className="w-[500px] max-w-[90vw] mx-auto drop-shadow-2xl mix-blend-screen" />
                    <p className="text-white/60 font-medium mt-2 text-lg tracking-widest uppercase">{deviceSession.branch}</p>
                    <p className="text-white/25 text-sm mt-1">{new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" })}</p>
                </div>

                {/* Main button - liquid glass */}
                <button onClick={openStaffList}
                    className="group relative overflow-hidden px-16 py-5 rounded-full font-black text-xl text-white transition-all duration-300 active:scale-[0.96] hover:scale-[1.04]"
                    style={{
                        background: "linear-gradient(135deg, rgba(245,158,11,0.85) 0%, rgba(234,88,12,0.8) 100%)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255,255,255,0.35)",
                        boxShadow: "0 12px 48px rgba(245,158,11,0.4), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
                        letterSpacing: "0.08em"
                    }}
                >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    <span className="relative z-10 flex items-center gap-3">
                        TIZIMGA KIRISH
                        <ArrowRight size={22} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                    </span>
                </button>

                {/* Logout small button */}
                <button onClick={() => setDeviceSession(null)}
                    className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm font-medium mt-2">
                    <LogOut size={15} /> Apparatdan chiqish
                </button>
            </div>

            {/* Time display */}
            <div className="absolute bottom-8 right-8 text-white/20 font-mono text-2xl font-bold z-10">
                {new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
            </div>
        </div>
    );
}
