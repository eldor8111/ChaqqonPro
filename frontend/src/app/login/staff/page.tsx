"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { User, Lock, Eye, EyeOff, Loader2, Smartphone } from "lucide-react";

export default function StaffLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [shopCode, setShopCode] = useState("");
    const [requireShopCode, setRequireShopCode] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Wait for Zustand store to load from localStorage
        let attempts = 0;
        const MAX = 40;
        const id = setInterval(() => {
            attempts++;
            const isHydrated = (useStore as any).persist?.hasHydrated?.() ?? true;
            if (isHydrated || attempts >= MAX) {
                clearInterval(id);
                setHydrated(true);

                // Auto-redirect if session is active
                const session = useStore.getState().kassirSession as any;
                if (session && session.token) {
                    if (session.role === "Manablog" || session.role === "Apparat") {
                        router.replace("/kassa/login");
                    } else if (session.role === "Ofitsiant") {
                        router.replace("/mobile/waiter");
                    } else if (session.role === "Kuryer") {
                        router.replace("/mobile/courier");
                    } else if (session.role === "Zavsklad" || session.role === "Omborchi") {
                        router.replace("/mobile/inventory");
                    } else {
                        router.replace("/smart-pos");
                    }
                }
            }
        }, 50);
        return () => clearInterval(id);
    }, [router]);

    const activeSession = hydrated ? useStore.getState().kassirSession : null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!username.trim() || !password) {
            setError("Login va parolni kiriting");
            return;
        }

        setIsLoading(true);
        try {
            const body: Record<string, string> = { username: username.trim(), password };
            if (requireShopCode && shopCode.trim()) body.shopCode = shopCode.trim();

            const res = await fetch("/api/kassir/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.requireShopCode) {
                    setRequireShopCode(true);
                    setError("Bir nechta filialda ro'yxatdan o'tgansiz. Shop Code kiriting.");
                } else {
                    setError(data.error || "Login yoki parol xato");
                }
                return;
            }

            const staffData = {
                ...data.session.user,
                token: data.session.token,
                shopCode: data.shopCode,
                shopType: data.shopType,
            };

            useStore.getState().setDeviceSession(staffData);

            if (staffData.role === "Manablog" || staffData.role === "Apparat") {
                router.push("/kassa/login");
            } else {
                useStore.getState().setKassirSession(staffData);
                if (staffData.role === "Ofitsiant") router.push("/mobile/waiter");
                else if (staffData.role === "Kuryer") router.push("/mobile/courier");
                else if (staffData.role === "Zavsklad" || staffData.role === "Omborchi") router.push("/mobile/inventory");
                else router.push("/smart-pos");
            }
        } catch {
            setError("Tizimga ulanishda xatolik yuz berdi");
        } finally {
            setIsLoading(false);
        }
    };

    // Enforce +998 prefix helper
    const handleUsernameChange = (val: string) => {
        if (!val.startsWith("+")) {
            // If they type just numbers, add + prefix
            if (/^\d/.test(val)) {
                if (val.startsWith("998")) {
                    setUsername("+" + val);
                } else {
                    setUsername("+998" + val);
                }
            } else {
                setUsername(val);
            }
        } else {
            setUsername(val);
        }
    };

    if (!mounted || !hydrated || (activeSession && activeSession.token)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <div className="w-10 h-10 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Yuklanmoqda...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start sm:justify-center px-4 py-6 overflow-y-auto relative">
            {/* Background Blob Decorators */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full bg-blue-300/30 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] rounded-full bg-indigo-300/30 blur-[80px] pointer-events-none" />

            <div className="w-full max-w-sm flex flex-col z-10">
                {/* Logo & Header - Compact on small heights */}
                <div className="text-center mb-6 mt-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-blue-500/20">
                        <Smartphone size={24} className="text-white" />
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">EVIKO POS</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Xodim kirish portali</p>
                </div>

                {/* Glassmorphism Card */}
                <div className="bg-white/70 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
                    <h2 className="text-lg font-black text-slate-800 mb-0.5">Xush kelibsiz! 👋</h2>
                    <p className="text-xs text-slate-500 mb-5">O'z login va parolingizni kiriting</p>

                    {error && (
                        <div className="mb-4 flex items-start gap-2.5 bg-rose-500/10 border border-rose-200 rounded-xl px-3.5 py-3">
                            <div className="w-4 h-4 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-rose-600 text-[10px] font-black">!</span>
                            </div>
                            <p className="text-rose-600 text-xs font-semibold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Username / Phone */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Telefon yoki Login
                            </label>
                            <div className="relative">
                                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => handleUsernameChange(e.target.value)}
                                    onFocus={() => { if (!username || username === "+998") setUsername("+998"); }}
                                    placeholder="+998901234567"
                                    autoComplete="username"
                                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/80 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Parol
                            </label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full pl-9 pr-10 py-3 rounded-xl bg-white/80 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Shop Code (only when required) */}
                        {requireShopCode && (
                            <div>
                                <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">
                                    Filial Kodi (Shop Code)
                                </label>
                                <input
                                    type="text"
                                    value={shopCode}
                                    onChange={e => setShopCode(e.target.value.toUpperCase())}
                                    placeholder="Misol: REST01"
                                    className="w-full px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-800 placeholder-amber-500/40 text-sm font-black tracking-widest outline-none focus:border-amber-500 transition-all"
                                />
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/10"
                        >
                            {isLoading ? (
                                <><Loader2 size={16} className="animate-spin" /> Tekshirilmoqda...</>
                            ) : (
                                "Kirish"
                            )}
                        </button>
                    </form>

                    <p className="text-center text-[10px] text-slate-400 mt-5 font-medium">
                        Muammo bo'lsa administrator bilan bog'laning
                    </p>
                </div>
            </div>
        </div>
    );
}

