"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, Search, Edit2, Trash2, LogIn, LogOut, X,
    ChevronDown, ChevronUp, Phone, Globe, User, Building2,
    Settings, Shield, Calendar, MapPin, DollarSign, CreditCard,
    Users, BarChart3, AlertCircle, CheckCircle2, Clock, RefreshCw,
    Store, Menu,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSuperAdminStore } from "@/lib/superAdminStore";
import { PhoneInput } from "@/components/ui/PhoneInput";

/* ─── Constants ─────────────────────────────────────────────────────── */
const PLANS = {
    starter:    { label: "Starter",    color: "bg-green-500/10 text-green-400",   price: "Bepul",        amount: 0,      yearlyAmount: 0 },
    basic:      { label: "Basic",      color: "bg-blue-500/10 text-blue-400",     price: "99,000 UZS",   amount: 99000,  yearlyAmount: 79000 },
    pro:        { label: "Pro",        color: "bg-sky-500/10 text-sky-400",       price: "199,000 UZS",  amount: 199000, yearlyAmount: 159000 },
    enterprise: { label: "Enterprise", color: "bg-indigo-500/10 text-indigo-400", price: "300,000 UZS",  amount: 300000, yearlyAmount: 240000 },
};
// Oylik variant: to'liq narx
// Yillik variant: oyiga ~20% chegirma (12 oy to'lansa 10 oy narxiga)
const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-500/10 text-green-400",
    trial: "bg-yellow-500/10 text-yellow-400",
    suspended: "bg-red-500/10 text-red-400",
    paid: "bg-green-500/10 text-green-400",
    overdue: "bg-red-500/10 text-red-400",
};
const STATUS_LABELS: Record<string, string> = {
    active: "Faol", trial: "Sinov", suspended: "To'xtatilgan",
    paid: "To'langan", overdue: "Muddati o'tgan",
};
const WEEKDAYS = [
    { key: "mon", label: "Du" }, { key: "tue", label: "Se" }, { key: "wed", label: "Cho" },
    { key: "thu", label: "Pa" }, { key: "fri", label: "Ju" }, { key: "sat", label: "Sha" }, { key: "sun", label: "Ya" },
];
const DEFAULT_SETTINGS = {
    workDays: ["mon","tue","wed","thu","fri","sat"],
    subscriptionDays: 30,
    tariffPrice: 0, useWarehouse: true, useLoyalty: false, useMultiBranch: false,
    useCRM: false, useAnalytics: true, contacts: [] as {type:string;value:string}[],
    country: "Uzbekiston", region: "", city: "", currencies: ["UZS"], telegramGroupId: "", description: "",
};

const PERMISSIONS_LIST = [
    {
        category: "Tashkilotlar boshqaruvi",
        permissions: [
            { id: "tenants:view", label: "Ko'rish (Faqat o'qish)" },
            { id: "tenants:create", label: "Yangi tashkilot qo'shish" },
            { id: "tenants:edit", label: "Tahrirlash va sozlamalar" },
            { id: "tenants:impersonate", label: "Tashkilot profiliga kirish" },
            { id: "tenants:delete", label: "O'chirish" }
        ]
    },
    {
        category: "Foydalanuvchilar (Xodimlar)",
        permissions: [
            { id: "users:view", label: "Xodimlarni ko'rish" },
            { id: "users:create", label: "Qo'shish va Tahrirlash" },
            { id: "users:delete", label: "O'chirish" }
        ]
    },
    {
        category: "Moliya (Billing)",
        permissions: [
            { id: "billing:view", label: "Moliyaviy faoliyatni ko'rish" },
            { id: "billing:manage", label: "To'lovlarni boshqarish" }
        ]
    }
];

type ContactItem = { type: string; value: string };
type SideTab = "tenants" | "users" | "billing" | "settings";

const inputClass = "w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30";
const labelClass = "block text-sm font-medium mb-1.5 text-slate-600";

