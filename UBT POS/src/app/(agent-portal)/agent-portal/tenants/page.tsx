"use client";

import { useSuperAdminStore } from "@/lib/superAdminStore";
import { useAgentStore } from "@/lib/agentStore";
import { useEffect } from "react";
import { Building2, Layers, CheckCircle2, Phone, Calendar } from "lucide-react";

export default function AgentTenants() {
    const { currentUser } = useSuperAdminStore();
    const { tenants, fetchTenants, isLoading } = useAgentStore();

    useEffect(() => {
        if (currentUser?.agentCode) {
            fetchTenants(currentUser.agentCode);
        }
    }, [currentUser?.agentCode, fetchTenants]);

    return (
        <div className="p-6 md:p-10 space-y-6 animate-fade-in relative max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Building2 className="text-sky-400" /> Do'konlarim
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Siz tamoningizdan ulangan do'konlar va litsenziya holatlari.</p>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && tenants.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500">
                        Do'konlarni yuklanmoqda...
                    </div>
                ) : tenants.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 flex flex-col items-center">
                        <Building2 size={40} className="mb-3 opacity-20" />
                        Sizda hali biriktirilgan do'konlar yo'q
                    </div>
                ) : tenants.map((tenant) => (
                    <div key={tenant.id} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 hover:shadow-lg hover:shadow-sky-500/5 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">{tenant.shopName}</h3>
                                <p className="text-xs text-slate-400">Tizim kodi: <span className="font-mono text-sky-400">{tenant.shopCode}</span></p>
                            </div>
                            <span className={`px-2 py-1 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase rounded-md border ${tenant.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                <CheckCircle2 size={10} /> {tenant.status}
                            </span>
                        </div>
                        
                        <div className="space-y-3 mt-5">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex flex-shrink-0 items-center justify-center">
                                    <Layers size={16} className="text-slate-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">Ta'rif (Plan)</div>
                                    <div className="font-medium text-slate-200 capitalize">{tenant.plan}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex flex-shrink-0 items-center justify-center">
                                    <Phone size={16} className="text-slate-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">Egasi / Telefon</div>
                                    <div className="font-medium text-slate-200">{tenant.ownerName} &bull; {tenant.phone}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex flex-shrink-0 items-center justify-center">
                                    <Calendar size={16} className="text-slate-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">Qo'shilgan sana</div>
                                    <div className="font-medium text-slate-200">{new Date(tenant.createdAt).toLocaleDateString("uz-UZ")}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
