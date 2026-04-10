"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/frontend/api";
import { useLang } from "@/lib/LangContext";
import { Plus, Search, Edit2, Trash2, Eye } from "lucide-react";
import clsx from "clsx";
import { PhoneInput } from "@/components/ui/PhoneInput";

// Type Mapping constants
const TYPE_TO_ROLE: Record<string, string> = {
    "kassir": "Kassir",
    "ofitsiant": "Ofitsiant",
    "kuryer": "Kuryer",
    "manablog": "Manablog",
    "povar": "Oshpaz", // Assuming Povar = Oshpaz
    "menejer": "Menejer",
    "omborchi": "Omborchi"
};

export default function UsersDynamicPage({ params }: { params: { type: string } }) {
    const { t } = useLang();
    const type = params.type;

    // Is this a normal user list or a special history/attendance page?
    const isHistory = type === "history";
    const isRolePage = !isHistory;

    const targetRole = isRolePage ? (TYPE_TO_ROLE[type] || "Kassir") : null;

    // Queries
    const { data: staffRaw, refetch } = useQuery({
        queryKey: ["staff"],
        queryFn: () => api.staff.list()
    });
    const staffData: any[] = useMemo(() => (staffRaw as any)?.staff || [], [staffRaw]);

    const { data: settingsData } = useQuery({
        queryKey: ["settings"],
        queryFn: () => api.settings.get()
    });

    const branches = (settingsData as any)?.tenant?.branches || [];

    // Filter staff by the target role
    const filteredStaff = useMemo(() => {
        if (!isRolePage) return [];
        return staffData.filter((s: any) => s.role === targetRole);
    }, [staffData, isRolePage, targetRole]);

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddUser, setShowAddUser] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ name: "", branch: "Asosiy Filial", password: "", printerIp: "", isMainMonoblock: false, showCashiersList: false, hasChefPrinter: false, printOrderCancellations: false, serviceFeePct: 10, acceptCash: false, canVoidOrder: false, canAuditInventory: false, receiveLowStockAlerts: false, canWriteOff: false });

    // Printers list from API
    const [printersList, setPrintersList] = useState<{ id: string; name: string; ipAddress: string }[]>([]);
    useEffect(() => {
        fetch("/api/ubt/printers")
            .then(r => r.json())
            .then(d => setPrintersList(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);

    const [newUser, setNewUser] = useState({ 
        name: "", phone: "", username: "", password: "", 
        role: targetRole || "Kassir", branch: "Asosiy Filial", 
        // Manablog
        printerIp: "", status: true, isMainMonoblock: false, showCashiersList: false, hasChefPrinter: false, printOrderCancellations: false, photoBase64: null as string | null,
        // Kassir/Menejer
        acceptCash: true, canDiscount: false, canVoidOrder: false,
        // Ofitsiant
        pinCode: "", assignedZone: "", serviceFeePct: 10,
        // Kuryer
        vehiclePlate: "", canSelfPickup: false,
        // Povar
        kitchenSection: "Issiq sex", canViewKds: true,
        // Omborchi
        canAuditInventory: false, receiveLowStockAlerts: true, canWriteOff: false
    });

    // Mutations
    const createStaffMutation = useMutation({
        mutationFn: (data: any) => api.staff.create(data),
        onSuccess: () => {
            refetch();
            setShowAddUser(false);
            setNewUser({ 
                name: "", phone: "", username: "", password: "", 
                role: targetRole || "Kassir", branch: "Asosiy Filial", 
                printerIp: "", status: true, isMainMonoblock: false, 
                showCashiersList: false, hasChefPrinter: false, 
                printOrderCancellations: false, photoBase64: null,
                acceptCash: true, canDiscount: false, canVoidOrder: false,
                pinCode: "", assignedZone: "", serviceFeePct: 10,
                vehiclePlate: "", canSelfPickup: false,
                kitchenSection: "Issiq sex", canViewKds: true,
                canAuditInventory: false, receiveLowStockAlerts: true, canWriteOff: false
            });
        }
    });

    const updateStaffMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.staff.update(id, data),
        onSuccess: () => refetch()
    });

    const deleteStaffMutation = useMutation({
        mutationFn: (id: string) => api.staff.delete(id),
        onSuccess: () => refetch()
    });

    // Handle Search
    const displayedStaff = useMemo(() => {
        if (!searchQuery) return filteredStaff;
        const q = searchQuery.toLowerCase();
        return filteredStaff.filter(s => 
            s.name.toLowerCase().includes(q) || 
            s.username.toLowerCase().includes(q)
        );
    }, [filteredStaff, searchQuery]);

    // Special pages placeholder
    if (isHistory) {
        return (
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-slate-800">
                    {t('nav.users_history')}
                </h1>
                <div className="glass-card p-12 text-center text-slate-400">
                    <p>Kirish tarixi tez orada qo'shiladi...</p>
                </div>
            </div>
        );
    }



    // Main Role Page Layout
    const isManablog = targetRole === "Manablog";

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {targetRole} {t('settings.users')}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Ushbu roldagi barcha foydalanuvchilarni boshqarish</p>
                </div>
                
                <button 
                    onClick={() => { 
                        setNewUser({ ...newUser, role: targetRole || "Kassir" }); 
                        setShowAddUser(true); 
                    }} 
                    className={clsx(
                        "flex items-center gap-2",
                        isManablog ? "btn-liquid-glass-dark" : "btn-ghost"
                    )}
                >
                    <Plus size={16} /> {isManablog ? "Manablog qo'shish" : t("settings.addUser")}
                </button>
            </div>

            {/* Creation Form */}
            {showAddUser && (
                <div className="glass-card p-5 space-y-4 animate-slide-up border border-brand/30">
                    <h3 className="font-semibold text-slate-800">
                        {isManablog ? "Yangi Manablog (POS Apparat) qo'shish" : "Yangi xodim qo'shish"}
                    </h3>
                    
                    {isManablog ? (
                        <div className="flex flex-col gap-6">
                            <div className="flex gap-6">
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
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400">Ism <span className="text-red-500">*</span></label>
                                        <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="input-field w-full" placeholder="Masalan: Asosiy Monoblok" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400">Login (username) <span className="text-red-500">*</span> <span className="text-slate-500 text-[10px]">(POS ga kirish uchun ishlatiladi)</span></label>
                                        <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })} className="input-field w-full font-mono" placeholder="masalan: pos_1" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400">Parol <span className="text-red-500">*</span></label>
                                        <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="input-field w-full" placeholder="••••••••" />
                                    </div>
                                     <div className="space-y-1">
                                         <label className="text-xs text-slate-400">🖨️ Chek printeri (mijoz cheki)</label>
                                         <select value={newUser.printerIp} onChange={e => setNewUser({ ...newUser, printerIp: e.target.value })} className="input-field w-full">
                                             <option value="">Printer tanlanmagan</option>
                                             {printersList.map(p => (
                                                 <option key={p.id} value={p.ipAddress}>{p.name} ({p.ipAddress})</option>
                                             ))}
                                         </select>
                                     </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl border-t border-slate-700/50 pt-4">
                                {[
                                    { key: 'status', label: 'Status' },
                                    { key: 'isMainMonoblock', label: 'Asosiy monoblok (Glavniy monoblok)' },
                                    { key: 'showCashiersList', label: 'Kassirlar ro\'yxati (Spisok kassirov)' },
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
                        <div className="space-y-6">
                            {/* Standard Required Fields */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Ism-sharifi <span className="text-red-500">*</span></label>
                                    <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="input-field w-full" placeholder="Masalan: Sardor" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Telefon</label>
                                    <PhoneInput
                                        value={newUser.phone}
                                        onChange={(val: string) => setNewUser({ ...newUser, phone: val })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Rol <span className="text-brand">(O'zgartirilmaydi)</span></label>
                                    <input value={targetRole || ""} disabled className="input-field w-full bg-surface-elevated text-slate-400 cursor-not-allowed" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Parol <span className="text-red-500">*</span></label>
                                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="input-field w-full" placeholder="Min. 6 ta belgi" />
                                </div>
                                {(targetRole === "Kassir" || targetRole === "Ofitsiant") && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400">🖨️ Chek printeri (mijoz cheki)</label>
                                        <select value={newUser.printerIp} onChange={e => setNewUser({ ...newUser, printerIp: e.target.value })} className="input-field w-full">
                                            <option value="">Printer tanlanmagan</option>
                                            {printersList.map(p => (
                                                <option key={p.id} value={p.ipAddress}>{p.name} ({p.ipAddress})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            
                            {/* Role Specific Settings */}
                            <div className="border-t border-slate-700/50 pt-4 mt-2">
                                <h4 className="text-sm font-semibold text-slate-300 mb-4">{targetRole} uchun maxsus sozlamalar</h4>
                                
                                {(targetRole === "Kassir" || targetRole === "Menejer") && (
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl">
                                        {[
                                            { key: 'acceptCash', label: 'Naqd pul qabul qilish' },
                                            { key: 'canDiscount', label: 'Chegirma berish huquqi' },
                                            { key: 'canVoidOrder', label: 'Buyurtmani bekor qilish huquqi' },
                                        ].map(toggle => (
                                            <div key={toggle.key} className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-400">{toggle.label}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={(newUser as any)[toggle.key]} onChange={e => setNewUser({ ...newUser, [toggle.key]: e.target.checked })} />
                                                    <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                                </label>
                                            </div>
                                        ))}
                                        <div className="col-span-2 space-y-1 pt-2">
                                            <label className="text-xs text-slate-400">🖨️ Chek printeri (mijoz cheki)</label>
                                            <select value={newUser.printerIp} onChange={e => setNewUser({ ...newUser, printerIp: e.target.value })} className="input-field w-full">
                                                <option value="">Printer tanlanmagan</option>
                                                {printersList.map(p => (
                                                    <option key={p.id} value={p.ipAddress}>{p.name} ({p.ipAddress})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {targetRole === "Ofitsiant" && (
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400">Xizmat qiladigan zonasi</label>
                                            <select value={newUser.assignedZone} onChange={e => setNewUser({ ...newUser, assignedZone: e.target.value })} className="input-field w-full">
                                                <option value="">Barchasi</option>
                                                <option value="Zal">Zal</option>
                                                <option value="Terrasa">Terrasa</option>
                                                <option value="VIP">VIP xonalar</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400">Xizmat haqqi (%)</label>
                                            <input type="number" min="0" max="100" value={newUser.serviceFeePct} onChange={e => setNewUser({ ...newUser, serviceFeePct: Number(e.target.value) })} className="input-field w-full" placeholder="10" />
                                        </div>
                                        {[
                                            { key: 'acceptCash', label: 'Buyurtmani yopish (To\'lov qabul qilish)' },
                                            { key: 'canVoidOrder', label: 'Buyurtmani bekor qilish (O\'chirish)' },
                                        ].map(toggle => (
                                            <div key={toggle.key} className="flex items-center justify-between col-span-2">
                                                <span className="text-sm font-medium text-slate-400">{toggle.label}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={(newUser as any)[toggle.key]} onChange={e => setNewUser({ ...newUser, [toggle.key]: e.target.checked })} />
                                                    <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {targetRole === "Kuryer" && (
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400">Avtomobil raqami</label>
                                            <input value={newUser.vehiclePlate} onChange={e => setNewUser({ ...newUser, vehiclePlate: e.target.value.toUpperCase() })} className="input-field w-full font-mono uppercase" placeholder="01 A 123 AA" />
                                        </div>
                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-sm font-medium text-slate-400">O'zi olib ketish buyurtmalarga ruxsat</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={newUser.canSelfPickup} onChange={e => setNewUser({ ...newUser, canSelfPickup: e.target.checked })} />
                                                <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {targetRole === "Oshpaz" && (
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-400">Qaysi sex (Tsex) xodimi?</label>
                                            <select value={newUser.kitchenSection} onChange={e => setNewUser({ ...newUser, kitchenSection: e.target.value })} className="input-field w-full">
                                                <option value="Issiq sex">Issiq sex</option>
                                                <option value="Sovuq sex">Sovuq sex</option>
                                                <option value="Muxandislik bar">Muxandislik bar</option>
                                                <option value="Qandolatchilik">Qandolatchilik</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-sm font-medium text-slate-400">KDS monitor ko'rish uquqi</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={newUser.canViewKds} onChange={e => setNewUser({ ...newUser, canViewKds: e.target.checked })} />
                                                <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {targetRole === "Omborchi" && (
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl">
                                        {[
                                            { key: 'canAuditInventory', label: 'Inventarizatsiya huquqi' },
                                            { key: 'receiveLowStockAlerts', label: 'Kam zaxira ogohlantirishlarini olish' },
                                            { key: 'canWriteOff', label: 'Hisobdan chiqarish ruxsati (Sjisaniya)' }
                                        ].map(toggle => (
                                            <div key={toggle.key} className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-400">{toggle.label}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={(newUser as any)[toggle.key]} onChange={e => setNewUser({ ...newUser, [toggle.key]: e.target.checked })} />
                                                    <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => setShowAddUser(false)} className="btn-secondary">Bekor qilish</button>
                            <button onClick={() => {
                                if (!newUser.name || !newUser.password) return alert("Ism va parolni kiriting");

                                // Use typed username; fall back to auto-generated
                                const autoUsername = newUser.username.trim()
                                    ? newUser.username.trim().toLowerCase().replace(/\s+/g, '_')
                                    : newUser.phone
                                        ? newUser.phone.replace(/\D/g, '')
                                        : newUser.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);

                                let customPhone = newUser.phone;
                                let perms: string[] = [];

                                if (isManablog) {
                                    customPhone = JSON.stringify({
                                        printerIp: newUser.printerIp,
                                        isMainMonoblock: newUser.isMainMonoblock,
                                        showCashiersList: newUser.showCashiersList,
                                        hasChefPrinter: newUser.hasChefPrinter,
                                        printOrderCancellations: newUser.printOrderCancellations,
                                        status: newUser.status,
                                        photoBase64: newUser.photoBase64 ? "stored" : null
                                    });
                                } else if (targetRole === "Kassir" || targetRole === "Menejer") {
                                    if (newUser.acceptCash) perms.push("acceptCash");
                                    if (newUser.canDiscount) perms.push("discounts");
                                    if (newUser.canVoidOrder) perms.push("refunds");
                                    if (newUser.printerIp) customPhone = JSON.stringify({ printerIp: newUser.printerIp });
                                } else if (targetRole === "Ofitsiant") {
                                    if (newUser.acceptCash) perms.push("acceptCash");
                                    if (newUser.canVoidOrder) perms.push("refunds"); // Using refunds string for void capability
                                    
                                    customPhone = JSON.stringify({
                                        assignedZone: newUser.assignedZone
                                    });
                                } else if (targetRole === "Kuryer") {
                                    customPhone = JSON.stringify({
                                        vehiclePlate: newUser.vehiclePlate,
                                        canSelfPickup: newUser.canSelfPickup
                                    });
                                } else if (targetRole === "Oshpaz") {
                                    customPhone = JSON.stringify({
                                        kitchenSection: newUser.kitchenSection,
                                        canViewKds: newUser.canViewKds
                                    });
                                } else if (targetRole === "Omborchi") {
                                    if (newUser.canAuditInventory) perms.push("inventory");
                                    if (newUser.receiveLowStockAlerts) perms.push("stockEdit");
                                    if (newUser.canWriteOff) perms.push("sjisaniya");
                                }

                                createStaffMutation.mutate({
                                    name: newUser.name,
                                    phone: customPhone,
                                    username: autoUsername,
                                    password: newUser.password,
                                    role: newUser.role,
                                    branch: newUser.branch,
                                    permissions: perms,
                                    staffMeta: targetRole === "Ofitsiant" ? { serviceFeePct: newUser.serviceFeePct } : undefined
                                });
                            }} className="btn-primary" disabled={createStaffMutation.isPending}>{createStaffMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}</button>
                        </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingStaff && (
                <div className="glass-card p-5 space-y-4 animate-slide-up border border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">✏️ {editingStaff.name} — ma'lumotlarini tahrirlash</h3>
                        <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">✕</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Ism-sharifi</label>
                            <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="input-field w-full" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Filial</label>
                            <select value={editForm.branch} onChange={e => setEditForm({ ...editForm, branch: e.target.value })} className="input-field w-full">
                                {branches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                                {branches.length === 0 && <option value="Asosiy Filial">Asosiy Filial</option>}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Yangi parol (o'zgartirish uchun)</label>
                            <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="input-field w-full" placeholder="Bo'sh qoldirsa o'zgarmaydi" />
                        </div>
                        {(isManablog || targetRole === "Kassir" || targetRole === "Ofitsiant" || targetRole === "Menejer") && (
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">🖨️ Chek printeri (mijoz cheki)</label>
                                {printersList.length > 0 ? (
                                    <select value={editForm.printerIp} onChange={e => setEditForm({ ...editForm, printerIp: e.target.value })} className="input-field w-full">
                                        <option value="">Printer tanlanmagan</option>
                                        {printersList.map(p => (
                                            <option key={p.id} value={p.ipAddress}>{p.name} ({p.ipAddress})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input value={editForm.printerIp} onChange={e => setEditForm({ ...editForm, printerIp: e.target.value })} className="input-field w-full font-mono" placeholder="192.168.1.100" />
                                )}
                            </div>
                        )}
                    </div>
                    {isManablog && (
                        <div className="grid grid-cols-2 gap-x-12 gap-y-3 max-w-2xl border-t border-slate-700/50 pt-4">
                            {([
                                { key: 'isMainMonoblock', label: 'Asosiy monoblok' },
                                { key: 'showCashiersList', label: 'Kassirlar ro\'yxati' },
                                { key: 'hasChefPrinter', label: 'Oshpaz printeri' },
                                { key: 'printOrderCancellations', label: 'Bekor qilingan chek' },
                            ] as { key: keyof typeof editForm; label: string }[]).map(toggle => (
                                <div key={toggle.key} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-300">{toggle.label}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={!!(editForm as any)[toggle.key]} onChange={e => setEditForm({ ...editForm, [toggle.key]: e.target.checked })} />
                                        <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    {targetRole === "Ofitsiant" && (
                        <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl border-t border-slate-700/50 pt-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Xizmat haqqi (%)</label>
                                <input type="number" min="0" max="100" value={editForm.serviceFeePct} onChange={e => setEditForm({ ...editForm, serviceFeePct: Number(e.target.value) })} className="input-field w-full" placeholder="10" />
                            </div>
                            {[
                                { key: 'acceptCash', label: 'Buyurtmani yopish (To\'lov qabul qilish)' },
                                { key: 'canVoidOrder', label: 'Buyurtmani bekor qilish (O\'chirish)' },
                            ].map(toggle => (
                                <div key={toggle.key} className="flex items-center justify-between col-span-2">
                                    <span className="text-sm font-medium text-slate-400">{toggle.label}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={!!(editForm as any)[toggle.key]} onChange={e => setEditForm({ ...editForm, [toggle.key]: e.target.checked })} />
                                        <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    {targetRole === "Omborchi" && (
                        <div className="grid grid-cols-2 gap-x-12 gap-y-4 max-w-2xl border-t border-slate-700/50 pt-4">
                            {[
                                { key: 'canAuditInventory', label: 'Inventarizatsiya huquqi' },
                                { key: 'receiveLowStockAlerts', label: 'Kam zaxira info. olish' },
                                { key: 'canWriteOff', label: 'Hisobdan chiqarish (Sjisaniya)' },
                            ].map(toggle => (
                                <div key={toggle.key} className="flex items-center justify-between col-span-2">
                                    <span className="text-sm font-medium text-slate-400">{toggle.label}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={!!(editForm as any)[toggle.key]} onChange={e => setEditForm({ ...editForm, [toggle.key]: e.target.checked })} />
                                        <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setEditingStaff(null)} className="btn-secondary">Bekor qilish</button>
                        <button
                            disabled={updateStaffMutation.isPending}
                            onClick={() => {
                                const updateData: any = { name: editForm.name, branch: editForm.branch };
                                if (editForm.password) updateData.password = editForm.password;
                                if (isManablog) {
                                    let existing: any = {};
                                    try { existing = JSON.parse(editingStaff.phone || '{}'); } catch { existing = {}; }
                                    updateData.phone = JSON.stringify({
                                        ...existing,
                                        printerIp: editForm.printerIp,
                                        isMainMonoblock: editForm.isMainMonoblock,
                                        showCashiersList: editForm.showCashiersList,
                                        hasChefPrinter: editForm.hasChefPrinter,
                                        printOrderCancellations: editForm.printOrderCancellations,
                                    });
                                } else if (targetRole === "Kassir" || targetRole === "Menejer" || targetRole === "Ofitsiant") {
                                    let existing: any = {};
                                    try { existing = JSON.parse(editingStaff.phone || '{}'); } catch { existing = {}; }
                                    updateData.phone = JSON.stringify({ ...existing, printerIp: editForm.printerIp });
                                    
                                    if (targetRole === "Ofitsiant") {
                                        updateData.staffMeta = { serviceFeePct: editForm.serviceFeePct };
                                        let perms: string[] = [];
                                        if (editingStaff.permissions) {
                                            try { 
                                                const existingPerms = typeof editingStaff.permissions === 'string' ? JSON.parse(editingStaff.permissions) : editingStaff.permissions;
                                                perms = Array.isArray(existingPerms) ? existingPerms : [];
                                            } catch {}
                                        }
                                        if (editForm.acceptCash && !perms.includes('acceptCash')) perms.push('acceptCash');
                                        if (!editForm.acceptCash) perms = perms.filter(p => p !== 'acceptCash');
                                        if (editForm.canVoidOrder && !perms.includes('refunds')) perms.push('refunds');
                                        if (!editForm.canVoidOrder) perms = perms.filter(p => p !== 'refunds');
                                        updateData.permissions = perms;
                                    }
                                } else if (targetRole === "Omborchi") {
                                    let perms: string[] = [];
                                    if (editingStaff.permissions) {
                                        try { 
                                            const existingPerms = typeof editingStaff.permissions === 'string' ? JSON.parse(editingStaff.permissions) : editingStaff.permissions;
                                            perms = Array.isArray(existingPerms) ? existingPerms : [];
                                        } catch {}
                                    }
                                    if (editForm.canAuditInventory && !perms.includes('inventory')) perms.push('inventory');
                                    if (!editForm.canAuditInventory) perms = perms.filter(p => p !== 'inventory');
                                    
                                    if (editForm.receiveLowStockAlerts && !perms.includes('stockEdit')) perms.push('stockEdit');
                                    if (!editForm.receiveLowStockAlerts) perms = perms.filter(p => p !== 'stockEdit');

                                    if (editForm.canWriteOff && !perms.includes('sjisaniya')) perms.push('sjisaniya');
                                    if (!editForm.canWriteOff) perms = perms.filter(p => p !== 'sjisaniya');

                                    updateData.permissions = perms;
                                }
                                updateStaffMutation.mutate(
                                    { id: editingStaff.id, data: updateData },
                                    { onSuccess: () => { setEditingStaff(null); refetch(); } }
                                );
                            }}
                            className="btn-primary"
                        >
                            {updateStaffMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                        </button>
                    </div>
                </div>
            )}

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-surface-border flex items-center justify-between max-w-sm">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            className="input-field w-full pl-9" 
                            placeholder="Ism yoki login orqali qidirish..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t("staff.employee")}</th>
                            <th>{t("staff.branch")}</th>
                            <th>{t("common.status")}</th>
                            <th>{t("common.actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedStaff.map((s: any) => (
                            <tr key={s.id}>
                                <td>
                                    <div>
                                        <p className="font-medium text-slate-200">{s.name}</p>
                                        <p className="text-xs font-mono text-amber-400 bg-amber-400/10 rounded px-1.5 py-0.5 inline-block mt-0.5">@{s.username}</p>
                                        {isManablog && <p className="text-[10px] text-slate-500 mt-0.5">POS login uchun yuqoridagi username'ni ishlating</p>}
                                    </div>
                                </td>
                                <td>{s.branch}</td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft"></div>
                                        <span className="text-xs font-medium text-emerald-500">Faol</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setShowAddUser(false);
                                                // parse existing settings from phone field
                                                let existingSettings: any = {};
                                                try { existingSettings = JSON.parse(s.phone || '{}'); } catch { existingSettings = {}; }
                                                
                                                let existingMeta: any = {};
                                                try { existingMeta = JSON.parse(s.staffMeta || '{}'); } catch { existingMeta = {}; }
                                                
                                                let perms: string[] = [];
                                                try { perms = typeof s.permissions === 'string' ? JSON.parse(s.permissions) : (s.permissions || []); } catch {}
                                                
                                                setEditForm({
                                                    name: s.name,
                                                    branch: s.branch,
                                                    password: "",
                                                    printerIp: existingSettings.printerIp || "",
                                                    isMainMonoblock: !!existingSettings.isMainMonoblock,
                                                    showCashiersList: !!existingSettings.showCashiersList,
                                                    hasChefPrinter: !!existingSettings.hasChefPrinter,
                                                    printOrderCancellations: !!existingSettings.printOrderCancellations,
                                                    serviceFeePct: existingMeta.serviceFeePct ?? 10,
                                                    acceptCash: perms.includes('acceptCash'),
                                                    canVoidOrder: perms.includes('refunds'),
                                                    canAuditInventory: perms.includes('inventory'),
                                                    receiveLowStockAlerts: perms.includes('stockEdit'),
                                                    canWriteOff: perms.includes('sjisaniya'),
                                                });
                                                setEditingStaff(s);
                                            }}
                                            className="icon-btn text-blue-400 hover:bg-blue-500/10"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => confirm("O'chirishni tasdiqlaysizmi?") && deleteStaffMutation.mutate(s.id)}
                                            className="icon-btn text-rose-400 hover:bg-rose-500/10"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {displayedStaff.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-slate-400">
                                    Hech qanday ma'lumot topilmadi.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
