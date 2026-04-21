"use client";

import { useState, useEffect } from "react";
import {
    Building2, Users, Shield, Database, ClipboardList,
    Globe, Check, Plus, Edit, Lock, Bell, Server, Key, X, Printer, UtensilsCrossed, Trash2, ChevronRight, ChevronDown, Settings, Eye, EyeOff, CreditCard
} from "lucide-react";
import { mockBranches } from "@/lib/mockData";
import { useLang } from "@/lib/LangContext";
import { useStore, StaffMember, ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/store";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/frontend/api";
import { useFrontendStore } from "@/lib/frontend/store";
import clsx from "clsx";
import { PhoneInput } from "@/components/ui/PhoneInput";


const MODULE_PERMS_BASE = ["pos", "inventory", "crm", "reports", "staff", "ai", "wholesale", "ecommerce"];
const ACTION_PERMS = ["discounts", "refunds", "priceEdit", "stockEdit", "reportExport", "customerEdit", "shiftManage"];

export default function SettingsPage() {
    const { t } = useLang();
    const { user } = useFrontendStore();
    const shopType = user?.tenant?.settings?.shopType || "shop";
    const MODULE_PERMS = [...MODULE_PERMS_BASE, ...(shopType !== "shop" ? [shopType] : [])];

    const { data: staffData, refetch } = useQuery({
        queryKey: ["staff"],
        queryFn: () => api.staff.list(),
    });
    const staff: StaffMember[] = (staffData as any)?.staff || [];

    const { data: auditLogData } = useQuery({
        queryKey: ["auditLog"],
        queryFn: () => api.settings.audit.list(),
    });
    const auditLog: any[] = (auditLogData as any)?.auditLog || [];

    const { data: taxData } = useQuery({
        queryKey: ["taxSetting"],
        queryFn: () => fetch("/api/settings/tax").then(r => r.json()),
    });
    const { data: settingsData, refetch: refetchSettings } = useQuery({
        queryKey: ["settings"],
        queryFn: () => api.settings.get(),
    });
    const branches = (settingsData as any)?.tenant?.settings?.branches || [];
    const shopSettings = (settingsData as any)?.tenant || null;
    const receiptSettings = (settingsData as any)?.tenant?.settings?.receiptSettings || {
        customShopName: (settingsData as any)?.tenant?.shopName || "",
        headerText: "Xaridingiz uchun rahmat!",
        footerText: "",
        showLogo: true,
        showBarcode: true,
        showCashierName: true
    };

    const updateStaffMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.staff.update(id, data),
        onSuccess: () => refetch()
    });
    const createStaffMutation = useMutation({
        mutationFn: (data: any) => api.staff.create(data),
        onSuccess: () => {
            refetch();
            setShowAddUser(false);
            setNewUser({ name: "", phone: "", username: "", password: "", role: "Kassir", branch: "Asosiy Filial", printerIp: "", status: true, isMainMonoblock: false, showCashiersList: false, hasChefPrinter: false, printOrderCancellations: false, photoBase64: null, serviceFeePct: 10 });
        }
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (newSettings: any) => api.settings.update(newSettings),
        onSuccess: () => refetchSettings()
    });

    const [activeTab, setActiveTab] = useState("branches");
    const [showAddUser, setShowAddUser] = useState(false);
    const [showAddBranch, setShowAddBranch] = useState(false);

    const [newUser, setNewUser] = useState({ name: "", phone: "", username: "", password: "", role: "Kassir", branch: "Asosiy Filial", printerIp: "", status: true, isMainMonoblock: false, showCashiersList: false, hasChefPrinter: false, printOrderCancellations: false, photoBase64: null as string | null, serviceFeePct: 10 });
    const [newBranch, setNewBranch] = useState({ name: "", city: "", manager: "" });
    const [newPayment, setNewPayment] = useState("");

    // Permissions modal state
    const [permTarget, setPermTarget] = useState<any>(null);
    const [permDraft, setPermDraft] = useState<string[]>([]);
    const [receiptDraft, setReceiptDraft] = useState<any>(null);
    const [ubtDraft, setUbtDraft] = useState<any>(null);

    // Zone & Table state
    const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
    const [zoneForm, setZoneForm] = useState({ id: "", name: "", branchId: "", serviceFee: "", extraPriceType: "Qo'shimcha narx" });
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [tableForm, setTableForm] = useState({ id: "", zoneId: "", name: "", capacity: "" });
    const [selectedZoneForModal, setSelectedZoneForModal] = useState<string | null>(null);

    // Sync receiptDraft once settings loads (use useEffect to avoid render-phase state mutations)
    useEffect(() => {
        if (settingsData && !receiptDraft) {
            const draft = { ...receiptSettings };
            // Agar customShopName saqlanmagan bo'lsa, tenant shopName ni avtomatik to'ldirish
            if (!draft.customShopName && shopSettings?.shopName) {
                draft.customShopName = shopSettings.shopName;
            }
            setReceiptDraft(draft);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsData]);

    // Sync ubtDraft
    const ubtSettings = (settingsData as any)?.tenant?.settings?.ubtSettings || {
        serviceFee: 10,
        enableKDS: true,
        enableWaiterApp: true,
        tablesCount: 20
    };
    useEffect(() => {
        if (settingsData && !ubtDraft) {
            setUbtDraft(ubtSettings);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsData]);

    function openPermissions(member: StaffMember) {
        setPermTarget(member);
        setPermDraft([...member.permissions]);
    }

    function togglePerm(key: string) {
        setPermDraft(d => d.includes(key) ? d.filter(p => p !== key) : [...d, key]);
    }

    function savePermissions() {
        if (permTarget) {
            updateStaffMutation.mutate({ id: permTarget.id, data: { permissions: permDraft } });
            setPermTarget(null);
        }
    }

    function inheritFromRole(role: string) {
        setPermDraft([...(ROLE_DEFAULT_PERMISSIONS[role] ?? [])] as string[]);
    }

    function saveReceiptSettings() {
        if (!receiptDraft) return;
        const currentSettings = (settingsData as any)?.tenant?.settings || {};
        updateSettingsMutation.mutate({
            ...currentSettings,
            receiptSettings: receiptDraft
        });
        alert("Chek sozlamalari saqlandi!");
    }

    async function saveUbtSettings() {
        if (!ubtDraft) return;
        const currentSettings = (settingsData as any)?.tenant?.settings || {};
        
        // Save settings to tenant
        updateSettingsMutation.mutate({
            ...currentSettings,
            ubtSettings: ubtDraft
        });

        // Also persist each zone's tables to DB as real UbtTable records
        const zones: any[] = ubtDraft?.zones || [];
        for (const zone of zones) {
            const tables: any[] = zone.tables || [];
            for (const table of tables) {
                // Only create if it looks like a frontend-generated ID (not a real UUID)
                if (!table.dbId) {
                    try {
                        const res = await fetch("/api/ubt/tables", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                tableNumber: table.name,
                                capacity: table.capacity || 4,
                                section: zone.name,
                            }),
                        });
                        if (res.ok) {
                            const data = await res.json();
                            // Mark as saved to DB so we don't duplicate
                            table.dbId = data.table?.id;
                        }
                    } catch {}
                }
            }
        }
        // Update draft with dbIds
        setUbtDraft({ ...ubtDraft, zones });
        alert("UBT sozlamalari saqlandi! Stollar POS terminalda ko'rinadi.");
    }

    const PERM_LABELS: Record<string, string> = {
        pos: t("staff.permPos"), inventory: t("staff.permInventory"), crm: t("staff.permCrm"),
        reports: t("staff.permReports"), staff: t("staff.permStaff"), ai: t("staff.permAi"),
        ubt: t("staff.permUbt"), pharmacy: t("staff.permPharmacy"), wholesale: t("staff.permWholesale"), ecommerce: t("staff.permEcommerce"),
        discounts: t("staff.permDiscounts"), refunds: t("staff.permRefunds"), priceEdit: t("staff.permPriceEdit"),
        stockEdit: t("staff.permStockEdit"), reportExport: t("staff.permReportExport"), customerEdit: t("staff.permCustomerEdit"), shiftManage: t("staff.permShiftManage"),
        waiterApp: "Ofitsiant paneli", deliveryApp: "Kuryer (Yetkazish)",
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t("settings.title")}</h1>
                <p className="text-sm text-slate-400 mt-1">{t("settings.subTitle")}</p>
            </div>

            <div className="flex gap-6">
                {/* Sidebar Tabs */}
                <div className="w-48 flex-shrink-0">
                    <div className="glass-card p-2 space-y-1">
                        {[
                            { key: "general", label: "Umumiy sozlamalar", icon: Settings },
                            { key: "branches", label: t("settings.branches"), icon: Building2 },
                            { key: "receipt", label: "Chek sozlamalari", icon: Printer },
                            ...(shopType === "ubt" ? [{ key: "ubt", label: "UBT sozlamalari", icon: UtensilsCrossed }] : []),
                            { key: "audit", label: t("settings.auditLog") || "Audit Jurnali", icon: ClipboardList },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                    activeTab === tab.key ? "bg-gradient-brand text-white shadow-glow" : "text-slate-400 hover:text-slate-800 hover:bg-surface-elevated"
                                )}>
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {/* General Settings */}
                    {activeTab === "general" && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h2 className="section-title">Umumiy sozlamalar</h2>
                                <button
                                    onClick={() => {
                                        const currentSettings = (settingsData as any)?.tenant?.settings || {};
                                        updateSettingsMutation.mutate({
                                            ...currentSettings,
                                            dayRefreshTime: currentSettings.dayRefreshTime || "00:00" // Already updated via onChange, just saving
                                        });
                                        alert("Saqlandi!");
                                    }}
                                    className="btn-primary flex items-center gap-2">
                                    <Settings size={16} /> Saqlash
                                </button>
                            </div>

                            <div className="glass-card p-6 max-w-lg space-y-4">
                                <label className="block text-sm font-semibold text-slate-200">
                                    Kun yangilanish vaqti (Day Refresh Time)
                                </label>
                                <p className="text-xs text-slate-400 mb-2">
                                    Tungi bizneslar uchun "bugungi kun" qaysi vaqtdan boshlanishini yozing (Masalan: 05:00).
                                    Bu savdo statistikasi va davomat uchun ishlatiladi.
                                </p>
                                <input
                                    type="time"
                                    className="input-field max-w-[150px]"
                                    value={((settingsData as any)?.tenant?.settings?.dayRefreshTime) || "00:00"}
                                    onChange={(e) => {
                                        updateSettingsMutation.mutate({
                                            ...((settingsData as any)?.tenant?.settings || {}),
                                            dayRefreshTime: e.target.value
                                        });
                                    }}
                                />

                                <div className="mt-6 pt-4 border-t border-slate-700/50">
                                    <label className="block text-sm font-semibold text-slate-200">
                                        Bekor qilish (Otmen) paroli
                                    </label>
                                    <p className="text-xs text-slate-400 mb-2">
                                        Xodimlar buyurtmani yoki ichidagi biror taomni o'chirmoqchi bo'lishganda so'raladigan tasdiqlash kodi. Masalan: 1234. Agar bo'sh qoldirilsa tizim parol so'ramaydi.
                                    </p>
                                    <input
                                        type="text"
                                        maxLength={10}
                                        placeholder="Kodni kiriting..."
                                        className="input-field max-w-[200px]"
                                        value={((settingsData as any)?.tenant?.settings?.cancelCode) || ""}
                                        onChange={(e) => {
                                            updateSettingsMutation.mutate({
                                                ...((settingsData as any)?.tenant?.settings || {}),
                                                cancelCode: e.target.value
                                            });
                                        }}
                                    />
                                </div>

                                {/* Payment Methods Section */}
                                <div className="mt-6 pt-4 border-t border-slate-700/50">
                                    <label className="block text-sm font-semibold text-slate-200">
                                        Qo'shimcha to'lov turlari (To'lov oynasi uchun)
                                    </label>
                                    <p className="text-xs text-slate-400 mb-3">
                                        Naqd, Karta va QR to'lovlardan tashqari o'z to'lov turlaringizni ro'yxatdan o'tkazing (Masalan: Uzum, Click, Payme).
                                    </p>
                                    
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Yangi to'lov turi nomi..."
                                            className="input-field flex-1"
                                            value={newPayment}
                                            onChange={(e) => setNewPayment(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter" && newPayment.trim()) {
                                                    const current = ((settingsData as any)?.tenant?.settings?.paymentMethods) || [];
                                                    updateSettingsMutation.mutate({
                                                        ...((settingsData as any)?.tenant?.settings || {}),
                                                        paymentMethods: [...current, { id: Date.now().toString(), name: newPayment.trim() }]
                                                    });
                                                    setNewPayment("");
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                if (!newPayment.trim()) return;
                                                const current = ((settingsData as any)?.tenant?.settings?.paymentMethods) || [];
                                                updateSettingsMutation.mutate({
                                                    ...((settingsData as any)?.tenant?.settings || {}),
                                                    paymentMethods: [...current, { id: Date.now().toString(), name: newPayment.trim() }]
                                                });
                                                setNewPayment("");
                                            }}
                                            className="btn-primary whitespace-nowrap"
                                        >
                                            <Plus size={16} /> Qo'shish
                                        </button>
                                    </div>
                                    
                                    <div className="mt-4 flex flex-col gap-2">
                                        {(((settingsData as any)?.tenant?.settings?.paymentMethods) || []).map((method: any) => (
                                            <div key={method.id} className="flex flex-row items-center justify-between p-3 rounded-xl border border-slate-600 bg-surface-elevated">
                                                <div className="flex items-center gap-3">
                                                    <CreditCard size={18} className="text-brand" />
                                                    <span className="text-sm font-bold text-slate-200">{method.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const current = ((settingsData as any)?.tenant?.settings?.paymentMethods) || [];
                                                        updateSettingsMutation.mutate({
                                                            ...((settingsData as any)?.tenant?.settings || {}),
                                                            paymentMethods: current.filter((m: any) => m.id !== method.id)
                                                        });
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                            {/* Soliq Integratsiyasi Section */}
                            {(!shopSettings?.agentCode) && (
                                <div className="glass-card p-6 max-w-lg space-y-4">
                                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                        🧾 Soliq Integratsiyasi
                                    </h3>
                                    {(taxData as any)?.isActive ? (
                                        <div className="space-y-4 animate-fade-in border border-emerald-500/20 rounded-xl p-5 bg-emerald-500/5">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                    <span className="text-emerald-400">✅</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-emerald-400">Uzbekistan Virtual Kassa</p>
                                                    <p className="text-xs text-slate-400">Soliq/OFD serveriga faol ulanish</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <p className="text-xs text-slate-500 mb-1">RoHM raqami</p>
                                                    <p className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
                                                        {(() => {
                                                            const r = (taxData as any)?.taxRohm;
                                                            if (!r) return "KIRITILMAGAN";
                                                            return r.length > 5 ? `${r.slice(0,2)}****${r.slice(-4)}` : r;
                                                        })()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 mb-1">Fiskal Modul (FM)</p>
                                                    <p className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
                                                        {(() => {
                                                            const f = (taxData as any)?.taxFm;
                                                            if (!f) return "KIRITILMAGAN";
                                                            return f.length > 5 ? `${f.slice(0,2)}****${f.slice(-4)}` : f;
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-emerald-300/70 mt-3 pt-3 border-t border-emerald-500/20">
                                                * Tashkilotingiz STIR ({(taxData as any)?.taxInn || "N/A"}) va maxfiy API kalitlar xavfsizlik maqsadida ushbu ekranda to'liq ko'rsatilmaydi.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-5 border border-slate-700 rounded-xl bg-slate-800/50 flex flex-col items-center justify-center text-center space-y-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center text-xl">
                                                🔒
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-300">Integratsiya o'chirilgan</p>
                                                <p className="text-xs text-slate-400 mt-1">Virtual Kassa hozircha o'chirilgan yoki Super Admin tomonidan sozlanmagan.</p>
                                            </div>
                                            <p className="text-[10px] text-brand font-medium mt-2">
                                                OFD ga ulash uchun Super Admindan yordam so'rang yoki litsenziya talab qiling.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                    {/* Branches */}
                    {activeTab === "branches" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="section-title">{t("settings.branchManagement")}</h2>
                                <button onClick={() => setShowAddBranch(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> {t("settings.addBranch")}</button>
                            </div>

                            {showAddBranch && (
                                <div className="glass-card p-5 space-y-4 animate-slide-up border border-brand/30">
                                    <h3 className="font-semibold text-slate-800">Yangi filial qo'shish</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400">Filial nomi</label>
                                            <input value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} className="input-field w-full" placeholder="Masalan: Chilonzor filial" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400">Shahar/Tuman</label>
                                            <input value={newBranch.city} onChange={e => setNewBranch({ ...newBranch, city: e.target.value })} className="input-field w-full" placeholder="Toshkent" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400">Menejer</label>
                                            <input value={newBranch.manager} onChange={e => setNewBranch({ ...newBranch, manager: e.target.value })} className="input-field w-full" placeholder="Menejer ismini kiriting" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button onClick={() => setShowAddBranch(false)} className="btn-secondary">Bekor qilish</button>
                                        <button onClick={() => {
                                            if (!newBranch.name) return;
                                            const currentSettings = (settingsData as any)?.tenant?.settings || {};
                                            const updatedBranches = [...(currentSettings.branches || []), { ...newBranch, id: `B-${Date.now()}` }];
                                            updateSettingsMutation.mutate({ ...currentSettings, branches: updatedBranches });
                                            setShowAddBranch(false);
                                            setNewBranch({ name: "", city: "", manager: "" });
                                        }} className="btn-primary">Saqlash</button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {branches.length === 0 && <p className="text-slate-500 text-sm">Filiallar topilmadi.</p>}
                                {branches.map((b: any) => (
                                    <div key={b.id} className="glass-card p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold">
                                                <Building2 size={18} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{b.name}</p>
                                                <p className="text-sm text-slate-400">{b.city} · Menejer: {b.manager}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="badge badge-green">{t("common.active")}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Users */}
                    {activeTab === "users" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="section-title">{t("settings.users")}</h2>
                                <div className="flex gap-2">
                                    <button onClick={() => { setNewUser({ ...newUser, role: "Manablog" }); setShowAddUser(true); }} className="btn-secondary flex items-center gap-2 border-brand/50 text-brand hover:bg-brand/10"><Plus size={16} /> Manablog qo&apos;shish</button>
                                    <button onClick={() => { setNewUser({ ...newUser, role: "Kassir" }); setShowAddUser(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> {t("settings.addUser")}</button>
                                </div>
                            </div>

                            {showAddUser && (
                                <div className="glass-card p-5 space-y-4 animate-slide-up border border-brand/30">
                                    <h3 className="font-semibold text-slate-800">{newUser.role === "Manablog" ? "Yangi Manablog (POS Apparat) qo'shish" : "Yangi xodim qo'shish"}</h3>
                                    
                                    {newUser.role === "Manablog" ? (
                                        // MANABLOG LAYOUT
                                        <div className="flex flex-col gap-6">
                                            {/* Top Section - photo left, inputs right */}
                                            <div className="flex gap-6">
                                                {/* Photo Upload */}
                                                <div className="w-40 border border-slate-600 rounded-xl overflow-hidden bg-surface-elevated flex flex-col items-center justify-center cursor-pointer hover:border-brand/50 transition-colors"
                                                     onClick={() => (document.getElementById("manablog-photo") as HTMLInputElement)?.click()}
                                                >
                                                    {newUser.photoBase64 ? (
                                                        <img src={newUser.photoBase64} alt="Manablog" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="p-8 text-center text-slate-400">
                                                            <div className="w-12 h-12 bg-slate-700/50 rounded-full mx-auto mb-2 flex items-center justify-center">📷</div>
                                                            <p className="text-xs">Rasm yuklash</p>
                                                        </div>
                                                    )}
                                                    <input 
                                                        id="manablog-photo" type="file" className="hidden" accept="image/*"
                                                        onChange={e => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = ev => setNewUser({ ...newUser, photoBase64: ev.target?.result as string });
                                                            reader.readAsDataURL(file);
                                                        }}
                                                    />
                                                </div>
                                                
                                                {/* Text Inputs */}
                                                <div className="flex-1 grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-400">Ism <span className="text-red-500">*</span></label>
                                                        <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="input-field w-full" placeholder="Masalan: Asosiy Monoblok" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-400">Login <span className="text-red-500">*</span></label>
                                                        <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="input-field w-full" placeholder="pos_admin_1" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-400">Parol <span className="text-red-500">*</span></label>
                                                        <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="input-field w-full" placeholder="••••••••" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-400">Printer IP manzili <span className="text-red-500">*</span></label>
                                                        <input value={newUser.printerIp} onChange={e => setNewUser({ ...newUser, printerIp: e.target.value })} className="input-field w-full font-mono" placeholder="192.168.1.100" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Toggles and Dropdowns */}
                                            <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl border-t border-slate-700/50 pt-4">
                                                {[
                                                    { key: 'status', label: 'Status' },
                                                    { key: 'isMainMonoblock', label: 'Asosiy monoblok (Glavniy monoblok)' },
                                                    { key: 'showCashiersList', label: 'Kassirlar ro&apos;yxati (Spisok kassirov)' },
                                                    { key: 'hasChefPrinter', label: 'Oshpaz printeri (Printer povara)' },
                                                    { key: 'printOrderCancellations', label: 'Bekor qilingan buyurtma cheki (Pechat otmeni zakaza)' },
                                                ].map(toggle => (
                                                    <div key={toggle.key} className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-slate-300">{toggle.label}</span>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={(newUser as any)[toggle.key]}
                                                                onChange={e => setNewUser({ ...newUser, [toggle.key]: e.target.checked })}
                                                            />
                                                            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                                                        </label>
                                                    </div>
                                                ))}

                                                {/* Filial at bottom */}
                                                <div className="flex items-center gap-4 col-span-2 pt-2">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked disabled />
                                                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                                                    </label>
                                                    <select value={newUser.branch} onChange={e => setNewUser({ ...newUser, branch: e.target.value })} className="input-field min-w-[200px] py-1.5 h-auto text-sm">
                                                        {branches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // STANDARD EMPLOYEE LAYOUT
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400">Ism-sharifi</label>
                                                <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="input-field w-full" placeholder="Masalan: Sardor" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400">Telefon</label>
                                                <PhoneInput
                                                    value={newUser.phone}
                                                    onChange={val => setNewUser({ ...newUser, phone: val })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400">Rol</label>
                                                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="input-field w-full">
                                                    {["Kassir", "Menejer", "Omborchi", "Administrator", "Ofitsiant", "Kuryer", "Manablog"].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400">Login username</label>
                                                <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="input-field w-full" placeholder="Kassirning logini" />
                                            </div>
                                            {newUser.role === "Ofitsiant" && (
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-400">Xizmat haqqi (%)</label>
                                                    <input type="number" min="0" max="100" value={newUser.serviceFeePct} onChange={e => setNewUser({ ...newUser, serviceFeePct: Number(e.target.value) })} className="input-field w-full" placeholder="10" />
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400">Parol</label>
                                                <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="input-field w-full" placeholder="Min. 6 ta belgi" />
                                            </div>
                                            {(newUser.role === "Kassir" || newUser.role === "Administrator") && (
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-400">PINFL (14 raqam) <span className="text-emerald-400">— Soliq cheklarida ishlatiladi</span></label>
                                                    <input type="text" maxLength={14} value={(newUser as any).pinfl || ""} onChange={e => setNewUser({ ...newUser, pinfl: e.target.value.replace(/[^0-9]/g, '') } as any)} className="input-field w-full tracking-widest" placeholder="31505123456789" />
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400">Filial</label>
                                                <select value={newUser.branch} onChange={e => setNewUser({ ...newUser, branch: e.target.value })} className="input-field w-full">
                                                    {branches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button onClick={() => setShowAddUser(false)} className="btn-secondary">Bekor qilish</button>
                                        <button onClick={() => {
                                            if (!newUser.name || !newUser.username || !newUser.password) return alert("Belgilangan maydonlarni to'ldiring");
                                            
                                            // Optional: Pack the Manablog specific settings into permissions or a notes field
                                            const isManablog = newUser.role === "Manablog";
                                            const customPayload = isManablog ? {
                                                ...newUser,
                                                phone: JSON.stringify({
                                                    printerIp: newUser.printerIp,
                                                    isMainMonoblock: newUser.isMainMonoblock,
                                                    showCashiersList: newUser.showCashiersList,
                                                    hasChefPrinter: newUser.hasChefPrinter,
                                                    printOrderCancellations: newUser.printOrderCancellations,
                                                    status: newUser.status,
                                                    photoBase64: newUser.photoBase64 ? "stored" : null // Avoiding huge payloads if not fully handling base64 db strings
                                                })
                                            } : {
                                                ...newUser,
                                                staffMeta: newUser.role === "Ofitsiant" 
                                                    ? { serviceFeePct: newUser.serviceFeePct } 
                                                    : (newUser.role === "Kassir" || newUser.role === "Administrator") && (newUser as any).pinfl
                                                        ? { pinfl: (newUser as any).pinfl }
                                                        : {}  
                                            };

                                            createStaffMutation.mutate({ ...customPayload, permissions: ROLE_DEFAULT_PERMISSIONS[newUser.role] || [] });
                                        }} className="btn-primary" disabled={createStaffMutation.isPending}>{createStaffMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}</button>
                                    </div>
                                </div>
                            )}

                            <div className="glass-card overflow-hidden">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>{t("staff.employee")}</th>
                                            <th>{t("staff.role")}</th>
                                            <th>{t("staff.branch")}</th>
                                            <th>{t("staff.permissions")}</th>
                                            <th>{t("common.status")}</th>
                                            <th>{t("common.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staff.map(s => (
                                            <tr key={s.id}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold",
                                                            s.status === "online" ? "bg-gradient-success" : "bg-surface-elevated text-slate-500"
                                                        )}>{s.name[0]}</div>
                                                        <div>
                                                            <p className="font-medium text-slate-800">{s.name}</p>
                                                            <p className="text-xs text-slate-500">{s.phone}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className="badge badge-blue">{s.role}</span></td>
                                                <td className="text-slate-400">{s.branch}</td>
                                                <td>
                                                    <div className="flex flex-wrap gap-1 max-w-48">
                                                        {s.permissions.length === 0 ? (
                                                            <span className="text-xs text-slate-500">{t("staff.noPermissions")}</span>
                                                        ) : s.permissions.length >= ALL_PERMISSIONS.length ? (
                                                            <span className="badge badge-sky text-xs">Barcha ruxsatlar</span>
                                                        ) : (
                                                            <>
                                                                {s.permissions.slice(0, 3).map(p => (
                                                                    <span key={p} className="badge badge-blue text-xs">{PERM_LABELS[p] ?? p}</span>
                                                                ))}
                                                                {s.permissions.length > 3 && (
                                                                    <span className="badge badge-gray text-xs">+{s.permissions.length - 3}</span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={clsx("badge", s.status === "online" ? "badge-green" : "badge-gray")}>
                                                        {s.status === "online" ? t("common.active") : t("common.inactive")}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openPermissions(s)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-surface-elevated transition-all"
                                                            title={t("staff.editPermissions")}>
                                                            <Key size={14} />
                                                        </button>
                                                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-surface-elevated transition-all">
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm("Rostdan ham ushbu xodimni o'chirmoqchimisiz?")) {
                                                                    api.staff.delete(s.id).then(() => refetch());
                                                                }
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-surface-elevated transition-all">
                                                            <Lock size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Roles */}
                    {activeTab === "roles" && (
                        <div className="space-y-4">
                            <h2 className="section-title">{t("settings.rolesAndPermissions")} (RBAC)</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { role: "Administrator", color: "border-brand/30", badgeClass: "badge-sky" },
                                    { role: "Menejer", color: "border-sky-500/30", badgeClass: "badge-blue" },
                                    { role: "Kassir", color: "border-emerald-500/30", badgeClass: "badge-green" },
                                    { role: "Omborchi", color: "border-amber-500/30", badgeClass: "badge-yellow" },
                                    { role: "Ofitsiant", color: "border-orange-500/30", badgeClass: "badge-orange" },
                                    { role: "Kuryer", color: "border-cyan-500/30", badgeClass: "badge-cyan" },
                                    { role: "Manablog", color: "border-indigo-500/30", badgeClass: "badge-sky" },
                                ].map((r, i) => {
                                    const perms = ROLE_DEFAULT_PERMISSIONS[r.role] ?? [];
                                    const count = staff.filter(s => s.role === r.role).length;
                                    return (
                                        <div key={i} className={clsx("glass-card p-5 border", r.color)}>
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="font-bold text-slate-800">{r.role}</p>
                                                <span className={clsx("badge", r.badgeClass)}>{count} ta</span>
                                            </div>
                                            <div className="space-y-1 mb-4">
                                                {perms.slice(0, 5).map((p, j) => (
                                                    <p key={j} className="text-sm text-slate-300 flex items-center gap-2">
                                                        <Check size={13} className="text-emerald-400 flex-shrink-0" />
                                                        {PERM_LABELS[p] ?? p}
                                                    </p>
                                                ))}
                                                {perms.length > 5 && (
                                                    <p className="text-xs text-slate-500 pl-5">+{perms.length - 5} ta ruxsat</p>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500">{perms.length} / {ALL_PERMISSIONS.length} ruxsat</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}




                    {/* Receipt Settings */}
                    {activeTab === "receipt" && receiptDraft && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="section-title">Chek Konstruksiyasi</h2>
                                <button
                                    onClick={saveReceiptSettings}
                                    disabled={updateSettingsMutation.isPending}
                                    className="btn-primary flex items-center gap-2">
                                    <Printer size={16} /> Saqlash
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                {/* Settings Form */}
                                <div className="space-y-4">

                                    {/* Logo Upload Section */}
                                    <div className="glass-card p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">🖼️ Logotip (Logo)</p>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={receiptDraft.showLogo}
                                                    onChange={e => setReceiptDraft({ ...receiptDraft, showLogo: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                                            </label>
                                        </div>
                                        <div
                                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 flex flex-col items-center gap-3 hover:border-brand/50 transition-colors cursor-pointer"
                                            onClick={() => (document.getElementById("logo-upload") as HTMLInputElement)?.click()}>
                                            {receiptDraft.logoBase64 ? (
                                                <img src={receiptDraft.logoBase64} alt="Logo" className="h-16 object-contain rounded" />
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-surface-elevated rounded-full flex items-center justify-center text-slate-400">
                                                        <Printer size={20} />
                                                    </div>
                                                    <p className="text-xs text-slate-400 text-center">Logo yuklash uchun bosing<br /><span className="text-brand">PNG, JPG, SVG</span> formatlar qo'llab-quvvatlanadi</p>
                                                </>
                                            )}
                                        </div>
                                        <input id="logo-upload" type="file" accept="image/*" className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = ev => setReceiptDraft({ ...receiptDraft, logoBase64: ev.target?.result as string, showLogo: true });
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                        {receiptDraft.logoBase64 && (
                                            <button onClick={() => setReceiptDraft({ ...receiptDraft, logoBase64: null })}
                                                className="w-full py-1.5 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">
                                                Logoni o'chirish
                                            </button>
                                        )}
                                    </div>

                                    {/* Shop name settings (top of receipt) */}
                                    <div className="glass-card p-5 space-y-3">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">🏪 Restoran nomi (chek tepasida)</label>
                                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-surface-elevated rounded-lg px-3 py-2">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">Avtomatik:</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{shopSettings?.shopName || "—"}</span>
                                            <span className="ml-auto text-[10px] text-slate-400 italic">Umumiy sozlamalardan olinadi</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 mb-1">Shrift o'lchami: <span className="text-brand font-bold">{receiptDraft.shopNameFontSize || 20}px</span></p>
                                                <input type="range" min={12} max={36} step={1}
                                                    value={receiptDraft.shopNameFontSize || 20}
                                                    onChange={e => setReceiptDraft({ ...receiptDraft, shopNameFontSize: Number(e.target.value) })}
                                                    className="w-full accent-brand" />
                                            </div>
                                            <div className="flex gap-1">
                                                {(["left", "center", "right"] as const).map(align => (
                                                    <button key={align}
                                                        onClick={() => setReceiptDraft({ ...receiptDraft, shopNameAlign: align })}
                                                        className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all", receiptDraft.shopNameAlign === align ? "bg-brand text-white border-brand" : "text-slate-400 border-slate-300 dark:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200")}>
                                                        {align === "left" ? "◀" : align === "center" ? "●" : "▶"}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setReceiptDraft({ ...receiptDraft, shopNameBold: !receiptDraft.shopNameBold })}
                                                    className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all", receiptDraft.shopNameBold !== false ? "bg-brand text-white border-brand" : "text-slate-400 border-slate-300 dark:border-slate-600")}>
                                                    B
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer greeting text */}
                                    <div className="glass-card p-5 space-y-3">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">💬 Salomlashuv matni (chek pastida)</label>
                                        <input
                                            className="input-field w-full"
                                            value={receiptDraft.headerText}
                                            onChange={e => setReceiptDraft({ ...receiptDraft, headerText: e.target.value })}
                                            placeholder="Masalan: Xaridingiz uchun rahmat!"
                                        />
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 mb-1">Shrift o'lchami: <span className="text-brand font-bold">{receiptDraft.headerFontSize || 13}px</span></p>
                                                <input type="range" min={9} max={22} step={1}
                                                    value={receiptDraft.headerFontSize || 13}
                                                    onChange={e => setReceiptDraft({ ...receiptDraft, headerFontSize: Number(e.target.value) })}
                                                    className="w-full accent-brand" />
                                            </div>
                                            <div className="flex gap-1">
                                                {(["left", "center", "right"] as const).map(align => (
                                                    <button key={align}
                                                        onClick={() => setReceiptDraft({ ...receiptDraft, headerAlign: align })}
                                                        className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all", receiptDraft.headerAlign === align ? "bg-brand text-white border-brand" : "text-slate-400 border-slate-300 dark:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200")}>
                                                        {align === "left" ? "◀" : align === "center" ? "●" : "▶"}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setReceiptDraft({ ...receiptDraft, headerBold: !receiptDraft.headerBold })}
                                                    className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all", receiptDraft.headerBold ? "bg-brand text-white border-brand" : "text-slate-400 border-slate-300 dark:border-slate-600")}>
                                                    B
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Extra footer note */}
                                    <div className="glass-card p-5 space-y-3">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">✍️ Qo'shimcha izoh (eng pastda — ixtiyoriy)</label>
                                        <input
                                            className="input-field w-full"
                                            value={receiptDraft.footerText || ""}
                                            onChange={e => setReceiptDraft({ ...receiptDraft, footerText: e.target.value })}
                                            placeholder="Masalan: Bizni yana ziyorat qiling!"
                                        />
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 mb-1">Shrift o'lchami: <span className="text-brand font-bold">{receiptDraft.footerFontSize || 10}px</span></p>
                                                <input type="range" min={8} max={18} step={1}
                                                    value={receiptDraft.footerFontSize || 10}
                                                    onChange={e => setReceiptDraft({ ...receiptDraft, footerFontSize: Number(e.target.value) })}
                                                    className="w-full accent-brand" />
                                            </div>
                                            <div className="flex gap-1">
                                                {(["left", "center", "right"] as const).map(align => (
                                                    <button key={align}
                                                        onClick={() => setReceiptDraft({ ...receiptDraft, footerAlign: align })}
                                                        className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all", receiptDraft.footerAlign === align ? "bg-brand text-white border-brand" : "text-slate-400 border-slate-300 dark:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200")}>
                                                        {align === "left" ? "◀" : align === "center" ? "●" : "▶"}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setReceiptDraft({ ...receiptDraft, footerBold: !receiptDraft.footerBold })}
                                                    className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all", receiptDraft.footerBold ? "bg-brand text-white border-brand" : "text-slate-400 border-slate-300 dark:border-slate-600")}>
                                                    B
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="glass-card p-5 space-y-1">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ko'rsatiladigan ma'lumotlar</p>
                                        {[
                                            { key: "showBarcode", label: "Shtrix-kod (Barcode)", desc: "Chek pastida 1D/QR kod chiqadi" },
                                            { key: "showCashierName", label: "Kassir / Ofitsiant ismi", desc: "Xizmat ko'rsatgan xodim ismi yoziladi" },
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-elevated cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-brand border-slate-300 dark:border-slate-600 bg-surface focus:ring-brand"
                                                    checked={receiptDraft[item.key]}
                                                    onChange={e => setReceiptDraft({ ...receiptDraft, [item.key]: e.target.checked })}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
                                                    <p className="text-xs text-slate-400">{item.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="sticky top-4">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">🔍 Jonli Ko'rinish (Preview)</p>
                                    <div className="bg-white text-black rounded-sm shadow-2xl w-72 mx-auto font-mono text-sm leading-tight flex flex-col overflow-hidden border border-slate-200">
                                        {/* Top - Logo + Shop Name */}
                                        <div className="bg-slate-50 border-b border-dashed border-slate-300 p-4 flex flex-col items-center">
                                            {receiptDraft.showLogo && (
                                                receiptDraft.logoBase64
                                                    ? <img src={receiptDraft.logoBase64} alt="logo" className="h-14 object-contain mb-2" />
                                                    : <div className="w-12 h-12 bg-slate-200 rounded-full mb-2 flex items-center justify-center text-xs text-slate-500">LOGO</div>
                                            )}
                                            <p
                                                className="whitespace-pre-line leading-snug w-full"
                                                style={{
                                                    fontSize: `${receiptDraft.shopNameFontSize || 20}px`,
                                                    textAlign: receiptDraft.shopNameAlign || "center",
                                                    fontWeight: receiptDraft.shopNameBold !== false ? "bold" : "normal",
                                                }}>
                                                {receiptDraft.customShopName || shopSettings?.shopName || "RESTORAN NOMI"}
                                            </p>
                                        </div>

                                        {/* Body */}
                                        <div className="p-4 space-y-1">
                                            <p className="text-[10px] text-slate-500">Sana: 08.03.2026 12:45</p>
                                            <p className="text-[10px] text-slate-500">Buyurtma #: 9812</p>
                                            {receiptDraft.showCashierName && <p className="text-[10px] text-slate-500">Kassir: Aziz Yusupov</p>}

                                            <div className="border-t border-dashed border-slate-300 my-2"></div>

                                            <div className="flex justify-between text-xs">
                                                <span>Olma (kg) x 2</span><span>30 000</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span>Coca-Cola (L) x 1</span><span>12 000</span>
                                            </div>

                                            <div className="border-t border-dashed border-slate-300 my-2"></div>
                                            <div className="flex justify-between font-bold text-sm">
                                                <span>JAMI TO'LOV:</span><span>42 000 so'm</span>
                                            </div>
                                        </div>

                                        {/* Footer - Greeting + Optional note + Barcode */}
                                        <div className="bg-slate-50 border-t border-dashed border-slate-300 p-3 space-y-1">
                                            {receiptDraft.headerText && (
                                                <p
                                                    className="whitespace-pre-line w-full"
                                                    style={{
                                                        fontSize: `${receiptDraft.headerFontSize || 13}px`,
                                                        textAlign: receiptDraft.headerAlign || "center",
                                                        fontWeight: receiptDraft.headerBold ? "bold" : "normal",
                                                    }}>
                                                    {receiptDraft.headerText}
                                                </p>
                                            )}
                                            {receiptDraft.footerText && (
                                                <p
                                                    className="italic text-slate-500 whitespace-pre-line w-full"
                                                    style={{
                                                        fontSize: `${receiptDraft.footerFontSize || 10}px`,
                                                        textAlign: receiptDraft.footerAlign || "center",
                                                        fontWeight: receiptDraft.footerBold ? "bold" : "normal",
                                                    }}>
                                                    {receiptDraft.footerText}
                                                </p>
                                            )}
                                            {receiptDraft.showBarcode && (
                                                <div className="flex flex-col items-center mt-3">
                                                    {/* QR code simulation with SVG squares */}
                                                    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                                                        {/* Corner squares */}
                                                        <rect x="2" y="2" width="18" height="18" fill="none" stroke="#1e293b" strokeWidth="2"/>
                                                        <rect x="6" y="6" width="10" height="10" fill="#1e293b"/>
                                                        <rect x="44" y="2" width="18" height="18" fill="none" stroke="#1e293b" strokeWidth="2"/>
                                                        <rect x="48" y="6" width="10" height="10" fill="#1e293b"/>
                                                        <rect x="2" y="44" width="18" height="18" fill="none" stroke="#1e293b" strokeWidth="2"/>
                                                        <rect x="6" y="48" width="10" height="10" fill="#1e293b"/>
                                                        {/* Data dots */}
                                                        {[24,28,32,36,40].map(x => [24,28,32,36,40].map(y =>
                                                            Math.random() > 0.5 ? <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="#1e293b"/> : null
                                                        ))}
                                                        <rect x="24" y="24" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="31" y="24" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="38" y="24" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="27" y="28" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="35" y="28" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="24" y="32" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="31" y="32" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="38" y="32" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="27" y="36" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="35" y="36" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="24" y="40" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="31" y="40" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="38" y="40" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="44" y="24" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="44" y="32" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="24" y="44" width="3" height="3" fill="#1e293b"/>
                                                        <rect x="32" y="44" width="3" height="3" fill="#1e293b"/>
                                                    </svg>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">QR kod</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-center text-slate-500 text-xs mt-3">Bu namuna chek ko'rinishi (jonli yangilanadi)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Kitchen Receipt Settings */}
                    {activeTab === "receipt" && receiptDraft && (
                        <div className="space-y-4 mt-8 border-t border-slate-200 dark:border-slate-700/50 pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="section-title">🍳 Oshxona Cheki Sozlamalari</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Oshpaz printerida chiqadigan buyurtma chekining ko'rinishini sozlang</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const currentSettings = (settingsData as any)?.tenant?.settings || {};
                                        updateSettingsMutation.mutate({
                                            ...currentSettings,
                                            kitchenReceiptSettings: {
                                                ...(receiptDraft.kitchenReceiptSettings || {}),
                                            }
                                        });
                                        alert("Oshxona cheki sozlamalari saqlandi!");
                                    }}
                                    disabled={updateSettingsMutation.isPending}
                                    className="btn-primary flex items-center gap-2">
                                    <Printer size={16} /> Saqlash
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                {/* Kitchen settings form */}
                                <div className="space-y-4">

                                    {/* Kitchen toggles */}
                                    <div className="glass-card p-5 space-y-2">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Nima ko'rsatilsin?</p>
                                        {[
                                            { key: "kitchenShowTable", label: "Stol raqami", desc: "Buyurtma qaysi stoldan ekanligini ko'rsatadi" },
                                            { key: "kitchenShowWaiter", label: "Ofitsiant ismi", desc: "Kim buyurtma olgani yoziladi" },
                                            { key: "kitchenShowOrderNo", label: "Buyurtma raqami", desc: "Tartib raqami (order #)" },
                                            { key: "kitchenShowTime", label: "Vaqt va sana", desc: "Buyurtma qabul qilingan aniq vaqt" },
                                            { key: "kitchenShowNote", label: "Izoh (Oshpaz uchun eslatma)", desc: "Mijozning maxsus xohishi" },
                                            { key: "kitchenShowOrderType", label: "Zakaz turi (Zal/Saboy/Yetkazish)", desc: "Buyurtma qaysi usulda ekanini ko'rsatadi" },
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-elevated cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-brand border-slate-600 bg-surface focus:ring-brand focus:ring-offset-surface"
                                                    checked={receiptDraft[item.key] !== false}
                                                    onChange={e => setReceiptDraft({ ...receiptDraft, [item.key]: e.target.checked })}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
                                                    <p className="text-xs text-slate-400">{item.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Font size */}
                                    <div className="glass-card p-5 space-y-3">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shrift o'lchami</p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 mb-1">Taom nomi: <span className="text-brand font-bold">{receiptDraft.kitchenItemFontSize || 16}px</span></p>
                                                <input
                                                    type="range" min={10} max={28} step={1}
                                                    value={receiptDraft.kitchenItemFontSize || 16}
                                                    onChange={e => setReceiptDraft({ ...receiptDraft, kitchenItemFontSize: Number(e.target.value) })}
                                                    className="w-full accent-brand"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Kitchen Preview */}
                                <div className="sticky top-4">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">🔍 Oshxona cheki ko'rinishi</p>
                                    <div className="bg-white text-black rounded-sm shadow-2xl w-72 mx-auto font-mono text-sm leading-tight flex flex-col overflow-hidden border border-slate-200">
                                        {/* Header */}
                                        <div className="bg-slate-100 border-b border-dashed border-slate-400 p-3 text-center">
                                            <p className="font-black text-lg uppercase tracking-wider">
                                                {receiptDraft.kitchenHeaderText || "OSHXONA BUYURTMASI"}
                                            </p>
                                        </div>
                                        {/* Order info */}
                                        <div className="p-4 space-y-1">
                                            {receiptDraft.kitchenShowOrderNo !== false && <p className="text-xs font-bold">BUYURTMA #: 0042</p>}
                                            {receiptDraft.kitchenShowTime !== false && <p className="text-[10px] text-slate-600">Vaqt: 12:45 · 22.04.2026</p>}
                                            {receiptDraft.kitchenShowTable !== false && <p className="text-xs font-bold">STOL: 7</p>}
                                            {receiptDraft.kitchenShowWaiter !== false && <p className="text-[10px] text-slate-600">Ofitsiant: Sardor</p>}
                                            {receiptDraft.kitchenShowOrderType !== false && <p className="text-[10px] font-semibold text-slate-700">📍 Zal</p>}

                                            <div className="border-t-2 border-black my-2"></div>

                                            {[
                                                { name: "1x  Qovurma lag'mon", qty: "1" },
                                                { name: "2x  Shashlyk", qty: "2" },
                                                { name: "1x  Choy (katta)", qty: "1" },
                                            ].map((item, i) => (
                                                <p key={i} className="font-bold" style={{ fontSize: `${receiptDraft.kitchenItemFontSize || 16}px` }}>
                                                    {item.name}
                                                </p>
                                            ))}

                                            {receiptDraft.kitchenShowNote !== false && (
                                                <div className="border-t border-dashed border-slate-400 mt-2 pt-2">
                                                    <p className="text-[10px] text-slate-600 italic">💬 Izoh: Sho'rsiz tayyorlang</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-center text-slate-500 text-xs mt-3">Namuna oshxona cheki (jonli yangilanadi)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Audit Log */}
                    {activeTab === "audit" && (
                        <div className="space-y-4">
                            <h2 className="section-title">Audit Jurnali</h2>
                            <div className="glass-card overflow-hidden">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Foydalanuvchi</th>
                                            <th>Tur</th>
                                            <th>Harakat</th>
                                            <th>Tafsilot</th>
                                            <th>Vaqt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLog.map(log => (
                                            <tr key={log.id}>
                                                <td className="font-medium text-slate-800">{log.user}</td>
                                                <td>
                                                    <span className={clsx("badge",
                                                        log.type === "create" ? "badge-green" :
                                                            log.type === "delete" ? "badge-red" :
                                                                log.type === "update" ? "badge-yellow" : "badge-blue"
                                                    )}>
                                                        {log.type === "create" ? t("common.add") : log.type === "delete" ? t("common.delete") : log.type === "update" ? t("common.edit") : "Info"}
                                                    </span>
                                                </td>
                                                <td className="text-slate-300">{log.action}</td>
                                                <td className="text-slate-400">{log.detail}</td>
                                                <td className="text-slate-400">{log.date} {log.time}</td>
                                            </tr>
                                        ))}
                                        {auditLog.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-slate-400">
                                                    Hali jurnaldagi hech qanday ma'lumot yo'q.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* UBT Settings */}
                    {activeTab === "ubt" && (
                        <div className="space-y-4">
                            <h2 className="section-title">UBT Modul Sozlamalari</h2>

                            <div className="glass-card p-5 space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-800 block">Stollar va Zonalar</label>
                                        <button
                                            onClick={() => {
                                                setZoneForm({ id: "", name: "", branchId: "", serviceFee: "", extraPriceType: "Qo'shimcha narx" });
                                                setIsZoneModalOpen(true);
                                            }}
                                            className="text-xs text-brand hover:text-brand-400 font-semibold flex items-center gap-1 bg-brand/10 px-3 py-1.5 rounded-lg transition"
                                        >
                                            <Plus size={14} /> Joy qo'shish
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {(ubtDraft?.zones || []).map((zone: any) => (
                                            <div key={zone.id} className="bg-surface-elevated rounded-xl border border-surface-border overflow-hidden">
                                                <div
                                                    className="flex flex-col sm:flex-row items-center justify-between p-4 cursor-pointer hover:bg-surface-border/50 transition-colors gap-3"
                                                    onClick={() => setSelectedZoneForModal(zone.id)}
                                                >
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-800 flex items-center gap-2 text-[15px]">
                                                            {zone.name}
                                                            {zone.branchId && <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">{zone.branchId}</span>}
                                                        </h4>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            Xizmat haqi: {zone.serviceFee}% • Narx: {zone.extraPriceType}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newZones = ubtDraft.zones.filter((z: any) => z.id !== zone.id);
                                                                setUbtDraft({ ...ubtDraft, zones: newZones });
                                                                // Delete all tables in this zone from DB
                                                                fetch(`/api/ubt/tables?section=${encodeURIComponent(zone.name)}`, { method: "DELETE" }).catch(() => {});
                                                            }}
                                                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                            title="Zonani o'chirish"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <div className="p-1 rounded-full bg-surface">
                                                            <ChevronRight className="text-slate-400 transition-transform duration-300" size={18} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated hover:bg-surface border border-surface-border transition-all cursor-pointer">
                                        <input type="checkbox" checked={ubtDraft?.enableKDS || false} onChange={e => setUbtDraft({ ...ubtDraft, enableKDS: e.target.checked })} className="w-5 h-5 rounded text-brand border-slate-600 bg-surface focus:ring-brand focus:ring-offset-surface" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-200">KDS (Oshxona ekrani) modulini yoqish</p>
                                            <p className="text-xs text-slate-400">Oshxonaga avtomatik buyurtmalarni yuborish va tayyorlanish jarayonini boshqarish.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated hover:bg-surface border border-surface-border transition-all cursor-pointer">
                                        <input type="checkbox" checked={ubtDraft?.enableWaiterApp || false} onChange={e => setUbtDraft({ ...ubtDraft, enableWaiterApp: e.target.checked })} className="w-5 h-5 rounded text-brand border-slate-600 bg-surface focus:ring-brand focus:ring-offset-surface" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-200">Ofitsiant plansheti funksiyasi</p>
                                            <p className="text-xs text-slate-400">Ofitsiantlar stol bo'ylab buyurtma olishlari uchun.</p>
                                        </div>
                                    </label>
                                </div>


                                <div className="flex justify-end pt-4 border-t border-surface-border mt-6 relative z-10">
                                    <button onClick={saveUbtSettings} className="btn-primary">Saqlash</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Permissions Modal */}
            {permTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{t("staff.editPermissions")}</h2>
                                <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
                                    {permTarget?.name}
                                    <span className="badge badge-blue">{permTarget?.role}</span>
                                    <span className="text-slate-500">{permTarget?.branch}</span>
                                </p>
                            </div>
                            <button onClick={() => setPermTarget(null)} className="p-1.5 rounded-lg hover:bg-surface-elevated text-slate-400 hover:text-slate-200 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Inherit from role */}
                        <button
                            onClick={() => permTarget?.role && inheritFromRole(permTarget.role)}
                            className="w-full py-2 rounded-xl border border-dashed border-sky-500/40 text-sm text-sky-400 hover:bg-sky-500/10 transition-all">
                            ↺ {t("staff.inheritFromRole")}: {permTarget?.role}
                        </button>

                        {/* Modules */}
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("staff.permModules")}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {MODULE_PERMS.map(key => (
                                    <button
                                        key={key}
                                        onClick={() => togglePerm(key)}
                                        className={clsx("flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                                            permDraft.includes(key)
                                                ? "border-brand/50 bg-brand/10 text-brand"
                                                : "border-surface-border bg-surface-elevated text-slate-400 hover:text-slate-200"
                                        )}>
                                        <div className={clsx("w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all",
                                            permDraft.includes(key) ? "bg-brand border-brand" : "border-slate-500"
                                        )}>
                                            {permDraft.includes(key) && <Check size={10} className="text-white" />}
                                        </div>
                                        {PERM_LABELS[key]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("staff.permActions")}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {ACTION_PERMS.map(key => (
                                    <button
                                        key={key}
                                        onClick={() => togglePerm(key)}
                                        className={clsx("flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                                            permDraft.includes(key)
                                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                                                : "border-surface-border bg-surface-elevated text-slate-400 hover:text-slate-200"
                                        )}>
                                        <div className={clsx("w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all",
                                            permDraft.includes(key) ? "bg-emerald-500 border-emerald-500" : "border-slate-500"
                                        )}>
                                            {permDraft.includes(key) && <Check size={10} className="text-white" />}
                                        </div>
                                        {PERM_LABELS[key]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setPermTarget(null)} className="btn-secondary flex-1">{t("common.cancel")}</button>
                            <button onClick={savePermissions} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                <Key size={15} /> {t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Zone Add Modal */}
            {isZoneModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in shadow-2xl drop-shadow-2xl">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden text-slate-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-[15px] font-bold text-slate-800">Joy qo'shish</h3>
                            <button onClick={() => setIsZoneModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full transition">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Nomi <span className="text-red-500">*</span></label>
                                <input
                                    value={zoneForm.name}
                                    onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition placeholder:text-slate-300 font-medium"
                                    placeholder="Nomni kiriting"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Joy</label>
                                <div className="relative">
                                    <select
                                        value={zoneForm.branchId}
                                        onChange={e => setZoneForm({ ...zoneForm, branchId: e.target.value })}
                                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition appearance-none bg-white text-slate-600 font-medium"
                                    >
                                        <option value="">Joyni tanlang</option>
                                        {branches.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" size={14} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Xizmat ko'rsatish foizi <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={zoneForm.serviceFee}
                                    onChange={e => setZoneForm({ ...zoneForm, serviceFee: e.target.value })}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition placeholder:text-slate-300 font-medium"
                                    placeholder="Xizmat ko'rsatish foizini kiriting"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Qo'shimcha narx</label>
                                <div className="relative">
                                    <select
                                        value={zoneForm.extraPriceType}
                                        onChange={e => setZoneForm({ ...zoneForm, extraPriceType: e.target.value })}
                                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition appearance-none bg-white text-slate-800 font-medium"
                                    >
                                        <option value="Qo'shimcha narx">Qo'shimcha narx</option>
                                        <option value="Soatlik narx">Soatlik narx</option>
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-600" size={14} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end px-6 pb-6 pt-2">
                            <button
                                onClick={() => {
                                    if (!zoneForm.name || !zoneForm.serviceFee) return alert("Nomi va Xizmat foizi majburiy!");
                                    const newZone = {
                                        id: zoneForm.id || Date.now().toString(),
                                        name: zoneForm.name,
                                        branchId: zoneForm.branchId,
                                        serviceFee: Number(zoneForm.serviceFee) || 0,
                                        extraPriceType: zoneForm.extraPriceType,
                                        tables: []
                                    };
                                    const updatedZones = [...(ubtDraft?.zones || []), newZone];
                                    const updatedDraft = { ...ubtDraft, zones: updatedZones };
                                    setUbtDraft(updatedDraft);
                                    
                                    // Persist both draft and settings to DB immediately
                                    const currentSettings = (settingsData as any)?.tenant?.settings || {};
                                    updateSettingsMutation.mutate({ ...currentSettings, ubtSettings: updatedDraft });
                                    setIsZoneModalOpen(false);
                                    setZoneForm({ id: "", name: "", branchId: "", serviceFee: "", extraPriceType: "Qo'shimcha narx" });
                                }}
                                className="px-6 py-2 bg-[#007bff] text-white rounded-md text-[13px] font-bold hover:bg-[#0069d9] transition shadow-sm whitespace-nowrap h-[38px] flex items-center"
                            >
                                Qo'shish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Add Modal */}
            {isTableModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in shadow-2xl drop-shadow-2xl">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-[340px] border border-slate-200 overflow-hidden text-slate-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-[15px] font-bold text-slate-800">Stol qo'shish</h3>
                            <button onClick={() => setIsTableModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full transition">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Stol nomi / raqami <span className="text-red-500">*</span></label>
                                <input
                                    value={tableForm.name}
                                    onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition placeholder:text-slate-300 font-medium"
                                    placeholder="Masalan: Stol 1, VIP 3"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">Stol sig'imi (kishi) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={tableForm.capacity}
                                    onChange={e => setTableForm({ ...tableForm, capacity: e.target.value })}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition placeholder:text-slate-300 font-medium"
                                    placeholder="Masalan: 4"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end px-6 pb-6 mt-2">
                            <button
                                onClick={async () => {
                                    if (!tableForm.name || !tableForm.capacity) return alert("Hamma maydonlar to'ldirilishi kerak!");
                                    const zoneName = (ubtDraft?.zones || []).find((z: any) => z.id === tableForm.zoneId)?.name || tableForm.zoneId;
                                    
                                    // Create in DB immediately
                                    const res = await fetch("/api/ubt/tables", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            tableNumber: tableForm.name,
                                            capacity: Number(tableForm.capacity) || 4,
                                            section: zoneName,
                                        }),
                                    });
                                    const data = res.ok ? await res.json() : {};
                                    
                                    const newZones = [...(ubtDraft?.zones || [])];
                                    const zIdx = newZones.findIndex((z: any) => z.id === tableForm.zoneId);
                                    if (zIdx >= 0) {
                                        newZones[zIdx] = {
                                            ...newZones[zIdx],
                                            tables: [...(newZones[zIdx].tables || []), {
                                                id: Date.now().toString(),
                                                dbId: data.table?.id,
                                                name: tableForm.name,
                                                capacity: Number(tableForm.capacity) || 1
                                            }]
                                        };
                                        const updatedDraft = { ...ubtDraft, zones: newZones };
                                        setUbtDraft(updatedDraft);
                                        // Also update tenant settings
                                        const currentSettings = (settingsData as any)?.tenant?.settings || {};
                                        updateSettingsMutation.mutate({ ...currentSettings, ubtSettings: updatedDraft });
                                    }
                                    setIsTableModalOpen(false);
                                    setTableForm({ id: "", zoneId: "", name: "", capacity: "" });
                                }}
                                className="px-6 py-2 bg-[#007bff] text-white rounded-md text-[13px] font-bold hover:bg-[#0069d9] transition shadow-sm whitespace-nowrap h-[38px] flex items-center"
                            >
                                Saqlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Zone Details Modal */}
            {
                selectedZoneForModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl relative overflow-hidden text-slate-900 dark:text-slate-800 flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                                <h3 className="text-lg font-bold">
                                    {(ubtDraft?.zones || []).find((z: any) => z.id === selectedZoneForModal)?.name || "Zonasi"} - Stollar
                                </h3>
                                <button
                                    onClick={() => setSelectedZoneForModal(null)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="flex justify-end mb-6">
                                    <button
                                        onClick={() => {
                                            setTableForm({ id: "", zoneId: selectedZoneForModal || "", name: "", capacity: "" });
                                            setIsTableModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-brand text-white font-bold rounded-lg hover:bg-brand-600 transition-colors shadow-sm flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Stol qo'shish
                                    </button>
                                </div>

                                {ubtDraft?.zones?.find((z: any) => z.id === selectedZoneForModal)?.tables?.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {ubtDraft.zones.find((z: any) => z.id === selectedZoneForModal).tables.map((table: any) => (
                                            <div key={table.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm relative group">
                                                <div className="overflow-hidden pt-2">
                                                    <p className="text-lg font-bold text-slate-800 dark:text-slate-800 truncate text-center">{table.name}</p>
                                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 text-center mt-1">Sig'imi: <span className="font-bold text-slate-700 dark:text-slate-300">{table.capacity}</span> kishi</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newZones = [...ubtDraft.zones];
                                                        const zoneIdx = newZones.findIndex(z => z.id === selectedZoneForModal);
                                                        if (zoneIdx >= 0) {
                                                            const tableIdx = newZones[zoneIdx].tables.findIndex((t: any) => t.id === table.id);
                                                            if (tableIdx >= 0) {
                                                                newZones[zoneIdx].tables[tableIdx].isActive = table.isActive === false ? true : false;
                                                                const updatedDraft = { ...ubtDraft, zones: newZones };
                                                                setUbtDraft(updatedDraft);
                                                                const currentSettings = (settingsData as any)?.tenant?.settings || {};
                                                                updateSettingsMutation.mutate({ ...currentSettings, ubtSettings: updatedDraft });
                                                            }
                                                        }
                                                    }}
                                                    className={`absolute top-2 right-10 p-1.5 rounded-lg transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 ${table.isActive === false ? "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" : "text-emerald-500 dark:text-emerald-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                                                    title={table.isActive === false ? "Stolni ko'rsatish" : "Stolni yashirish"}
                                                >
                                                    {table.isActive === false ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newZones = [...ubtDraft.zones];
                                                        const zoneIdx = newZones.findIndex(z => z.id === selectedZoneForModal);
                                                        if (zoneIdx >= 0) {
                                                            const zoneName = newZones[zoneIdx].name;
                                                            newZones[zoneIdx].tables = newZones[zoneIdx].tables.filter((t: any) => t.id !== table.id);
                                                            setUbtDraft({ ...ubtDraft, zones: newZones });
                                                            // Delete this specific table from DB
                                                            const q = table.dbId 
                                                                ? `id=${encodeURIComponent(table.dbId)}` 
                                                                : `section=${encodeURIComponent(zoneName)}&tableNumber=${encodeURIComponent(table.name)}`;
                                                            fetch(`/api/ubt/tables?${q}`, { method: "DELETE" }).catch(() => {});
                                                        }
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                                                    title="Stolni o'chirish"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                        <div className="mx-auto w-16 h-16 bg-white dark:bg-slate-700 shadow-sm rounded-full flex items-center justify-center mb-4">
                                            <UtensilsCrossed size={24} className="text-slate-400" />
                                        </div>
                                        <h4 className="text-slate-700 dark:text-slate-200 font-bold mb-1">Bu zalda hozircha stollar yo'q</h4>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                                            Yuqoridagi "Stol qo'shish" tugmasini bosish orqali yangi stollarni ro'yxatga kiriting.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

        </div>
    );
}
