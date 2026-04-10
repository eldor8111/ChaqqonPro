"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, ArrowRight } from "lucide-react";
import { useSuperAdminStore } from "@/lib/superAdminStore";

export default function SuperAdminLoginPage() {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const { login, isAuthenticated } = useSuperAdminStore();

    // Agar allaqachon kirilib bo'lingan bo'lsa, asosiy sahifaga yo'naltir
    useEffect(() => {
        if (isAuthenticated) {
            router.replace("/super-admin");
        } else {
            // Setup qilinmagan bo'lsa tekshiramiz
            fetch("/api/super-admin/setup")
                .then(r => r.json())
                .then(data => {
                    if (data.setupRequired) {
                        router.replace("/super-admin/setup");
                    }
                })
                .catch(() => {});
        }
    }, [isAuthenticated, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password) {
            setError("Parolni kiriting");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/super-admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Parol noto'g'ri. Iltimos qayta urinib ko'ring.");
                return;
            }

            const data = await res.json();
            // Client state ni ham yangilaymiz
            const success = login(data.user);
            if (success) {
                router.push("/super-admin");
            } else {
                // Agar store loginida nimadir noto'g'ri bo'lsa
                setError("Parol noto'g'ri. Iltimos qayta urinib ko'ring.");
            }
        } catch {
            setError("Tizimga ulanishda xatolik");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
            {/* Background elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] mix-blend-screen opacity-50 animate-pulse-slow font-medium" style={{ animationDelay: "1s" }}></div>
            </div>

            <div className="w-full max-w-md p-6 relative z-10 animate-fade-in">
                {/* Logo Section */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-3">
                        <span className="font-black text-5xl tracking-tight text-white drop-shadow-md">
                            Chaqqon<span className="text-blue-500">Pro</span>
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-300 tracking-tight">Super Admin Portal</h1>
                </div>

                {/* Login Form */}
                <div className="glass-card p-8 rounded-3xl shadow-card relative overflow-hidden backdrop-blur-xl border border-white/10 bg-surface-card/80">
                    {/* Top highlight line - Purple */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500"></div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-danger/10 border border-danger/30 text-danger-400 p-3 rounded-xl text-sm flex items-start gap-2 animate-slide-in-left">
                                <span className="text-danger mt-0.5 font-bold">!</span>
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block group-focus-within:text-sky-400 transition-colors">
                                    Asosiy Parol (Master Password)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-surface-elevated/50 border border-surface-border rounded-xl pl-11 pr-4 py-3.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all duration-300 hover:border-surface-border/80"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold py-3.5 rounded-xl hover:shadow-glow hover:opacity-95 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-6 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {/* Hover shine effect */}
                            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shimmer" />

                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Kirilmoqda...</span>
                                </div>
                            ) : (
                                <>
                                    <span>Tizimga kirish</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-8 space-y-4 flex flex-col items-center">
                    <a
                        href="/super-admin/staff-login"
                        className="px-6 py-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 font-semibold transition-all flex items-center gap-2"
                    >
                        Xodim (Agent/Menejer) sifatida kirish <ArrowRight size={16} />
                    </a>
                    <p className="text-sm text-slate-500 pt-2">
                        &copy; {new Date().getFullYear()} ChaqqonPro Super Admin.
                    </p>
                </div>
            </div>
        </div>
    );
}
