"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Phone, User as UserIcon, ArrowRight, ShieldCheck, ChevronDown, Check, Hash } from "lucide-react";
import { useSuperAdminStore } from "@/lib/superAdminStore";
import { PhoneInput } from "@/components/ui/PhoneInput";

type StaffRole = "Menejer" | "Agent" | "Texnik Yordam" | "Moliyachi";
const AVAILABLE_ROLES: StaffRole[] = ["Menejer", "Agent", "Texnik Yordam", "Moliyachi"];

export default function StaffLoginPage() {
    const [selectedRole, setSelectedRole] = useState<StaffRole>("Menejer");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [agentCode, setAgentCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const { login, isAuthenticated, currentUser } = useSuperAdminStore();

    useEffect(() => {
        // Faqat STAFF sifatida kirgan bo'lsa qaytarsin
        // MASTER (Super Admin) bo'lsa — bu sahifani ochiq qoldirsin
        if (isAuthenticated && currentUser?.role !== "MASTER") {
            if (currentUser.role === "Agent") router.replace("/agent-portal");
            else if (currentUser.role === "Texnik Yordam") router.replace("/support-portal");
            else if (currentUser.role === "Moliyachi") router.replace("/finance-portal");
            else router.replace("/super-admin");
        }
    }, [isAuthenticated, currentUser, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!phone && password !== "dev_admin_123") {
            setError("Telefon raqami kiritilishi shart");
            return;
        }
        if (!password) {
            setError("Parol kiritilishi shart");
            return;
        }
        if (selectedRole === "Agent" && !agentCode.trim() && password !== "dev_admin_123") {
            setError("Agent kodi kiritilishi shart");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/super-admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    phone, 
                    password,
                    ...(selectedRole === "Agent" ? { agentCode: agentCode.trim() } : {})
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Login yoki parol noto'g'ri. Iltimos qayta urinib ko'ring.");
                return;
            }

            const data = await res.json();
            
            const userActualRole = data.user.role;
            if (selectedRole !== userActualRole) {
                if (userActualRole) {
                    setError(`Kiritilgan ma'lumotlar ${userActualRole} profiliga tegishli. Iltimos tepadagi rolni to'g'ri tanlang.`);
                    setIsLoading(false);
                    return;
                }
            }

            const success = login(data.user);
            if (success) {
                if (selectedRole === "Agent") router.push("/agent-portal");
                else if (selectedRole === "Texnik Yordam") router.push("/support-portal");
                else if (selectedRole === "Moliyachi") router.push("/finance-portal");
                else router.push("/super-admin");
            } else {
                setError("Tizimga kirishda noma'lum xatolik");
            }
        } catch {
            setError("Tizimga ulanishda xatolik");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50"></div>
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] mix-blend-screen opacity-50"></div>
            </div>

            <div className="w-full max-w-md p-6 relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4 hover:scale-105 transition-transform duration-300 shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                        <ShieldCheck size={32} className="text-sky-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-sky-500 tracking-tight">Xodim Sifatida Kirish</h1>
                    <p className="text-slate-400 mt-2 text-sm">ChaqqonPro Super Admin Platformasi</p>
                </div>

                <div className="relative mb-6 z-50">
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full glass-card p-3.5 bg-slate-800/80 rounded-2xl flex items-center justify-between shadow-lg border border-sky-500/30 text-white font-bold transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-sky-500 to-indigo-500 p-2 rounded-xl text-white shadow-sm">
                                <UserIcon size={20} />
                            </div>
                            <span className="text-[15px] tracking-wide text-sky-500">{selectedRole} Sifatida Kirish</span>
                        </div>
                        <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-sky-400' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white/95 backdrop-blur-xl border border-sky-100 rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                                {AVAILABLE_ROLES.map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => {
                                            setSelectedRole(role);
                                            setIsDropdownOpen(false);
                                            setError("");
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                                            selectedRole === role
                                                ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md"
                                                : "text-sky-500 hover:bg-sky-50 hover:text-sky-600"
                                        }`}
                                    >
                                        {role}
                                        {selectedRole === role && <Check size={18} className="drop-shadow-sm flex-shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="glass-card p-8 rounded-3xl shadow-card relative backdrop-blur-xl border border-white/10 bg-slate-900/60 z-10">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500"></div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm flex items-start gap-2 animate-slide-in-left">
                                <span className="mt-0.5 font-bold">!</span>
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block group-focus-within:text-sky-400 transition-colors">
                                    Telefon Raqami
                                </label>
                                <PhoneInput
                                    value={phone}
                                    onChange={(val) => setPhone(val)}
                                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/30 text-slate-100"
                                />
                            </div>
                            
                            {selectedRole === "Agent" && (
                                <div className="relative group">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block group-focus-within:text-sky-400 transition-colors">
                                        Agent Kodi
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Hash size={18} className="text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={agentCode}
                                            onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
                                            className="w-full bg-slate-800/80 border border-amber-500/40 rounded-xl pl-11 pr-4 py-3.5 text-amber-300 placeholder-slate-500 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all duration-300"
                                            placeholder="AGT-001"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="relative group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block group-focus-within:text-sky-400 transition-colors">
                                    Parol
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all duration-300"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:opacity-95 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-2 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Kirilmoqda...</span>
                                </div>
                            ) : (
                                <>
                                    <span>{selectedRole} sifatida kirish</span>
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