/* ─── Sidebar nav item ───────────────────────────────────────────────── */
function NavItem({ icon: Icon, label, active, onClick, badge }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                active
                    ? "bg-sky-500/20 text-sky-300 shadow-lg ring-1 ring-sky-500/30"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }`}
        >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
            {badge != null && badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/30 text-sky-300">{badge}</span>
            )}
        </button>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function SuperAdminPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const currentUser = useSuperAdminStore(state => state.currentUser);
    
    const isMaster = currentUser?.role === "MASTER" || !currentUser?.permissions;
    const canViewTenants = isMaster || currentUser?.permissions?.includes("tenants:view");
    const canEditTenants = isMaster || currentUser?.permissions?.includes("tenants:edit");
    const canDeleteTenants = isMaster || currentUser?.permissions?.includes("tenants:delete");
    const canImpersonateTenants = isMaster || currentUser?.permissions?.includes("tenants:impersonate");
    const canCreateTenants = isMaster || currentUser?.permissions?.includes("tenants:create");
    const canViewUsers = isMaster || currentUser?.permissions?.includes("users:view");
    const canCreateUsers = isMaster || currentUser?.permissions?.includes("users:create");
    const canDeleteUsers = isMaster || currentUser?.permissions?.includes("users:delete");
    const canViewBilling = isMaster || currentUser?.permissions?.includes("billing:view");

    const [activeTab, setActiveTab] = useState<SideTab>(canViewTenants ? "tenants" : canViewUsers ? "users" : canViewBilling ? "billing" : "tenants");
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileForm, setProfileForm] = useState({ password: "", confirmPassword: "" });

    // ── Tenants state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterPlan, setFilterPlan] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<any>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [showExtra, setShowExtra] = useState(false);

    // ── Users state
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState("all");
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [userFormData, setUserFormData] = useState({ id: "", name: "", phone: "", password: "", role: "Menejer", agentCode: "", permissions: [] as string[] });

    // ── Billing state
    const [billingSearch, setBillingSearch] = useState("");
    const [billingStatusFilter, setBillingStatusFilter] = useState("all");
    const [extendModal, setExtendModal] = useState<{ tenantId: string; shopName: string; plan: string; monthlyPrice: number } | null>(null);
    const [extendPeriod, setExtendPeriod] = useState<"monthly" | "yearly">("monthly");
    const [extendMonths, setExtendMonths] = useState(1);

    // ── Settings state
    const [settingsFormData, setSettingsFormData] = useState({
        supportBotToken: "",
        supportChatId: "",
        
    });

    /* ── Queries ─────────────────────────────────────────────────────── */
    const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
        queryKey: ["tenants"],
        queryFn: async () => {
            const res = await fetch("/api/super-admin/tenants");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });
    const tenants = useMemo(() => (tenantsData?.tenants || []) as any[], [tenantsData?.tenants]);

    const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
        queryKey: ["super-users"],
        queryFn: async () => {
            const res = await fetch("/api/super-admin/users");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: activeTab === "users",
    });
    const allUsers = useMemo(() => (usersData?.users || []) as any[], [usersData?.users]);

    const { data: billingData, isLoading: billingLoading, refetch: refetchBilling } = useQuery({
        queryKey: ["super-billing"],
        queryFn: async () => {
            const res = await fetch("/api/super-admin/billing");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: activeTab === "billing",
    });
    const billingRows = useMemo(() => (billingData?.billing || []) as any[], [billingData?.billing]);
    const totalRevenue = billingData?.totalRevenue || 0;

    const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
        queryKey: ["super-settings"],
        queryFn: async () => {
            const res = await fetch("/api/super-admin/settings");
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            if (data.settings) {
                setSettingsFormData({
                    supportBotToken: data.settings.supportBotToken || "",
                    supportChatId: data.settings.supportChatId || "",
                });
            }
            return data;
        },
        enabled: activeTab === "settings",
    });

    /* ── Mutations ───────────────────────────────────────────────────── */
    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch("/api/super-admin/tenants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Xatolik"); }
            return res.json();
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); setShowAddModal(false); },
    });
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetch(`/api/super-admin/tenants/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Xatolik"); }
            return res.json();
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); setShowAddModal(false); },
    });
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/super-admin/tenants/${id}`, { method: "DELETE" });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Xatolik"); }
            return res.json();
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); setConfirmDeleteId(null); },
    });
    const deleteUserMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch("/api/super-admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Xatolik"); }
            return res.json();
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["super-users"] }); },
    });
    const createUserMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch("/api/super-admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Xatolik"); }
            return res.json();
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["super-users"] }); setShowAddUserModal(false); },
    });
    const updateUserMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch("/api/super-admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Xatolik"); }
            return res.json();
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["super-users"] }); setShowAddUserModal(false); setShowProfileModal(false); },
    });
    const extendMutation = useMutation({
        mutationFn: async ({ tenantId, days }: { tenantId: string; days: number }) => {
            const res = await fetch("/api/super-admin/billing/extend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, days }) });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Xatolik"); }
            return res.json();
        },
        onSuccess: (data) => {
            alert(data.message);
            setExtendModal(null);
            setExtendMonths(1);
            setExtendPeriod("monthly");
            queryClient.invalidateQueries({ queryKey: ["super-billing"] });
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
        },
        onError: (e: any) => alert(e.message),
    });

    const updateSettingsMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch("/api/super-admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Xatolik"); }
            return res.json();
        },
        onSuccess: () => {
            alert("Sozlamalar saqlandi!");
            queryClient.invalidateQueries({ queryKey: ["super-settings"] });
        },
        onError: (e: any) => alert(e.message),
    });


    /* ── Form state (tenant) ─────────────────────────────────────────── */
    const [formData, setFormData] = useState({
        shopCode: "", shopName: "", ownerName: "", phone: "", address: "",
        plan: "basic" as string, status: "active" as string, shopType: "ubt" as string,
        adminPassword: "", settings: { ...DEFAULT_SETTINGS },
    });
    const f = (field: string, val: any) => setFormData((p) => ({ ...p, [field]: val }));
    const fs = (field: string, val: any) => setFormData((p) => ({ ...p, settings: { ...p.settings, [field]: val } }));

    /* ── Computed ────────────────────────────────────────────────────── */
    const stats = {
        total: tenants.length,
        active: tenants.filter((t: any) => t.status === "active").length,
        trial: tenants.filter((t: any) => t.status === "trial").length,
        revenue: tenants.filter((t: any) => t.plan !== "starter").reduce((s: number, t: any) => s + (PLANS[t.plan as keyof typeof PLANS]?.amount || 0), 0),
    };

    const filteredTenants = useMemo(() => tenants.filter((t: any) => {
        const q = searchTerm.toLowerCase();
        const matchSearch = (t.shopCode||"").toLowerCase().includes(q)||(t.shopName||"").toLowerCase().includes(q)||(t.ownerName||"").toLowerCase().includes(q)||(t.phone||"").includes(q);
        return matchSearch && (filterPlan === "all" || t.plan === filterPlan) && (filterStatus === "all" || t.status === filterStatus);
    }), [tenants, searchTerm, filterPlan, filterStatus]);

    const filteredUsers = useMemo(() => allUsers.filter((u: any) => {
        const q = userSearch.toLowerCase();
        const matchSearch = (u.name||"").toLowerCase().includes(q)||(u.phone||"").toLowerCase().includes(q);
        let matchRole = true;
        if (userRoleFilter !== "all") matchRole = u.role === userRoleFilter;
        return matchSearch && matchRole;
    }), [allUsers, userSearch, userRoleFilter]);

    const filteredBilling = useMemo(() => billingRows.filter((b: any) => {
        const q = billingSearch.toLowerCase();
        const matchSearch = (b.shopName||"").toLowerCase().includes(q)||(b.shopCode||"").toLowerCase().includes(q);
        return matchSearch && (billingStatusFilter === "all" || b.paymentStatus === billingStatusFilter);
    }), [billingRows, billingSearch, billingStatusFilter]);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    /* ── Handlers ───────────────────────────────────────────────────── */
    const handleOpenAddModal = () => {
        setEditingTenant(null);
        setFormData({ shopCode: `UBT${String(tenants.length + 1).padStart(3, "0")}`, shopName: "", ownerName: "", phone: "", address: "", plan: "basic", status: "active", shopType: "ubt", adminPassword: "", settings: { ...DEFAULT_SETTINGS, contacts: [] } });
        setShowExtra(false); setShowAddModal(true);
    };
    const handleOpenEditModal = (tenant: any) => {
        setEditingTenant(tenant);
        const s = tenant.settings || {};
        setFormData({ shopCode: tenant.shopCode||"", shopName: tenant.shopName||"", ownerName: tenant.ownerName||"", phone: tenant.phone||"", address: tenant.address||"", plan: tenant.plan||"basic", status: tenant.status||"active", shopType: "ubt", adminPassword: "", settings: { workDays: s.workDays||DEFAULT_SETTINGS.workDays, subscriptionDays: s.subscriptionDays||DEFAULT_SETTINGS.subscriptionDays, tariffPrice: s.tariffPrice||0, useWarehouse: s.useWarehouse??true, useLoyalty: s.useLoyalty??false, useMultiBranch: s.useMultiBranch??false, useCRM: s.useCRM??false, useAnalytics: s.useAnalytics??true, contacts: s.contacts||[], country: s.country||"Uzbekiston", region: s.region||"", city: s.city||"", currencies: s.currencies||["UZS"], telegramGroupId: s.telegramGroupId||"", description: s.description||"" } });
        setShowExtra(false); setShowAddModal(true);
    };
    const handleSave = async () => {
        if (!formData.shopCode||!formData.shopName||!formData.ownerName||!formData.phone) { alert("Barcha majburiy maydonlarni to'ldiring"); return; }
        if (!editingTenant&&!formData.adminPassword) { alert("Admin parolini kiriting"); return; }
        if (!editingTenant&&formData.adminPassword.length<6) { alert("Admin paroli kamida 6 ta belgi bo'lishi kerak"); return; }
        const payload = { shopCode: formData.shopCode, shopName: formData.shopName, ownerName: formData.ownerName, phone: formData.phone, email: "", address: formData.address, plan: formData.plan, status: formData.status, shopType: formData.shopType, adminUsername: formData.phone, adminPassword: formData.adminPassword||undefined, settings: { ...formData.settings, shopType: formData.shopType } };
        if (editingTenant) await updateMutation.mutateAsync({ id: editingTenant.id, data: payload });
        else await createMutation.mutateAsync(payload);
    };
    const addContact = () => fs("contacts", [...formData.settings.contacts, { type: "phone", value: "" }]);
    const updateContact = (idx: number, field: keyof ContactItem, val: string) => { const u=[...formData.settings.contacts]; u[idx]={...u[idx],[field]:val}; fs("contacts",u); };
    const removeContact = (idx: number) => fs("contacts", formData.settings.contacts.filter((_:any,i:number)=>i!==idx));
    const toggleWorkDay = (day: string) => { const d=formData.settings.workDays; fs("workDays", d.includes(day)?d.filter((x:string)=>x!==day):[...d,day]); };
    const handleLogout = () => { useSuperAdminStore.getState().logout(); router.push("/super-admin/login"); };
    const handleImpersonate = (shopCode: string, phone: string) => { localStorage.setItem("ubt-active-shop",shopCode); localStorage.setItem("ubt-tenant-admin-user",phone); window.location.href="/"; };

    const isSaving = createMutation.isPending || updateMutation.isPending;
    const fmtMoney = (v: number) => new Intl.NumberFormat("uz-UZ").format(v);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex overflow-hidden">
            {/* ── MOBILE OVERLAY ─────────── */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
            <aside className={`w-64 shrink-0 flex flex-col gap-2 border-r border-slate-200 bg-white px-4 py-6 fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:h-screen transform transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                <div className="flex items-center justify-between lg:block">
                    {/* Brand */}
                <div className="mb-8 mt-2 px-2">
                    <div className="flex items-center mb-1">
                        <span className="font-black text-2xl tracking-tight text-slate-800">
                            Chaqqon<span className="text-blue-600">Pro</span>
                        </span>
                    </div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Super Admin Portal</p>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 lg:hidden"
                >
                    <X size={20} />
                </button>
            </div>

            {canViewTenants && (
                    <>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold px-2 mb-1">Asosiy</p>
                        <NavItem icon={Store} label="Tashkilotlar" active={activeTab==="tenants"} onClick={()=>setActiveTab("tenants")} badge={stats.total} />
                    </>
                )}

                {canViewUsers && (
                    <>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold px-2 mb-1 mt-3">Foydalanuvchilar</p>
                        <NavItem icon={Users} label="Foydalanuvchilar" active={activeTab==="users"} onClick={()=>{setActiveTab("users");refetchUsers();}} badge={usersData?.total} />
                    </>
                )}

                {canViewBilling && (
                    <>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold px-2 mb-1 mt-3">Moliya</p>
                        <NavItem icon={CreditCard} label="Billing" active={activeTab==="billing"} onClick={()=>{setActiveTab("billing");refetchBilling();}} />
                    </>
                )}

                {isMaster && (
                    <>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold px-2 mb-1 mt-3">Tizim</p>
                        <NavItem icon={Settings} label="Sozlamalar" active={activeTab==="settings"} onClick={()=>{setActiveTab("settings");refetchSettings();}} />
                    </>
                )}

                <div className="flex-1" />

                {/* Stats summary */}
                {canViewTenants && (
                    <div className="rounded-xl bg-slate-100 border border-slate-200 p-4 space-y-2.5 text-xs mt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Faol do&apos;konlar</span>
                            <span className="font-bold text-green-400">{stats.active}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Sinov</span>
                            <span className="font-bold text-yellow-400">{stats.trial}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Oylik daromad</span>
                            <span className="font-bold text-indigo-400">{fmtMoney(stats.revenue)} UZS</span>
                        </div>
                    </div>
                )}

                {!isMaster && (
                    <button onClick={() => setShowProfileModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors mt-4">
                        <User size={18} />
                        <span className="flex-1 text-left">Mening Profilim</span>
                    </button>
                )}

                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors mt-2">
                    <LogOut size={18} />
                    <span>Chiqish</span>
                </button>
            </aside>

            {/* ── MAIN CONTENT ─────────────────────────────────────── */}
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative flex flex-col h-screen">
                {/* ── HEADER ───────────────────────────────────────────── */}
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
                                {activeTab === "tenants" ? "Tashkilotlar" :
                                 activeTab === "users" ? "Foydalanuvchilar" :
                                 activeTab === "billing" ? "Billing va To'lovlar" :
                                 activeTab === "settings" ? "Sozlamalar" : ""}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Chaqqon platformasi umumlashgan boshqaruvi</p>
                        </div>
                    </div>
                    {activeTab === "tenants" && canCreateTenants && (
                        <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-bold shadow-lg">
                            <Plus size={18} />
                            Yangi tashkilot
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">

                    {/* ══ TENANTS TAB ══════════════════════════════════ */}
                    {activeTab === "tenants" && (
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "Jami tashkilotlar", value: stats.total, color: "text-sky-400", bg: "from-sky-500/10 to-sky-500/5" },
                                    { label: "Faol", value: stats.active, color: "text-green-400", bg: "from-green-500/10 to-green-500/5" },
                                    { label: "Sinov muddatida", value: stats.trial, color: "text-yellow-400", bg: "from-yellow-500/10 to-yellow-500/5" },
                                    { label: "Oylik daromad", value: `${(stats.revenue/1000000).toFixed(1)}M UZS`, color: "text-indigo-400", bg: "from-indigo-500/10 to-indigo-500/5" },
                                ].map((s, i) => (
                                    <div key={i} className={`bg-gradient-to-br ${s.bg} border border-slate-200 rounded-2xl p-5`}>
                                        <p className="text-xs text-slate-400 mb-2 font-medium">{s.label}</p>
                                        <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                                <div className="flex-1 min-w-[240px] relative">
                                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input type="text" placeholder="Tashkilot kodi, nomi, egasi..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500/50" />
                                </div>
                                <select value={filterPlan} onChange={(e)=>setFilterPlan(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50">
                                    <option value="all">Barcha rejalar</option>
                                    <option value="starter">Starter</option>
                                    <option value="basic">Basic</option>
                                    <option value="pro">Pro</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                                <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50">
                                    <option value="all">Barcha holatlar</option>
                                    <option value="active">Faol</option>
                                    <option value="trial">Sinov</option>
                                    <option value="suspended">To'xtatilgan</option>
                                </select>
                            </div>

                            {/* Table */}
                            <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                                {tenantsLoading ? (
                                    <div className="p-12 text-center text-slate-400">Yuklanmoqda...</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-400 uppercase">
                                                    <th className="px-5 py-3">#</th>
                                                    <th className="px-5 py-3">Kod</th>
                                                    <th className="px-5 py-3">Billing ID</th>
                                                    <th className="px-5 py-3">Nomi</th>
                                                    <th className="px-5 py-3">Egasi</th>
                                                    <th className="px-5 py-3">Telefon</th>
                                                    <th className="px-5 py-3">Tarif</th>
                                                    <th className="px-5 py-3">Holat</th>
                                                    <th className="px-5 py-3">Agent</th>
                                                    <th className="px-5 py-3">Amallar</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTenants.length === 0 ? (
                                                    <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">Tashkilotlar topilmadi</td></tr>
                                                ) : filteredTenants.map((t: any, idx: number) => (
                                                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors">
                                                        <td className="px-5 py-4 text-sm text-slate-400">{idx+1}</td>
                                                        <td className="px-5 py-4 text-sm font-bold text-sky-300">{t.shopCode}</td>
                                                        <td className="px-5 py-4 text-lg font-black text-brand tracking-wider">{t.billingId || "—"}</td>
                                                        <td className="px-5 py-4 text-sm text-slate-800">{t.shopName}</td>
                                                        <td className="px-5 py-4 text-sm text-slate-600">{t.ownerName}</td>
                                                        <td className="px-5 py-4 text-sm text-slate-600">{t.phone}</td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PLANS[t.plan as keyof typeof PLANS]?.color||"bg-slate-500/10 text-slate-400"}`}>{PLANS[t.plan as keyof typeof PLANS]?.label||t.plan}</span>
                                                        </td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[t.status]||""}`}>{STATUS_LABELS[t.status]||t.status}</span>
                                                        </td>
                                                        <td className="px-5 py-4 text-sm">
                                                            {t.agentCode ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-500 uppercase">{t.agentCode}</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/50 text-slate-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <div className="flex items-center gap-1.5">
                                                                {canImpersonateTenants && <button onClick={()=>handleImpersonate(t.shopCode,t.phone)} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors" title="Kirish"><LogIn size={15}/></button>}
                                                                {canEditTenants && <button onClick={()=>handleOpenEditModal(t)} className="p-1.5 rounded-lg hover:bg-sky-500/20 text-sky-400 transition-colors" title="Tahrirlash"><Edit2 size={15}/></button>}
                                                                {canDeleteTenants && <button onClick={()=>setConfirmDeleteId(t.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="O'chirish"><Trash2 size={15}/></button>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══ USERS TAB ════════════════════════════════════ */}
                    {activeTab === "users" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { label: "Jami foydalanuvchilar", value: allUsers.length, color: "text-sky-400", bg: "from-sky-500/10 to-sky-500/5" },
                                    { label: "Platforma Menejerlari & Agentlari", value: allUsers.length, color: "text-blue-400", bg: "from-blue-500/10 to-blue-500/5" },
                                ].map((s,i) => (
                                    <div key={i} className={`bg-gradient-to-br ${s.bg} border border-slate-200 rounded-2xl p-5`}>
                                        <p className="text-xs text-slate-400 mb-2 font-medium">{s.label}</p>
                                        <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                                <div className="flex-1 min-w-0 sm:min-w-[240px] relative">
                                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input type="text" placeholder="Ism yoki telefon..." value={userSearch} onChange={(e)=>setUserSearch(e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500/50" />
                                </div>
                                <select value={userRoleFilter} onChange={(e)=>setUserRoleFilter(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50">
                                    <option value="all">Barcha rollar</option>
                                    <option value="Menejer">Menejerlar</option>
                                    <option value="Agent">Agentlar</option>
                                    <option value="Support">Texnik Yordam (Support)</option>
                                    <option value="Moliyachi">Moliyachi (Buxgalter)</option>
                                </select>
                                {canCreateUsers && (
                                    <button onClick={()=>{setUserFormData({id:"",name:"",phone:"+998",password:"",role:"Menejer",agentCode:"",permissions:[]}); setShowAddUserModal(true);}} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl hover:shadow-glow transition-all text-sm font-semibold">
                                        <Plus size={15} /> Qo&apos;shish
                                    </button>
                                )}
                                <button onClick={()=>refetchUsers()} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-slate-700 rounded-xl hover:bg-white/15 transition-colors text-sm font-semibold">
                                    <RefreshCw size={15} />
                                    Yangilash
                                </button>
                            </div>

                            {/* Users table */}
                            <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                                {usersLoading ? (
                                    <div className="p-12 text-center text-slate-400">Yuklanmoqda...</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-400 uppercase">
                                                    <th className="px-5 py-3">#</th>
                                                    <th className="px-5 py-3">Ism</th>
                                                    <th className="px-5 py-3">Telefon</th>
                                                    <th className="px-5 py-3">Rol</th>
                                                    <th className="px-5 py-3">Do'konlari</th>
                                                    <th className="px-5 py-3">Sana</th>
                                                    <th className="px-5 py-3">Amal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.length === 0 ? (
                                                    <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Foydalanuvchilar topilmadi</td></tr>
                                                ) : filteredUsers.map((u: any, idx: number) => (
                                                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors">
                                                        <td className="px-5 py-4 text-sm text-slate-400">{idx+1}</td>
                                                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-black shrink-0">
                                                                    {(u.name||"?").charAt(0).toUpperCase()}
                                                                </div>
                                                                {u.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-sm text-slate-600">{u.phone}</td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                                u.role==="Agent" ? "bg-orange-500/10 text-orange-400" :
                                                                "bg-blue-500/10 text-blue-400"
                                                            }`}>{u.role}</span>
                                                        </td>
                                                        <td className="px-5 py-4 text-sm">
                                                            {u.role === "Agent" ? (
                                                                <span className="font-bold text-sky-500 bg-sky-500/10 px-2 py-1 rounded-lg">
                                                                    {tenants.filter((t: any) => t.agentCode && t.agentCode === u.agentCode).length} ta do'kon
                                                                </span>
                                                            ) : "—"}
                                                        </td>
                                                        <td className="px-5 py-4 text-sm text-slate-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("uz-UZ") : "—"}</td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <div className="flex gap-2">
                                                                {canCreateUsers && <button onClick={()=>{
                                                                    setUserFormData({ id: u.id, name: u.name, phone: u.phone, password: "", role: u.role, agentCode: u.agentCode || "", permissions: u.permissions || [] });
                                                                    setShowAddUserModal(true);
                                                                }} className="p-1.5 rounded-lg hover:bg-sky-500/20 text-sky-400 transition-colors" title="Tahrirlash"><Edit2 size={15}/></button>}
                                                                {canDeleteUsers && <button onClick={()=>{ if(confirm(`${u.name}ni o'chirmoqchisiz?`)) deleteUserMutation.mutate(u.id); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="O'chirish"><Trash2 size={15}/></button>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══ BILLING TAB ══════════════════════════════════ */}
                    {activeTab === "billing" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: "Umumiy oylik", value: `${fmtMoney(totalRevenue)} UZS`, color: "text-green-400", bg: "from-green-500/10 to-green-500/5" },
                                    { label: "Faol to'lovlar", value: billingRows.filter((b:any)=>b.paymentStatus==="paid").length, color: "text-blue-400", bg: "from-blue-500/10 to-blue-500/5" },
                                    { label: "Sinov", value: billingRows.filter((b:any)=>b.paymentStatus==="trial").length, color: "text-yellow-400", bg: "from-yellow-500/10 to-yellow-500/5" },
                                    { label: "Muddati o'tgan", value: billingRows.filter((b:any)=>b.paymentStatus==="overdue").length, color: "text-red-400", bg: "from-red-500/10 to-red-500/5" },
                                ].map((s,i) => (
                                    <div key={i} className={`bg-gradient-to-br ${s.bg} border border-slate-200 rounded-2xl p-5`}>
                                        <p className="text-xs text-slate-400 mb-2 font-medium">{s.label}</p>
                                        <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Toolbar */}
                            <div className="flex gap-3 flex-wrap">
                                <div className="flex-1 min-w-[240px] relative">
                                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input type="text" placeholder="Tashkilot nomi yoki kodi..." value={billingSearch} onChange={(e)=>setBillingSearch(e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500/50" />
                                </div>
                                <select value={billingStatusFilter} onChange={(e)=>setBillingStatusFilter(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500/50">
                                    <option value="all">Barcha holatlar</option>
                                    <option value="paid">To'langan</option>
                                    <option value="trial">Sinov</option>
                                    <option value="overdue">Muddati o'tgan</option>
                                </select>
                                <button onClick={()=>refetchBilling()} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-slate-700 rounded-xl hover:bg-white/15 transition-colors text-sm font-semibold">
                                    <RefreshCw size={15} />
                                    Yangilash
                                </button>
                            </div>

                            {/* Billing table */}
                            <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                                {billingLoading ? (
                                    <div className="p-12 text-center text-slate-400">Yuklanmoqda...</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-400 uppercase">
                                                    <th className="px-5 py-3">#</th>
                                                    <th className="px-5 py-3">Tashkilot</th>
                                                    <th className="px-5 py-3">Billing ID</th>
                                                    <th className="px-5 py-3">Tarif</th>
                                                    <th className="px-5 py-3">Oylik to'lov</th>
                                                    <th className="px-5 py-3">Tugash sanasi</th>
                                                    <th className="px-5 py-3">Holat</th>
                                                    <th className="px-5 py-3">Uzaytirish</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredBilling.length === 0 ? (
                                                    <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Ma'lumot topilmadi</td></tr>
                                                ) : filteredBilling.map((b: any, idx: number) => (
                                                    <tr key={b.tenantId} className="border-b border-slate-100 hover:bg-slate-100 transition-colors">
                                                        <td className="px-5 py-4 text-sm text-slate-400">{idx+1}</td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <div className="font-semibold text-slate-800">{b.shopName}</div>
                                                            <div className="text-xs text-sky-400">{b.shopCode}</div>
                                                        </td>
                                                        <td className="px-5 py-4 text-xl font-black text-brand tracking-wider">
                                                            {b.billingId || "—"}
                                                        </td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PLANS[b.plan as keyof typeof PLANS]?.color||""}`}>{PLANS[b.plan as keyof typeof PLANS]?.label||b.plan}</span>
                                                        </td>
                                                        <td className="px-5 py-4 text-sm font-bold text-emerald-400">
                                                            {b.monthlyPrice > 0 ? `${fmtMoney(b.monthlyPrice)} UZS` : <span className="text-slate-400">Bepul</span>}
                                                        </td>
                                                        <td className="px-5 py-4 text-sm">
                                                            {b.expiresAt ? (
                                                                <div>
                                                                    <div className={`font-semibold ${b.daysLeft !== null && b.daysLeft <= 7 ? "text-red-400" : b.daysLeft !== null && b.daysLeft <= 14 ? "text-yellow-400" : "text-slate-700"}`}>
                                                                        {new Date(b.expiresAt).toLocaleDateString("uz-UZ")}
                                                                    </div>
                                                                    <div className="text-xs mt-0.5">
                                                                        {b.daysLeft !== null && b.daysLeft >= 0
                                                                            ? <span className="text-slate-400">{b.daysLeft} kun qoldi</span>
                                                                            : <span className="text-red-400 font-bold">{Math.abs(b.daysLeft ?? 0)} kun o'tdi</span>
                                                                        }
                                                                    </div>
                                                                </div>
                                                            ) : <span className="text-slate-400">—</span>}
                                                        </td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit ${STATUS_COLORS[b.paymentStatus]||""}`}>
                                                                {b.paymentStatus === "paid" && <CheckCircle2 size={12}/>}
                                                                {b.paymentStatus === "trial" && <Clock size={12}/>}
                                                                {b.paymentStatus === "overdue" && <AlertCircle size={12}/>}
                                                                {STATUS_LABELS[b.paymentStatus]||b.paymentStatus}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-sm">
                                                            <button
                                                                onClick={() => setExtendModal({ tenantId: b.tenantId, shopName: b.shopName, plan: b.plan, monthlyPrice: b.monthlyPrice })}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 transition-colors border border-emerald-500/20 flex items-center gap-1"
                                                            >
                                                                <CreditCard size={12}/> Uzaytirish
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}

                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── ADD/EDIT TENANT MODAL ─────────────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Building2 size={22} className="text-sky-400" />
                                {editingTenant ? "Tashkilotni tahrirlash" : "Yangi tashkilot qo'shish"}
                            </h2>
                            <button onClick={()=>setShowAddModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Section 1 */}
                            <section>
                                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Building2 size={16}/>Asosiy ma&apos;lumotlar</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className={labelClass}>Tashkilot nomi *</label><input type="text" value={formData.shopName} onChange={(e)=>f("shopName",e.target.value)} className={inputClass} placeholder="Tashkilot nomi"/></div>
                                    <div><label className={labelClass}>Egasi *</label><input type="text" value={formData.ownerName} onChange={(e)=>f("ownerName",e.target.value)} className={inputClass} placeholder="Egasi ismi"/></div>

                                    <div><label className={labelClass}>Telefon * <span className="text-sky-400 font-normal">(login sifatida)</span></label><input type="text" value={formData.phone} onChange={(e)=>f("phone",e.target.value)} className={inputClass} placeholder="+998901234567"/></div>
                                    {!editingTenant && <div><label className={labelClass}>Admin paroli *</label><input type="password" value={formData.adminPassword} onChange={(e)=>f("adminPassword",e.target.value)} className={inputClass} placeholder="Kamida 6 ta belgi" autoComplete="new-password"/></div>}

                                    <div><label className={labelClass}>Tarif narxi (UZS)</label><input type="number" value={formData.settings.tariffPrice||""} onChange={(e)=>fs("tariffPrice",+e.target.value)} className={inputClass} placeholder="0"/></div>
                                    <div><label className={labelClass}>Holati</label>
                                        <select value={formData.status} onChange={(e)=>f("status",e.target.value)} className={inputClass}>
                                            <option value="active">Faol</option>
                                            <option value="trial">Sinov</option>
                                            <option value="suspended">To&apos;xtatilgan</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Subscription Days */}
                                <div className="mt-4">
                                    <label className={labelClass}>Obuna muddati (kun) <span className="text-sky-400 font-normal">— to'lov muddati</span></label>
                                    <div className="flex items-center gap-3 mt-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={formData.settings.subscriptionDays ?? 30}
                                            onChange={(e) => fs("subscriptionDays", Math.max(1, +e.target.value))}
                                            className={`${inputClass} w-36 text-center text-2xl font-black text-sky-300`}
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">kun obuna</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                To'lov sanasidan {formData.settings.subscriptionDays ?? 30} kun o'tgach — akk <span className="text-red-400 font-bold">bloklashga tushadi</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 2: Sozlamalar */}
                            <section>
                                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Settings size={16}/>Sozlamalar</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        { key:"useWarehouse", label:"Ombor boshqaruvi", desc:"Mahsulot kirim-chiqimini boshqarish" },
                                        { key:"useLoyalty", label:"Chegirma tizimi", desc:"Mijozlarga chegirma va bonuslar" },
                                        { key:"useMultiBranch", label:"Ko'p filiallik", desc:"Bir nechta filiallarni boshqarish" },
                                        { key:"useCRM", label:"CRM tizimi", desc:"Mijozlarni boshqarish" },
                                        { key:"useAnalytics", label:"Analitika", desc:"Sotuv va moliya tahlili" },
                                    ].map(item=>(
                                        <div key={item.key} onClick={() => fs(item.key, !(formData.settings as any)[item.key])} 
                                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer group hover:-translate-y-0.5
                                            ${(formData.settings as any)[item.key] 
                                                ? "bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border-sky-500/30 shadow-[0_4px_20px_rgba(168,85,247,0.15)]" 
                                                : "bg-slate-50 border-slate-200 hover:bg-slate-800/60 hover:border-slate-600 hover:shadow-lg"}`}
                                        >
                                            <div className={`mt-0.5 w-11 h-6 rounded-full relative transition-all duration-300 flex-shrink-0
                                                 ${(formData.settings as any)[item.key] 
                                                     ? "bg-gradient-to-r from-sky-500 to-indigo-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]" 
                                                     : "bg-slate-200 group-hover:bg-slate-600 transition-colors"}`}>
                                                <div className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 transform 
                                                    ${(formData.settings as any)[item.key] ? "translate-x-[22px]" : "translate-x-[2px]"}`}/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[13px] font-bold transition-colors mb-1
                                                    ${(formData.settings as any)[item.key] ? "text-sky-300" : "text-slate-700 group-hover:text-white"}`}>
                                                    {item.label}
                                                </p>
                                                <p className={`text-[11px] leading-relaxed transition-colors
                                                    ${(formData.settings as any)[item.key] ? "text-sky-200/60" : "text-slate-400 group-hover:text-slate-600"}`}>
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Section 3: Qo'shimcha sozlamalar */}
                            <section>
                                <button type="button" onClick={() => setShowExtra(v => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-bold text-slate-600">
                                    <span className="flex items-center gap-2">
                                        <Settings size={15}/> Qo&apos;shimcha sozlamalar
                                    </span>
                                    <span className="text-slate-400">{showExtra ? "▲" : "▼"}</span>
                                </button>
                                {showExtra && (
                                    <div className="mt-4 space-y-5">
                                        {/* Address */}
                                        <div><label className={labelClass}>Manzil</label>
                                            <input type="text" value={formData.address} onChange={(e) => f("address", e.target.value)} className={inputClass} placeholder="Shahar, ko'cha, uy raqami"/>
                                        </div>

                                        {/* Location */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div><label className={labelClass}>Mamlakat</label>
                                                <input type="text" value={formData.settings.country} onChange={(e) => fs("country", e.target.value)} className={inputClass} placeholder="Uzbekiston"/>
                                            </div>
                                            <div><label className={labelClass}>Viloyat</label>
                                                <input type="text" value={formData.settings.region} onChange={(e) => fs("region", e.target.value)} className={inputClass} placeholder="Toshkent"/>
                                            </div>
                                            <div><label className={labelClass}>Shahar</label>
                                                <input type="text" value={formData.settings.city} onChange={(e) => fs("city", e.target.value)} className={inputClass} placeholder="Chilonzor"/>
                                            </div>
                                        </div>

                                        {/* Work days */}
                                        <div>
                                            <label className={labelClass}>Ish kunlari</label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {[{k:"mon",l:"Du"},{k:"tue",l:"Se"},{k:"wed",l:"Ch"},{k:"thu",l:"Pa"},{k:"fri",l:"Ju"},{k:"sat",l:"Sha"},{k:"sun",l:"Ya"}].map(d => (
                                                    <button key={d.k} type="button" onClick={() => toggleWorkDay(d.k)}
                                                        className={`w-10 h-10 rounded-xl text-xs font-bold transition-colors ${formData.settings.workDays.includes(d.k) ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                                        {d.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Telegram group ID */}
                                        <div><label className={labelClass}>Telegram guruh ID <span className="text-sky-400 font-normal">(bildirishnomalar uchun)</span></label>
                                            <input type="text" value={formData.settings.telegramGroupId} onChange={(e) => fs("telegramGroupId", e.target.value)} className={inputClass} placeholder="-1001234567890"/>
                                        </div>

                                        {/* Contacts */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className={labelClass}>Kontakt raqamlar</label>
                                                <button type="button" onClick={addContact}
                                                    className="text-xs font-bold text-sky-500 hover:text-sky-700">+ Qo&apos;shish</button>
                                            </div>
                                            <div className="space-y-2">
                                                {formData.settings.contacts.map((c: any, i: number) => (
                                                    <div key={i} className="flex gap-2">
                                                        <select value={c.type} onChange={(e) => updateContact(i, "type", e.target.value)} className={`${inputClass} w-28 shrink-0`}>
                                                            <option value="phone">Telefon</option>
                                                            <option value="email">Email</option>
                                                            <option value="telegram">Telegram</option>
                                                        </select>
                                                        <input type="text" value={c.value} onChange={(e) => updateContact(i, "value", e.target.value)} className={`${inputClass} flex-1`} placeholder={c.type === "email" ? "email@example.com" : "+998901234567"}/>
                                                        <button type="button" onClick={() => removeContact(i)} className="px-3 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">✕</button>
                                                    </div>
                                                ))}
                                                {formData.settings.contacts.length === 0 && <p className="text-xs text-slate-400 italic">Kontakt qo&apos;shilmagan</p>}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div><label className={labelClass}>Tavsif</label>
                                            <textarea value={formData.settings.description} onChange={(e) => fs("description", e.target.value)} className={`${inputClass} resize-none`} rows={2} placeholder="Qo'shimcha ma'lumot..."/>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Soliq integratsiyasi (O'zbekiston Virtual Kassa) */}
                                     <div className={`p-5 rounded-2xl border transition-all duration-300 ${(formData.settings as any).taxEnabled ? "bg-emerald-500/5 border-emerald-500/30" : "bg-slate-50 border-slate-200"}`}>
                                         <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className={`text-[13px] font-bold ${(formData.settings as any).taxEnabled ? "text-emerald-500" : "text-slate-700"}`}>Soliq (OFD) Integratsiyasi</h4>
                                                <p className="text-[11px] text-slate-400 mt-0.5">O'zbekiston Elektron Soliq / Virtual Kassa</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fs("taxEnabled", !(formData.settings as any).taxEnabled)}
                                                className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${(formData.settings as any).taxEnabled ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-slate-300"}`}
                                            >
                                                <div className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 transform ${(formData.settings as any).taxEnabled ? "translate-x-[22px]" : "translate-x-[2px]"}`}/>
                                            </button>
                                         </div>
                                         {(formData.settings as any).taxEnabled && (
                                            <div className="space-y-3 mt-4 pt-4 border-t border-emerald-500/20">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">RoHM (Registratsiya raqami)</label>
                                                        <input type="text" value={(formData.settings as any).taxRohm || ""} onChange={(e) => fs("taxRohm", e.target.value.toUpperCase())} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs uppercase" placeholder="UZ1234567890" maxLength={15} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">FM (Fiskal Modul)</label>
                                                        <input type="text" value={(formData.settings as any).taxFm || ""} onChange={(e) => fs("taxFm", e.target.value.toUpperCase())} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs uppercase" placeholder="UZ5000000001" maxLength={15} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">STIR / INN</label>
                                                        <input type="text" value={(formData.settings as any).taxInn || ""} onChange={(e) => fs("taxInn", e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" placeholder="305123456" maxLength={9}/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">OFD Token (Kalit) <span className="text-amber-500 font-normal">(ko'rinmaydi)</span></label>
                                                        <input type="password" value={(formData.settings as any).taxToken || ""} onChange={(e) => fs("taxToken", e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" placeholder="Kalit qatorini kiriting..." autoComplete="new-password" />
                                                    </div>
                                                </div>
                                            </div>
                                         )}
                                     </div>
                                </div>
                                <div className="border-t border-slate-200 p-6 bg-slate-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Bekor qilish</button>
                                    <button type="button" onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-sky-500 to-indigo-500 text-white hover:opacity-90 transition-opacity flex items-center gap-2">
                                        {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                                    </button>
                                </div>
                            </div>
                        </div>
            )}

            {/* ══ SETTINGS TAB ══════════════════════════════════ */}
            {activeTab === "settings" && (
                <div className="max-w-3xl space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                                <Settings size={20} className="text-sky-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Xizmat va API sozlamalari</h3>
                                <p className="text-sm text-slate-400">Butun tizim uchun umumiy kalitlar va integratsiyalar</p>
                            </div>
                        </div>

                        {settingsLoading ? (
                            <div className="py-8 text-center text-slate-400">Yuklanmoqda...</div>
                        ) : (
                            <div className="space-y-6">
                                {/* Tex yordam */}
                                <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                                        Texnik yordam bot integratsiyasi (Telegram)
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelClass}>Bot Token (Faqat raqam va harf)</label>
                                            <input 
                                                type="text" 
                                                value={settingsFormData.supportBotToken} 
                                                onChange={(e) => setSettingsFormData(p => ({ ...p, supportBotToken: e.target.value.trim() }))}
                                                className={inputClass} 
                                                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" 
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Chat ID (Lichka yoki Guruh raqami)</label>
                                            <input 
                                                type="text" 
                                                value={settingsFormData.supportChatId} 
                                                onChange={(e) => setSettingsFormData(p => ({ ...p, supportChatId: e.target.value.trim() }))}
                                                className={inputClass} 
                                                placeholder="-1001234567" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                 <div className="pt-4 border-t border-slate-200 flex">
                                    <button 
                                        onClick={() => updateSettingsMutation.mutate({ settings: settingsFormData })} 
                                        disabled={updateSettingsMutation.isPending}
                                        className="px-6 py-2.5 rounded-xl text-white font-bold bg-gradient-to-r from-sky-500 to-indigo-500 shadow-md hover:opacity-90 disabled:opacity-50"
                                    >
                                        {updateSettingsMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM ──────────────────────────────────── */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold mb-2">O&apos;chirishni tasdiqlash</h3>
                        <p className="text-slate-400 mb-6">Haqiqatdan ham bu do&apos;konni o&apos;chirmoqchisiz? Bu amalni ortga qaytarish mumkin emas.</p>
                        <div className="flex gap-3">
                            <button onClick={()=>deleteMutation.mutate(confirmDeleteId)} disabled={deleteMutation.isPending} className="flex-1 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors font-bold disabled:opacity-50">
                                {deleteMutation.isPending?"O'chirilmoqda...":"O'chirish"}
                            </button>
                            <button onClick={()=>setConfirmDeleteId(null)} className="flex-1 px-4 py-2.5 bg-white/10 text-slate-800 rounded-xl hover:bg-white/20 transition-colors font-bold">Bekor qilish</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADD USER MODAL ────────────────────────────────────── */}
            {showAddUserModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Yangi foydalanuvchi qo&apos;shish</h3>
                            <button onClick={()=>setShowAddUserModal(false)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"><X size={18}/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Ism F.I.Sh</label>
                                <input type="text" value={userFormData.name} onChange={(e)=>setUserFormData({...userFormData, name: e.target.value})} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500/50" placeholder="Eldorbek" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Telefon</label>
                                <PhoneInput value={userFormData.phone} onChange={(val)=>setUserFormData({...userFormData, phone: val})} className="w-full bg-slate-100 border border-slate-200 rounded-xl focus-within:border-sky-500/50 text-slate-800" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Parol <span className="text-slate-400 font-normal normal-case">(kirish uchun maxfiy so'z)</span></label>
                                <input type="password" value={userFormData.password} onChange={(e)=>setUserFormData({...userFormData, password: e.target.value})} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500/50" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Rol</label>
                                <select value={userFormData.role} onChange={(e)=>setUserFormData({...userFormData, role: e.target.value})} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500/50">
                                    <option value="Menejer">Menejer</option>
                                    <option value="Agent">Agent</option>
                                    <option value="Support">Texnik Yordam</option>
                                    <option value="Moliyachi">Moliyachi</option>
                                </select>
                            </div>
                            {userFormData.role === "Agent" && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Agent Kodi <span className="text-amber-400">(majburiy)</span></label>
                                    <input
                                        type="text"
                                        value={userFormData.agentCode}
                                        onChange={(e) => setUserFormData({...userFormData, agentCode: e.target.value.toUpperCase().trim()})}
                                        className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-sm font-mono uppercase text-amber-300 focus:outline-none focus:border-amber-500/60"
                                        placeholder="AGT-001"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-2">Maxsus huquqlar {userFormData.role==="Menejer"?"(avtomatik barcha huquqlar berilishi ko'zda tutilgan)":"(Ruxsatnomalar)"}</label>
                                <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {PERMISSIONS_LIST.map((group, gIdx) => (
                                        <div key={gIdx} className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                                                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{group.category}</span>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {group.permissions.map(perm => {
                                                    const isChecked = userFormData.permissions.includes(perm.id);
                                                    return (
                                                        <label key={perm.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
                                                            <input type="checkbox" checked={isChecked} onChange={() => {
                                                                const p = userFormData.permissions;
                                                                setUserFormData({...userFormData, permissions: p.includes(perm.id) ? p.filter(x=>x!==perm.id) : [...p, perm.id]});
                                                            }} className="accent-sky-500 w-4 h-4 rounded bg-white/10 border-white/20"/>
                                                            <span className="text-sm font-medium text-slate-600">{perm.label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {(createUserMutation.isError || updateUserMutation.isError) && <div className="text-red-400 text-xs">{(createUserMutation.error || updateUserMutation.error)?.message}</div>}
                            <button onClick={()=> {
                                if (userFormData.id) {
                                    updateUserMutation.mutate(userFormData);
                                } else {
                                    createUserMutation.mutate(userFormData);
                                }
                            }} disabled={createUserMutation.isPending || updateUserMutation.isPending} className="w-full mt-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white py-2.5 rounded-xl font-bold hover:shadow-glow transition-all disabled:opacity-50">
                                {createUserMutation.isPending || updateUserMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── EXTEND SUBSCRIPTION MODAL ───────────────────────────── */}
            {extendModal && (() => {
                const plan = PLANS[extendModal.plan as keyof typeof PLANS];
                const monthlyAmt = extendModal.monthlyPrice || plan?.amount || 0;
                const yearlyAmt = plan?.yearlyAmount ?? Math.round(monthlyAmt * 0.8);
                const unitPrice = extendPeriod === "yearly" ? yearlyAmt : monthlyAmt;
                const totalDays = extendMonths * 30;
                const totalPrice = unitPrice * extendMonths;
                const savingsPerMonth = monthlyAmt - yearlyAmt;
                const totalSavings = savingsPerMonth * extendMonths;
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl">
                            {/* Header */}
                            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <CreditCard size={20} className="text-emerald-500"/>
                                    Obunani uzaytirish
                                </h2>
                                <button onClick={() => setExtendModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"><X size={18}/></button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Shop info */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="font-bold text-slate-800">{extendModal.shopName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${plan?.color||"bg-slate-100 text-slate-600"}`}>{plan?.label || extendModal.plan}</span>
                                        <span className="text-xs text-slate-400">• Joriy narx: {monthlyAmt > 0 ? `${fmtMoney(monthlyAmt)} UZS/oy` : "Bepul"}</span>
                                    </div>
                                </div>

                                {/* Period toggle */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">To'lov davri</label>
                                    <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                                        <button
                                            onClick={() => setExtendPeriod("monthly")}
                                            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${extendPeriod === "monthly" ? "bg-sky-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                                        >
                                            Oylik
                                        </button>
                                        <button
                                            onClick={() => setExtendPeriod("yearly")}
                                            className={`flex-1 py-2.5 text-sm font-bold transition-colors relative ${extendPeriod === "yearly" ? "bg-emerald-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                                        >
                                            Yillik
                                            {monthlyAmt > 0 && <span className={`ml-1.5 text-xs font-black ${extendPeriod === "yearly" ? "text-emerald-100" : "text-emerald-500"}`}>–20%</span>}
                                        </button>
                                    </div>
                                    {extendPeriod === "yearly" && monthlyAmt > 0 && (
                                        <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                                            Yillik to'lovda {fmtMoney(savingsPerMonth)} UZS/oy tejaysiz
                                        </p>
                                    )}
                                </div>

                                {/* Months selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Necha oy uzaytirish</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {[1, 2, 3, 6, 12].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setExtendMonths(m)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${extendMonths === m ? "bg-sky-500 text-white border-sky-500" : "bg-white border-slate-200 text-slate-600 hover:border-sky-400 hover:text-sky-500"}`}
                                            >
                                                {m} oy
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price breakdown */}
                                {monthlyAmt > 0 && (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">{extendPeriod === "yearly" ? "Yillik narx" : "Oylik narx"} × {extendMonths} oy</span>
                                            <span className="font-semibold text-slate-700">{fmtMoney(unitPrice)} × {extendMonths}</span>
                                        </div>
                                        {extendPeriod === "yearly" && (
                                            <div className="flex justify-between text-sm text-emerald-600">
                                                <span>Tejamkorlik</span>
                                                <span className="font-bold">–{fmtMoney(totalSavings)} UZS</span>
                                            </div>
                                        )}
                                        <div className="border-t border-slate-200 pt-2 flex justify-between">
                                            <span className="font-bold text-slate-700">Jami to'lov</span>
                                            <span className="text-lg font-black text-emerald-500">{fmtMoney(totalPrice)} UZS</span>
                                        </div>
                                        <div className="text-xs text-slate-400 text-right">30 kun × {extendMonths} oy = +{totalDays} kun</div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-slate-200 flex gap-3 justify-end">
                                <button onClick={() => setExtendModal(null)} className="px-4 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                    Bekor qilish
                                </button>
                                <button
                                    onClick={() => extendMutation.mutate({ tenantId: extendModal.tenantId, days: totalDays })}
                                    disabled={extendMutation.isPending}
                                    className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-sky-500 text-white hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                                >
                                    {extendMutation.isPending ? "Saqlanmoqda..." : `+${totalDays} kun uzaytirish`}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── MY PROFILE MODAL ────────────────────────────────────── */}
            {showProfileModal && currentUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><User size={20} className="text-sky-400"/> Mening profilim</h3>
                            <button onClick={()=>setShowProfileModal(false)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"><X size={18}/></button>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
                                <div className="text-sm">
                                    <span className="text-slate-400">Ism:</span> <span className="text-slate-800 font-semibold">{currentUser.name}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-slate-400">Roli:</span> <span className="font-bold text-sky-400">{currentUser.role}</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Yangi Parol</label>
                                <input type="password" value={profileForm.password} onChange={(e)=>setProfileForm({...profileForm, password: e.target.value})} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500/50" placeholder="Ma'fiy parol..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Parolni Tasdiqlash</label>
                                <input type="password" value={profileForm.confirmPassword} onChange={(e)=>setProfileForm({...profileForm, confirmPassword: e.target.value})} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500/50" placeholder="Yana bir marta..." />
                            </div>

                            {updateUserMutation.isError && <div className="text-red-400 text-xs">{updateUserMutation.error?.message}</div>}
                            
                            <button onClick={()=>{
                                if (!profileForm.password || profileForm.password !== profileForm.confirmPassword) {
                                    alert("Parollar mos emas yoki kiritilmadi!");
                                    return;
                                }
                                updateUserMutation.mutate({ id: currentUser.id, name: currentUser.name, phone: currentUser.phone, role: currentUser.role, password: profileForm.password });
                            }} disabled={updateUserMutation.isPending} className="w-full mt-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white py-2.5 rounded-xl font-bold hover:shadow-glow transition-all disabled:opacity-50">
                                {updateUserMutation.isPending ? "Saqlanmoqda..." : "Parolni Yangilash"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
