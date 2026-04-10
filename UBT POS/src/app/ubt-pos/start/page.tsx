"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, X, LogOut, ChefHat, CreditCard, UtensilsCrossed, Truck, Package, Headset } from "lucide-react";
import { useStore } from "@/lib/store";

interface StaffMember {
    id: string;
    name: string;
    role: string;
    branch: string;
}

const ROLE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
    "Kassir":     { icon: CreditCard,      color: "text-amber-300",  bgColor: "rgba(245,158,11,0.2)",  borderColor: "rgba(245,158,11,0.4)" },
    "Ofitsiant":  { icon: UtensilsCrossed, color: "text-blue-300",   bgColor: "rgba(59,130,246,0.2)",  borderColor: "rgba(59,130,246,0.4)" },
    "Oshpaz":     { icon: ChefHat,         color: "text-orange-300", bgColor: "rgba(234,88,12,0.2)",   borderColor: "rgba(234,88,12,0.4)" },
    "Kuryer":     { icon: Truck,           color: "text-green-300",  bgColor: "rgba(34,197,94,0.2)",   borderColor: "rgba(34,197,94,0.4)" },
    "Omborchi":   { icon: Package,         color: "text-purple-300", bgColor: "rgba(168,85,247,0.2)",  borderColor: "rgba(168,85,247,0.4)" },
};

