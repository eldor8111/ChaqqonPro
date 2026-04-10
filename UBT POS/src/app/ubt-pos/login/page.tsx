"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, EyeOff, Eye, ArrowRight, UtensilsCrossed, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";

export default function UbtPosLoginPage() {
    const router = useRouter();
    const [kassirUsername, setKassirUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!kassirUsername.trim() || !password.trim()) {
            setError("Iltimos, login va parolni kiriting");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/kassir/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: kassirUsername.trim(), password: password.trim(), shopType: "ubt" }),
            });
            const data = await res.json();

            if (data.success && data.session?.user) {
                useStore.setState({
                    deviceSession: {
                        id: data.session.user.id,
                        name: data.session.user.name,
                        branch: data.session.user.branch,
                        permissions: data.session.user.permissions || [],
                        shopCode: data.shopCode,
                        shopType: data.shopType || "ubt",
                        token: data.session.token,
                    },
                });
                router.push("/ubt-pos/start");
            } else {
                setError(data.error || "Login yoki parol noto'g'ri");
            }
        } catch {
            setError("Tizimga ulanishda xatolik yuz berdi");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden items-center justify-center relative">
            {/* ── YORQIN FON ── */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    background: `
                        radial-gradient(ellipse at 20% 20%, rgba(251, 146, 60, 0.85) 0%, transparent 55%),
                        radial-gradient(ellipse at 80% 10%, rgba(239, 68, 68, 0.75) 0%, transparent 50%),
                        radial-gradient(ellipse at 60% 80%, rgba(245, 158, 11, 0.8) 0%, transparent 55%),
                        radial-gradient(ellipse at 10% 80%, rgba(234, 88, 12, 0.7) 0%, transparent 50%),
                        linear-gradient(135deg, #7c2d12 0%, #92400e 25%, #b45309 50%, #c2410c 75%, #991b1b 100%)
                    `,
                }}
            />

            {/* Yorqin nurli effektlar */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {/* Katta yaltiroq doira — yuqori o'ng */}
                <div
                    className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(245,158,11,0.3) 40%, transparent 70%)",
                        filter: "blur(40px)",
                    }}
                />
                {/* Katta yaltiroq doira — pastki chap */}
                <div
                    className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(239,68,68,0.4) 0%, rgba(220,38,38,0.25) 40%, transparent 70%)",
                        filter: "blur(40px)",
                    }}
                />
                {/* Markaziy yorug'lik */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full"
                    style={{
                        background: "radial-gradient(ellipse, rgba(251,146,60,0.2) 0%, transparent 70%)",
                        filter: "blur(60px)",
                    }}
                />
                {/* Shimmer to'lqinlar */}
                <div className="absolute inset-0"
                    style={{
                        background: `
                            repeating-linear-gradient(
                                45deg,
                                transparent,
                                transparent 60px,
                                rgba(255,255,255,0.03) 60px,
                                rgba(255,255,255,0.03) 61px
                            )
                        `
                    }}
                />
            </div>

            {/* ── LIQUID GLASS CARD ── */}
            <div
                className="relative z-10 w-full max-w-md mx-4 overflow-hidden animate-slide-up"
                style={{
                    background: "rgba(255,255,255,0.13)",
                    backdropFilter: "blur(32px) saturate(200%)",
                    WebkitBackdropFilter: "blur(32px) saturate(200%)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "28px",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)",
                }}
            >
                {/* Card inner highlight line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                {/* ── HEADER ── */}
                <div className="px-8 pt-10 pb-7 text-center relative">
                    {/* Logo instead of Icon */}
                    <div className="mx-auto mb-4 flex justify-center w-full relative drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        <img src="/logo-pos.png" alt="Logo" className="w-[400px] object-contain mix-blend-screen" />
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Sparkles size={14} className="text-amber-300 opacity-80" />
                        <h1 className="text-2xl font-black text-white drop-shadow-md" style={{ letterSpacing: "-0.02em" }}>
                            POS Terminal
                        </h1>
                        <Sparkles size={14} className="text-amber-300 opacity-80" />
                    </div>
                    <p className="text-white/70 text-sm font-medium">
                        Qurilma avtorizatsiyasi
                    </p>
                </div>

                {/* ── FORM ── */}
                <div className="px-8 pb-10">
                    {/* Error */}
                    {error && (
                        <div
                            className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl"
                            style={{
                                background: "rgba(239,68,68,0.2)",
                                border: "1px solid rgba(239,68,68,0.4)",
                                backdropFilter: "blur(8px)",
                            }}
                        >
                            <div className="w-5 h-5 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0 border border-red-400/40">
                                <span className="text-red-300 text-xs font-bold">!</span>
                            </div>
                            <p className="text-red-200 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
                                Apparat Logini
                            </label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-3.5 text-white/50" />
                                <input
                                    id="kassir-username"
                                    type="text"
                                    value={kassirUsername}
                                    onChange={(e) => { setKassirUsername(e.target.value); setError(""); }}
                                    autoComplete="username"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl text-[15px] font-medium text-white placeholder-white/40 focus:outline-none transition-all"
                                    placeholder="Masalan: pos_apparat_1"
                                    style={{
                                        background: "rgba(255,255,255,0.1)",
                                        border: "1px solid rgba(255,255,255,0.25)",
                                        backdropFilter: "blur(8px)",
                                        boxShadow: "inset 0 1px 4px rgba(0,0,0,0.1)",
                                    }}
                                    onFocus={e => {
                                        e.target.style.background = "rgba(255,255,255,0.18)";
                                        e.target.style.borderColor = "rgba(255,255,255,0.5)";
                                        e.target.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.15), inset 0 1px 4px rgba(0,0,0,0.05)";
                                    }}
                                    onBlur={e => {
                                        e.target.style.background = "rgba(255,255,255,0.1)";
                                        e.target.style.borderColor = "rgba(255,255,255,0.25)";
                                        e.target.style.boxShadow = "inset 0 1px 4px rgba(0,0,0,0.1)";
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
                                Parol
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="w-full px-4 py-3 pr-12 rounded-xl text-[15px] font-medium text-white placeholder-white/40 focus:outline-none transition-all font-mono"
                                    placeholder="••••••••"
                                    style={{
                                        background: "rgba(255,255,255,0.1)",
                                        border: "1px solid rgba(255,255,255,0.25)",
                                        backdropFilter: "blur(8px)",
                                        boxShadow: "inset 0 1px 4px rgba(0,0,0,0.1)",
                                    }}
                                    onFocus={e => {
                                        e.target.style.background = "rgba(255,255,255,0.18)";
                                        e.target.style.borderColor = "rgba(255,255,255,0.5)";
                                        e.target.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.15), inset 0 1px 4px rgba(0,0,0,0.05)";
                                    }}
                                    onBlur={e => {
                                        e.target.style.background = "rgba(255,255,255,0.1)";
                                        e.target.style.borderColor = "rgba(255,255,255,0.25)";
                                        e.target.style.boxShadow = "inset 0 1px 4px rgba(0,0,0,0.1)";
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/80 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit button — Liquid Glass */}
                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full relative overflow-hidden rounded-xl py-3.5 text-[15px] font-bold text-white active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                                style={{
                                    background: "linear-gradient(135deg, rgba(251,146,60,0.9) 0%, rgba(239,68,68,0.85) 100%)",
                                    border: "1px solid rgba(255,255,255,0.35)",
                                    boxShadow: "0 8px 32px rgba(239,68,68,0.4), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4)",
                                    backdropFilter: "blur(8px)",
                                }}
                            >
                                {/* Shimmer efekti */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none" />
                                {/* Top highlight */}
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        <span>Ulanmoqda...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 relative z-10">
                                        <UtensilsCrossed size={18} />
                                        <span>Terminalga kirish</span>
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
                                    </div>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-7 text-center">
                        <p className="text-white/30 text-xs font-medium">
                            ChaqqonPro • UBT Systems
                        </p>
                    </div>
                </div>

                {/* Bottom reflection line */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
        </div>
    );
}
