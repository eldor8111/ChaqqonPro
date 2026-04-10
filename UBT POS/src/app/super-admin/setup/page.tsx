"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert, ArrowRight, ShieldCheck } from "lucide-react";
import { useSuperAdminStore } from "@/lib/superAdminStore";

export default function SuperAdminSetupPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
    const router = useRouter();
    const { login } = useSuperAdminStore();

    useEffect(() => {
        // Tekshiramiz: super admin ochilmaganmi?
        fetch("/api/super-admin/setup")
            .then(res => res.json())
            .then(data => {
                if (!data.setupRequired) {
                    // Agar allaqachon super admin mavjud bo'lsa, loginga jo'natamiz
                    router.replace("/super-admin/login");
                } else {
                    setSetupRequired(true);
                }
            })
            .catch(() => {
                setSetupRequired(true); // Xatolik bo'lsa ham formni ko'rsatamiz
            });
    }, [router]);

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password || !confirmPassword) {
            setError("Barcha maydonlarni to'ldiring");
            return;
        }

        if (password.length < 6) {
            setError("Parol kamida 6 ta belgi bo'lishi kerak");
            return;
        }

        if (password !== confirmPassword) {
            setError("Parollar bir xil emas");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/super-admin/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirmPassword }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Xatolik yuz berdi");
                return;
            }

            const data = await res.json();
            
            // Muvaffaqiyatli xabar va avtomatik login
            login(data.user);
            router.push("/super-admin");
            
        } catch {
            setError("Tizimga ulanishda xatolik");
        } finally {
            setIsLoading(false);
        }
    };

    if (setupRequired === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
            {/* O'zgacha orqa fon */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/20 rounded-full blur-[100px] mix-blend-screen opacity-50 animate-pulse-slow font-medium" style={{ animationDelay: "1s" }}></div>
            </div>

            <div className="w-full max-w-md p-6 relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-glow mx-auto mb-4 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <ShieldAlert size={32} className="text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mt-2 tracking-tight">Ilk O'rnatish</h1>
                    <p className="text-emerald-400 mt-2 text-sm font-medium">Asosiy Super Admin parolini belgilang</p>
                </div>

                <div className="glass-card p-8 rounded-3xl shadow-card relative overflow-hidden backdrop-blur-xl border border-white/10 bg-slate-900/60">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

                    <div className="mb-6 p-4 rounded-xl bg-slate-800 border border-emerald-500/20 text-sm text-slate-300">
                        Bu sahifa faqat bir marta ko'rsatiladi. Iltimos, xavfsiz va eslab qolishingiz oson bo'lgan master parolni o'rnating. Uchrashib qolish yoki qayta kiritish uchun administrator huquqi talab etiladi.
                    </div>

                    <form onSubmit={handleCreateAdmin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm flex items-start gap-2 animate-slide-in-left">
                                <span className="mt-0.5 font-bold">!</span>
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block group-focus-within:text-emerald-400 transition-colors">
                                    Yangi Master Parol
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <ShieldCheck size={18} className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-300"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            
                            <div className="relative group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block group-focus-within:text-emerald-400 transition-colors">
                                    Parolni Tasdiqlang
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-300"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:opacity-95 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-2 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Yaratilmoqda...</span>
                                </div>
                            ) : (
                                <>
                                    <span>Admin O'rnatish var Kirish</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
