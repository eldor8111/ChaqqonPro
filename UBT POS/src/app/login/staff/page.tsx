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

    useEffect(() => { setMounted(true); }, []);

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
                else router.push("/ubt-pos");
            }
        } catch {
            setError("Tizimga ulanishda xatolik yuz berdi");
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-5">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                    <Smartphone size={28} className="text-blue-400" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Chaqqon Pro</h1>
                <p className="text-sm text-blue-300/80 font-medium mt-1">Xodim kirish portali</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-lg font-black text-white mb-1">Xush kelibsiz! 👋</h2>
                <p className="text-xs text-blue-200/70 mb-6">O'z login va parolingizni kiriting</p>

                {error && (
                    <div className="mb-4 flex items-start gap-2.5 bg-red-500/15 border border-red-400/30 rounded-xl px-3.5 py-3">
                        <div className="w-4 h-4 rounded-full bg-red-400/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-red-300 text-[10px] font-black">!</span>
                        </div>
                        <p className="text-red-300 text-xs font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Username */}
                    <div>
                        <label className="block text-[11px] font-bold text-blue-200/80 uppercase tracking-widest mb-1.5">
                            Login yoki Ism
                        </label>
                        <div className="relative">
                            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/60" />
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="@login yoki ism"
                                autoComplete="username"
                                className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/30 text-sm font-medium outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-[11px] font-bold text-blue-200/80 uppercase tracking-widest mb-1.5">
                            Parol
                        </label>
                        <div className="relative">
                            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/60" />
                            <input
                                type={showPass ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                className="w-full pl-9 pr-10 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/30 text-sm font-medium outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-blue-300 transition-colors"
                            >
                                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Shop Code (only when required) */}
                    {requireShopCode && (
                        <div>
                            <label className="block text-[11px] font-bold text-yellow-300/80 uppercase tracking-widest mb-1.5">
                                Filial Kodi (Shop Code)
                            </label>
                            <input
                                type="text"
                                value={shopCode}
                                onChange={e => setShopCode(e.target.value.toUpperCase())}
                                placeholder="Misol: REST01"
                                className="w-full px-4 py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-white placeholder-yellow-200/30 text-sm font-bold tracking-widest outline-none focus:border-yellow-400/60 transition-all"
                            />
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30"
                    >
                        {isLoading ? (
                            <><Loader2 size={16} className="animate-spin" /> Tekshirilmoqda...</>
                        ) : (
                            "Kirish →"
                        )}
                    </button>
                </form>

                <p className="text-center text-[11px] text-white/30 mt-5">
                    Muammo bo'lsa administrator bilan bog'laning
                </p>
            </div>
        </div>
    );
}
