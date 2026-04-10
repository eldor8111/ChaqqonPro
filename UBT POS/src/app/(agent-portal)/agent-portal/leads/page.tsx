"use client";

import { useSuperAdminStore } from "@/lib/superAdminStore";
import { useAgentStore } from "@/lib/agentStore";
import { useState, useEffect, Suspense } from "react";
import { Plus, Building, Phone, Clock, FileText, ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";

function AgentLeadsContent() {
    const { currentUser } = useSuperAdminStore();
    const { leads, fetchLeads, updateLeadStatus, isLoading } = useAgentStore();
    const searchParams = useSearchParams();
    
    // modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get("new") === "1") {
            setIsAddModalOpen(true);
        }
    }, [searchParams]);
    const { addLead } = useAgentStore();

    // new lead form
    const [businessName, setBusinessName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");

    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        if (currentUser?.agentCode) {
            fetchLeads(currentUser.agentCode);
        }
    }, [currentUser?.agentCode, fetchLeads]);

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.agentCode) return;
        setFormLoading(true);
        setFormError("");
        try {
            await addLead({
                agentCode: currentUser.agentCode,
                businessName,
                ownerName,
                phone,
                address,
                status: "new",
                notes,
                nextContactDate: null
            });
            setIsAddModalOpen(false);
            setBusinessName("");
            setOwnerName("");
            setPhone("");
            setAddress("");
            setNotes("");
        } catch (err: any) {
            setFormError(err.message || "Xatolik yuz berdi");
        } finally {
            setFormLoading(false);
        }
    };

    const handleStatusChange = (id: string, newStatus: string) => {
        updateLeadStatus(id, newStatus);
    };

    const statusOptions = [
        { value: "new", label: "Yangi", color: "bg-blue-500/20 text-blue-400" },
        { value: "contacted", label: "Bog'lanildi", color: "bg-yellow-500/20 text-yellow-500" },
        { value: "interested", label: "Qiziqish bildirdi", color: "bg-purple-500/20 text-purple-400" },
        { value: "converted", label: "Mijozga aylandi", color: "bg-green-500/20 text-green-400" },
        { value: "rejected", label: "Rad etildi", color: "bg-red-500/20 text-red-500" },
    ];

    return (
        <div className="p-6 md:p-10 space-y-6 animate-fade-in relative max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Potensial Mijozlar</h1>
                    <p className="text-sm text-slate-400 mt-1">Zayavkalar va maqsadli mijozlarni boshqarish.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary"
                >
                    <Plus size={18} />
                    Zayavka qabul qilish
                </button>
            </div>

            {/* List */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-800 border-b border-slate-700 text-slate-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-semibold rounded-tl-xl w-[25%]">Biznes</th>
                                <th className="px-6 py-4 font-semibold w-[20%]">Aloqa</th>
                                <th className="px-6 py-4 font-semibold w-[15%]">Sana</th>
                                <th className="px-6 py-4 font-semibold w-[15%]">Holat</th>
                                <th className="px-6 py-4 font-semibold rounded-tr-xl w-[25%]">Boshqarish</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-slate-300">
                            {isLoading && leads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Yuklanmoqda...
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 flex flex-col items-center justify-center">
                                        <Building size={32} className="mb-2 opacity-50" />
                                        Mijozlar topilmadi
                                    </td>
                                </tr>
                            ) : leads.map((lead) => {
                                const currentStatus = statusOptions.find(opt => opt.value === lead.status) || statusOptions[0];
                                return (
                                    <tr key={lead.id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-100">{lead.businessName}</div>
                                            <div className="text-xs text-slate-400 mt-1">{lead.address || "Manzil yo'q"}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                    <Phone size={12} className="text-sky-400" />
                                                </div>
                                                <div>
                                                    <div className="text-slate-200">{lead.phone}</div>
                                                    <div className="text-xs text-slate-400">{lead.ownerName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Clock size={14} />
                                                {new Date(lead.createdAt).toLocaleDateString("uz-UZ")}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-transparent ${currentStatus.color.split(' ')[0]} ${currentStatus.color.split(' ')[1]}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                {currentStatus.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative inline-block w-full">
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                                    className="w-full appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block px-3 py-2"
                                                >
                                                    {statusOptions.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in flex flex-col h-auto max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 rounded-t-2xl z-10 font-bold sticky top-0">
                            <h3 className="text-xl text-white">Yangi zayavka qo'shish</h3>
                            <button
                                type="button"
                                onClick={() => !formLoading && setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                            >
                                ✕
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleAddLead} id="lead-form" className="space-y-4">
                                {formError && (
                                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                                        {formError}
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    {/* Business Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Tashkilot/Do'kon nomi *</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Building size={16} className="text-slate-500" />
                                            </div>
                                            <input
                                                type="text"
                                                value={businessName}
                                                onChange={(e) => setBusinessName(e.target.value)}
                                                className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-white placeholder-slate-500"
                                                placeholder="Masalan: Milliy Taomlar"
                                                required
                                                disabled={formLoading}
                                            />
                                        </div>
                                    </div>

                                    {/* Owner Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Rahbar ismi</label>
                                        <input
                                            type="text"
                                            value={ownerName}
                                            onChange={(e) => setOwnerName(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-white placeholder-slate-500"
                                            placeholder="Rahbar yoki mas'ul shaxs ismi"
                                            disabled={formLoading}
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefon raqami *</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone size={16} className="text-slate-500" />
                                            </div>
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-white placeholder-slate-500"
                                                placeholder="+998 90 123 45 67"
                                                required
                                                disabled={formLoading}
                                            />
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Manzil</label>
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-white placeholder-slate-500"
                                            placeholder="Masalan: Toshkent, Chilonzor"
                                            disabled={formLoading}
                                        />
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Qo'shimcha izoh (Notes)</label>
                                        <div className="relative">
                                            <div className="absolute top-3 left-3 pointer-events-none">
                                                <FileText size={16} className="text-slate-500" />
                                            </div>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={3}
                                                className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-white placeholder-slate-500 resize-none"
                                                placeholder="Mijoz haqida batafsil..."
                                                disabled={formLoading}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-700 rounded-b-2xl bg-slate-800/80 sticky bottom-0 z-10 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-700/50 transition-colors"
                                disabled={formLoading}
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="submit"
                                form="lead-form"
                                disabled={formLoading || !businessName || !phone}
                                className="btn-primary"
                            >
                                {formLoading ? "Saqlanmoqda..." : "Saqlash"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

export default function AgentLeads() {
    return (
        <Suspense fallback={<div className="p-10 text-slate-400">Yuklanmoqda...</div>}>
            <AgentLeadsContent />
        </Suspense>
    );
}
