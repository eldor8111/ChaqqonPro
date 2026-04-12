"use client";

import { useSuperAdminStore } from "@/lib/superAdminStore";
import { useAgentStore } from "@/lib/agentStore";
import { Users, Building, Plus, ArrowRight, Wallet, User as UserIcon, Phone as PhoneIcon, MapPin, Key, X } from "lucide-react";
import { PhoneInput } from "@/components/ui/PhoneInput";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentDashboard() {
    const { currentUser, isAuthenticated } = useSuperAdminStore();
    const { leads, tenants, fetchLeads, fetchTenants, isLoading } = useAgentStore();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    // New Tenant Modal States
    const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [formState, setFormState] = useState({
        shopName: "",
        ownerName: "",
        phone: "+998",
        address: "",
        adminPassword: "",
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated || currentUser?.role !== "Agent") {
            router.push("/super-admin/staff-login");
        } else if (currentUser?.agentCode) {
            fetchLeads(currentUser.agentCode);
            fetchTenants(currentUser.agentCode);
        }
    }, [isAuthenticated, mounted, router, currentUser, fetchLeads, fetchTenants]);

    if (!mounted || !isAuthenticated || currentUser?.role !== "Agent") return null;

    // Stats calculations
    const totalLeads = leads.length;
    const activeTenants = tenants.length;
    const convertedThisMonth = leads.filter(l => 
        l.status === 'converted' && 
        new Date(l.updatedAt || l.createdAt).getMonth() === new Date().getMonth()
    ).length;

    const handleAddTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError("");

        try {
            const body = {
                ...formState,
                adminUsername: formState.phone.replace(/[\s+()-]/g, ''),
                plan: "pro", // o'zgarmas tarif
                settings: { subscriptionDays: 30, planPrice: 300000 },
                status: "active",
                agentCode: currentUser.agentCode // biriktirilgan
            };

            const res = await fetch("/api/super-admin/tenants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Tashkilot yaratishda xatolik");

            setIsAddTenantOpen(false);
            setFormState({
                shopName: "", ownerName: "", phone: "+998",
                address: "", adminPassword: "",
            });
            fetchTenants(currentUser.agentCode); // qayta yuklash
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-fade-in relative max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Xush kelibsiz, {currentUser.name}!</h1>
                    <p className="text-slate-400 mt-2">Bugun qanday yangi mijozlar bilan ishlaymiz?</p>
                </div>
                <button 
                    onClick={() => setIsAddTenantOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 transition-all">
                    <Building size={20} />
                    Yangi tashkilot ochish
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors cursor-default hover:shadow-lg hover:shadow-purple-500/5">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex flex-shrink-0 items-center justify-center">
                                <Users size={20} className="text-purple-400" />
                            </div>
                            <h3 className="text-slate-400 font-medium">Umumiy mijozlarim</h3>
                        </div>
                        <p className="text-4xl font-black text-white mt-4">{isLoading ? "..." : totalLeads}</p>
                    </div>
                </div>
                
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 relative overflow-hidden group hover:border-sky-500/30 transition-colors cursor-default hover:shadow-lg hover:shadow-sky-500/5">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex flex-shrink-0 items-center justify-center">
                                <Building size={20} className="text-sky-400" />
                            </div>
                            <h3 className="text-slate-400 font-medium">Ochilgan do'konlar</h3>
                        </div>
                        <p className="text-4xl font-black text-sky-400 mt-4">{isLoading ? "..." : activeTenants}</p>
                    </div>
                </div>
                
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 relative overflow-hidden group hover:border-green-500/30 transition-colors cursor-default hover:shadow-lg hover:shadow-green-500/5">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex flex-shrink-0 items-center justify-center">
                                <Wallet size={20} className="text-green-400" />
                            </div>
                            <h3 className="text-slate-400 font-medium">Joriy oydagi natija</h3>
                        </div>
                        <p className="text-4xl font-black text-green-400 mt-4">{isLoading ? "..." : convertedThisMonth}</p>
                        <p className="text-xs text-slate-500 mt-2">Mijozga aylanganlar soni</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800/80 transition-colors">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Users size={20} className="text-sky-400" /> Potensial Mijozlar</h2>
                        <p className="text-slate-400 text-sm mb-6">Mijozlar bilan aloqalar tarixini va qiziqish holatini kuzatib boring.</p>
                    </div>
                    <Link href="/agent-portal/leads" className="flex items-center gap-2 text-sky-400 font-medium hover:text-sky-300 w-fit transition-colors bg-sky-500/10 px-4 py-2 rounded-lg">
                        Qiziqish bildirilgan zayavkalar <ArrowRight size={16} />
                    </Link>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800/80 transition-colors">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Building size={20} className="text-indigo-400" /> Do'konlar Holati</h2>
                        <p className="text-slate-400 text-sm mb-6">O'zingiz ulagan barcha do'konlarning hisoboti.</p>
                    </div>
                    <Link href="/agent-portal/tenants" className="flex items-center gap-2 text-indigo-400 font-medium hover:text-indigo-300 w-fit transition-colors bg-indigo-500/10 px-4 py-2 rounded-lg">
                        Do'konlarni ko'rish <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* NEW TENANT MODAL */}
            {isAddTenantOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900/90 border border-white/10 rounded-3xl w-full max-w-2xl shadow-[0_0_100px_rgba(56,189,248,0.15)] relative animate-[fade-in_0.3s_ease-out] flex flex-col my-8 overflow-hidden backdrop-blur-2xl">
                        
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[120px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
                        
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center relative z-10 bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-black flex items-center gap-3 text-white tracking-tight">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                                        <Building size={20} />
                                    </div>
                                    Yangi Tashkilot Ochish
                                </h3>
                                <p className="text-sm text-slate-400 mt-2 font-medium flex items-center gap-1.5">
                                    Agent Kodi: <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-bold uppercase">{currentUser.agentCode}</span>
                                </p>
                            </div>
                            <button onClick={() => !formLoading && setIsAddTenantOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto w-full relative z-10">
                            <form id="tenant-form" onSubmit={handleAddTenant} className="space-y-6">
                                {formError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-100 p-4 rounded-xl text-sm text-center font-medium shadow-inner shadow-red-500/10">
                                        <span className="text-red-400 font-bold mr-2">!</span> {formError}
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                    <div className="space-y-2 col-span-1 md:col-span-2 group">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Tashkilot nomi <span className="text-sky-400">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                                <Building size={18} />
                                            </div>
                                            <input required disabled={formLoading} placeholder="Misol: Milliy Taomlar" value={formState.shopName} onChange={(e) => setFormState({...formState, shopName: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-white/10 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder:text-slate-600 outline-none font-medium hover:border-white/20" />
                                        </div>
                                    </div>

                                    <div className="space-y-2 group">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Rahbar Ism familiyasi <span className="text-sky-400">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                                <UserIcon size={18} />
                                            </div>
                                            <input required disabled={formLoading} placeholder="Dilshod Karimov" value={formState.ownerName} onChange={(e) => setFormState({...formState, ownerName: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-white/10 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder:text-slate-600 outline-none font-medium hover:border-white/20" />
                                        </div>
                                    </div>

                                    <div className="space-y-2 group">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Telfon raqam (Hamda Login) <span className="text-sky-400">*</span></label>
                                        <div className="relative z-50">
                                            <PhoneInput
                                                value={formState.phone}
                                                onChange={(val) => setFormState({...formState, phone: val})}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 pl-1 mt-1 font-semibold">Tizimga kirish uchun ushbu raqam login bo'ladi.</p>
                                    </div>

                                    <div className="space-y-2 col-span-1 md:col-span-2 group">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Manzil</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                                <MapPin size={18} />
                                            </div>
                                            <input disabled={formLoading} placeholder="Toshkent sh., Yunusobod" value={formState.address} onChange={(e) => setFormState({...formState, address: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-white/10 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder:text-slate-600 outline-none font-medium hover:border-white/20" />
                                        </div>
                                    </div>

                                    <div className="col-span-1 md:col-span-2 pt-2">
                                        <div className="space-y-2 group max-w-sm">
                                            <label className="text-xs font-bold text-sky-400 uppercase tracking-widest pl-1">Ma'mur (Admin) Paroli <span className="text-sky-400">*</span></label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-sky-500">
                                                    <Key size={18} />
                                                </div>
                                                <input type="text" required disabled={formLoading} placeholder="Misol uchun: password123" value={formState.adminPassword} onChange={(e) => setFormState({...formState, adminPassword: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-sky-950/20 border border-sky-500/30 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-600 outline-none font-mono tracking-wider font-bold shadow-inner shadow-sky-900/20" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Oylik To'lov qismi O'zgarmas! */}
                                <div className="mt-8 bg-gradient-to-r from-sky-500/10 to-indigo-500/5 border border-sky-500/20 rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-sky-500/5">
                                        <Wallet size={120} />
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/40 relative z-10">
                                        <Wallet size={32} className="text-white" />
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-1 shadow-sm">Majburiy To'lov (Oylik)</p>
                                        <div className="flex items-baseline gap-2">
                                            <h2 className="text-3xl font-black text-white tracking-tight">300,000</h2>
                                            <span className="text-xl text-slate-400 font-bold">UZS</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-6 mt-4">
                                    <button type="button" onClick={() => setIsAddTenantOpen(false)} className="px-6 py-3.5 font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all disabled:opacity-50">
                                        Bekor qilish
                                    </button>
                                    <button type="submit" disabled={formLoading} className="group relative flex items-center justify-center min-w-[220px] px-8 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-xl shadow-[0_0_40px_rgba(56,189,248,0.4)] hover:shadow-[0_0_60px_rgba(56,189,248,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_40px_rgba(56,189,248,0.4)] disabled:active:scale-100 overflow-hidden">
                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                        {formLoading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Yaratilmoqda...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm uppercase tracking-widest">
                                                Tashkilot Oching <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