export default function UbtPosStartPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const { deviceSession, setKassirSession } = useStore();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    // PIN modal state
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [pinCode, setPinCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [pinError, setPinError] = useState("");

    useEffect(() => {
        setMounted(true);
        if (!deviceSession || deviceSession.shopType !== "ubt") {
            router.replace("/ubt-pos/login");
            return;
        }

        const fetchStaff = async () => {
            try {
                const res = await fetch("/api/staff");
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                const filtered = (data.staff || []).filter((s: StaffMember) =>
                    s.role === "Kassir" || s.role === "Ofitsiant" || s.role === "Oshpaz"
                );
                setStaffList(filtered);
            } catch {
                setFetchError("Xodimlarni yuklashda xatolik");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStaff();
    }, [deviceSession, router]);

    const handleStaffClick = (staff: StaffMember) => {
        setSelectedStaff(staff);
        setPinCode("");
        setPinError("");
    };

    const handlePinKey = (key: string) => {
        if (key === "backspace") setPinCode(p => p.slice(0, -1));
        else if (key === "clear") setPinCode("");
        else if (pinCode.length < 12) setPinCode(p => p + key);
    };

    const handlePinSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedStaff || !pinCode.trim()) return;

        setIsVerifying(true);
        setPinError("");

        try {
            const res = await fetch("/api/auth/staff-pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ staffId: selectedStaff.id, password: pinCode }),
            });
            const data = await res.json();

            if (data.success && data.staff) {
                setKassirSession({
                    ...data.staff,
                    token: deviceSession?.token,
                    shopCode: deviceSession?.shopCode,
                    shopType: deviceSession?.shopType,
                    printerIp: data.staff.printerIp || "",
                });
                router.push("/ubt-pos");
            } else {
                setPinError(data.error || "Parol noto'g'ri");
                setPinCode("");
            }
        } catch {
            setPinError("Tarmoq xatosi yuz berdi");
        } finally {
            setIsVerifying(false);
        }
    };

    if (!mounted || !deviceSession) {
        return (
            <div className="h-screen w-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
                <div className="w-10 h-10 border-4 border-amber-900/40 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Group staff by role
    const kassirlar = staffList.filter(s => s.role === "Kassir");
    const ofitsiantlar = staffList.filter(s => s.role === "Ofitsiant");
    const boshqalar = staffList.filter(s => s.role !== "Kassir" && s.role !== "Ofitsiant");

    const renderGroup = (label: string, list: StaffMember[]) => {
        if (list.length === 0) return null;
        return (
            <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-widest mb-4 px-1 opacity-50 text-white">{label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {list.map(staff => {
                        const cfg = ROLE_CONFIG[staff.role] ?? ROLE_CONFIG["Kassir"];
                        const Icon = cfg.icon;
                        return (
                            <button
                                key={staff.id}
                                onClick={() => handleStaffClick(staff)}
                                className="group flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-200 active:scale-[0.97] hover:scale-[1.03]"
                                style={{
                                    background: "rgba(255,255,255,0.07)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    backdropFilter: "blur(8px)",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = cfg.bgColor;
                                    (e.currentTarget as HTMLElement).style.borderColor = cfg.borderColor;
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                                }}
                            >
                                {/* Avatar */}
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden"
                                    style={{ background: cfg.bgColor, border: `1.5px solid ${cfg.borderColor}` }}
                                >
                                    <Icon size={28} className={cfg.color} />
                                    {/* top shine */}
                                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
                                </div>
                                {/* Name */}
                                <div className="text-center">
                                    <p className="font-bold text-white text-sm leading-tight">{staff.name}</p>
                                    <p className="text-[11px] mt-0.5 opacity-50 text-white">{staff.role}</p>
                                </div>
                                {/* Lock icon hint */}
                                <div className="opacity-0 group-hover:opacity-60 transition-opacity">
                                    <Lock size={13} className="text-white" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden relative" style={{
            background: "linear-gradient(160deg, #0f172a 0%, #1a2744 50%, #1e293b 100%)"
        }}>
            {/* Ambient lights */}
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
            <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)", filter: "blur(40px)" }} />

            {/* ── TOP BAR ── */}
            <div className="flex items-center justify-between px-8 pt-6 pb-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                        <UtensilsCrossed size={18} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">ChaqqonPro</p>
                        <p className="text-white/40 text-[11px] font-medium">{deviceSession.name} — {deviceSession.branch}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Clock */}
                    <div className="text-white/30 text-sm font-mono font-medium">
                        {new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {/* Tex Yordam */}
                    <button
                        onClick={() => router.push("/ubt-pos/support")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                        style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", color: "rgba(125,211,252,0.9)" }}
                        title="Texnik yordam"
                    >
                        <Headset size={13} />
                        Tex Yordam
                    </button>
                    {/* Logout device */}
                    <button
                        onClick={() => { useStore.setState({ deviceSession: null }); router.push("/ubt-pos/login"); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(248,113,113,0.9)" }}
                        title="Qurilmadan chiqish"
                    >
                        <LogOut size={13} />
                        Chiqish
                    </button>
                </div>
            </div>

            {/* ── HEADER ── */}
            <div className="px-8 pt-8 pb-6 flex-shrink-0">
                <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: "-0.02em" }}>
                    Xodimni <span className="text-amber-400">tanlang</span>
                </h1>
                <p className="text-white/40 text-sm font-medium">O'z nomingizni tanlang va parolingizni kiriting</p>
            </div>

            {/* ── STAFF LIST ── */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full gap-3">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-amber-500 rounded-full animate-spin" />
                        <p className="text-white/40 font-medium">Yuklanmoqda...</p>
                    </div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <p className="text-red-400 font-bold text-lg">{fetchError}</p>
                        <button onClick={() => window.location.reload()}
                            className="btn-ghost px-6 py-2 text-sm">
                            Qayta urinish
                        </button>
                    </div>
                ) : staffList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <User size={36} className="text-white/20" />
                        </div>
                        <div>
                            <p className="text-white/50 font-bold text-lg">Xodimlar topilmadi</p>
                            <p className="text-white/25 text-sm mt-1">Admin panelda Kassir yoki Ofitsiant qo'shing</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {renderGroup("💳 Kassirlar", kassirlar)}
                        {renderGroup("🍽️ Ofitsiantlar", ofitsiantlar)}
                        {renderGroup("👥 Boshqa xodimlar", boshqalar)}
                    </>
                )}
            </div>

            {/* ── PIN MODAL ── */}
            {selectedStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}>
                    <div
                        className="w-full max-w-[400px] rounded-3xl overflow-hidden relative"
                        style={{
                            background: "rgba(15,23,42,0.95)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
                        }}
                    >
                        {/* Top shine */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                        {/* Close button */}
                        <button onClick={() => setSelectedStaff(null)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <X size={16} className="text-white/60" />
                        </button>

                        <div className="p-8">
                            {/* Staff info */}
                            <div className="text-center mb-7">
                                {(() => {
                                    const cfg = ROLE_CONFIG[selectedStaff.role] ?? ROLE_CONFIG["Kassir"];
                                    const Icon = cfg.icon;
                                    return (
                                        <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-4 relative overflow-hidden"
                                            style={{ background: cfg.bgColor, border: `1.5px solid ${cfg.borderColor}` }}>
                                            <Icon size={36} className={cfg.color} />
                                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
                                        </div>
                                    );
                                })()}
                                <h2 className="text-2xl font-black text-white">{selectedStaff.name}</h2>
                                <p className="text-white/40 text-sm mt-0.5">{selectedStaff.role}</p>
                            </div>

                            {/* Error */}
                            {pinError && (
                                <div className="mb-5 px-4 py-3 rounded-xl text-center text-sm font-semibold text-red-300"
                                    style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                    {pinError}
                                </div>
                            )}

                            <form onSubmit={handlePinSubmit}>
                                {/* PIN display */}
                                <div className="relative mb-6">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="password"
                                        value={pinCode}
                                        readOnly
                                        className="w-full py-4 pl-12 pr-4 rounded-2xl text-2xl font-black text-center tracking-[0.6em] focus:outline-none text-white"
                                        placeholder="••••"
                                        style={{
                                            background: "rgba(255,255,255,0.06)",
                                            border: "1.5px solid rgba(255,255,255,0.12)",
                                            caretColor: "transparent",
                                        }}
                                    />
                                </div>

                                {/* Numpad */}
                                <div className="grid grid-cols-3 gap-2.5 mb-5">
                                    {[1,2,3,4,5,6,7,8,9].map(num => (
                                        <button key={num} type="button"
                                            onClick={() => handlePinKey(num.toString())}
                                            className="h-14 rounded-2xl text-xl font-bold text-white transition-all active:scale-95"
                                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button type="button" onClick={() => handlePinKey("clear")}
                                        className="h-14 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "rgba(252,211,77,0.9)" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.22)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.12)"}
                                    >
                                        C
                                    </button>
                                    <button type="button" onClick={() => handlePinKey("0")}
                                        className="h-14 rounded-2xl text-xl font-bold text-white transition-all active:scale-95"
                                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"}
                                    >
                                        0
                                    </button>
                                    <button type="button" onClick={() => handlePinKey("backspace")}
                                        className="h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                                    >
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 4H8L1 12l7 8h13c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                                        </svg>
                                    </button>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isVerifying || pinCode.length === 0}
                                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(245,158,11,0.9) 0%, rgba(234,88,12,0.85) 100%)",
                                        border: "1px solid rgba(255,255,255,0.2)",
                                        boxShadow: "0 8px 24px rgba(245,158,11,0.3)",
                                    }}
                                >
                                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none" />
                                    {isVerifying ? (
                                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Terminalga kirish</span>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
