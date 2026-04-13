"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/frontend/api";
import { Plus, Search, Edit2, Trash2, X, Monitor, Camera } from "lucide-react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { PhoneInput } from "@/components/ui/PhoneInput";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModuleCRUD { c: boolean; r: boolean; u: boolean; d: boolean }

interface PosPermissions {
    posDevice: {
        printerIp: string;
        mainMonoblock: boolean;
        cashierList: boolean;
        chefPrinter: boolean;
        cancelPrint: boolean;
    };
    modules: Record<string, ModuleCRUD>;
    orderTypes: { takeaway: boolean; table: boolean; delivery: boolean; new: boolean };
}

const PERMISSION_MODULES = [
    { id: "main",           label: "Asosiy" },
    { id: "warehouse",      label: "Omborxona (Tovar qoldig'i)" },
    { id: "goodsReceipt",   label: "Tovar kelishi" },
    { id: "goodsExpense",   label: "Tovar chiqishi" },
    { id: "receiptJournal", label: "Kelishlar jurnali" },
    { id: "semifinished",   label: "Yarim tayyor kategoriyalari" },
    { id: "saleCats",       label: "Realizatsiya kategoriyalari" },
    { id: "reservation",    label: "Bron" },
    { id: "ordersEdit",     label: "Buyurtmalar (o'zgartirish, o'chirish)" },
];

const emptyCRUD = (): ModuleCRUD => ({ c: false, r: false, u: false, d: false });

const defaultPosPermissions = (): PosPermissions => ({
    posDevice: { printerIp: "", mainMonoblock: false, cashierList: false, chefPrinter: false, cancelPrint: false },
    modules: Object.fromEntries(PERMISSION_MODULES.map(m => [m.id, emptyCRUD()])),
    orderTypes: { takeaway: false, table: false, delivery: false, new: false },
});

const SIMPLE_PERMISSIONS = [
    { id: "pos",          label: "Kassadan foydalanish" },
    { id: "cancel_order", label: "Buyurtmani bekor qilish" },
    { id: "discount",     label: "Chegirma qo'llash" },
    { id: "reports",      label: "Hisobotlarni ko'rish" },
    { id: "menu",         label: "Menyuni tahrirlash" },
    { id: "settings",     label: "Sozlamalarga kirish" },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES = ["Kassir", "Ofitsiant", "Kuryer", "POS apparati"];
const BRANCHES = ["Asosiy Zal", "Teras", "VIP Xona", "Kassa", "Barcha Filiallar"];
const ROLE_COLOR: Record<string, string> = {
    Kassir:          "bg-emerald-500/20 text-emerald-400",
    Ofitsiant:       "bg-blue-500/20 text-blue-400",
    Kuryer:          "bg-amber-500/20 text-amber-400",
    "POS apparati":  "bg-sky-500/20 text-sky-400",
};

const emptyForm = {
    name: "", role: "Ofitsiant", branch: "Asosiy Zal",
    username: "", password: "", phone: "", status: "active",
    simplePerms: [] as string[],
    posPerms: defaultPosPermissions(),
};

// ─── Toggle Component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0",
                checked ? "bg-blue-500" : "bg-gray-200"
            )}
        >
            <span className={clsx(
                "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                checked ? "translate-x-6" : "translate-x-1"
            )} />
        </button>
    );
}

// ─── POS Apparat Form ─────────────────────────────────────────────────────────

function PosApparatForm({
    form, editingId, onChange, onSave, onClose, isPending,
}: {
    form: typeof emptyForm;
    editingId: string | null;
    onChange: (u: Partial<typeof emptyForm>) => void;
    onSave: () => void;
    onClose: () => void;
    isPending: boolean;
}) {
    const p = form.posPerms;

    const setPosDevice = (key: keyof typeof p.posDevice, value: boolean | string) =>
        onChange({ posPerms: { ...p, posDevice: { ...p.posDevice, [key]: value } } });

    const setModule = (id: string, key: keyof ModuleCRUD, value: boolean) =>
        onChange({ posPerms: { ...p, modules: { ...p.modules, [id]: { ...p.modules[id], [key]: value } } } });

    const setModuleAll = (id: string, value: boolean) =>
        onChange({ posPerms: { ...p, modules: { ...p.modules, [id]: { c: value, r: value, u: value, d: value } } } });

    const setOrderType = (key: keyof typeof p.orderTypes, value: boolean) =>
        onChange({ posPerms: { ...p, orderTypes: { ...p.orderTypes, [key]: value } } });

    const canSave = !!form.name.trim() && !!form.username.trim() && (!!editingId || !!form.password.trim());

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 h-full w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="font-semibold text-gray-800 text-[15px]">
                        {editingId ? "POS Apparatni tahrirlash" : "POS Apparat qo'shish"}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {/* Photo + Name */}
                    <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                            <Camera size={20} className="text-gray-300 group-hover:text-blue-400 mb-1" />
                            <span className="text-[10px] text-gray-400 text-center leading-tight">Rasm<br/>yuklash</span>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Nomi <span className="text-red-500">*</span></label>
                            <input
                                value={form.name}
                                onChange={e => onChange({ name: e.target.value })}
                                placeholder="Terminal nomi"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    {/* Login / Password / IP / Branch */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Login <span className="text-red-500">*</span></label>
                            <input
                                value={form.username}
                                onChange={e => onChange({ username: e.target.value })}
                                placeholder="pos_apparat_1"
                                disabled={!!editingId}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">
                                {editingId ? "Yangi parol (ixtiyoriy)" : "Parol"}{!editingId && <span className="text-red-500"> *</span>}
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={e => onChange({ password: e.target.value })}
                                placeholder="••••••"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">IP Printer manzili <span className="text-red-500">*</span></label>
                            <input
                                value={p.posDevice.printerIp}
                                onChange={e => setPosDevice("printerIp", e.target.value)}
                                placeholder="192.168.1.100"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Bo'lim</label>
                            <select
                                value={form.branch}
                                onChange={e => onChange({ branch: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                            >
                                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Device Toggles */}
                    <div className="space-y-0 divide-y divide-gray-100">
                        {[
                            { key: "status",        label: "Holat",                       checked: form.status === "active",          onChg: (v: boolean) => onChange({ status: v ? "active" : "inactive" }) },
                            { key: "mainMonoblock", label: "Asosiy monoblock",             checked: p.posDevice.mainMonoblock,         onChg: (v: boolean) => setPosDevice("mainMonoblock", v) },
                            { key: "cashierList",   label: "Kassirlar ro'yxati",           checked: p.posDevice.cashierList,           onChg: (v: boolean) => setPosDevice("cashierList", v) },
                            { key: "chefPrinter",   label: "Oshpaz printer",               checked: p.posDevice.chefPrinter,           onChg: (v: boolean) => setPosDevice("chefPrinter", v) },
                            { key: "cancelPrint",   label: "Buyurtma bekorini chop etish", checked: p.posDevice.cancelPrint,           onChg: (v: boolean) => setPosDevice("cancelPrint", v) },
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between py-3">
                                <span className="text-sm text-gray-700">{item.label}</span>
                                <Toggle checked={item.checked} onChange={item.onChg} />
                            </div>
                        ))}
                    </div>

                    {/* Module Permissions */}
                    <div className="border-t border-gray-100 pt-2 space-y-0 divide-y divide-gray-50">
                        {PERMISSION_MODULES.map(mod => {
                            const m = p.modules[mod.id] || emptyCRUD();
                            const allOn = m.c && m.r && m.u && m.d;
                            return (
                                <div key={mod.id} className="py-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">{mod.label}</span>
                                        <Toggle checked={allOn} onChange={v => setModuleAll(mod.id, v)} />
                                    </div>
                                    <div className="flex items-center gap-5 pl-1">
                                        {(["c","r","u","d"] as const).map((key, i) => (
                                            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                                                <Toggle checked={m[key]} onChange={v => setModule(mod.id, key, v)} />
                                                <span className="text-xs text-gray-400">{["Yaratish","Ko'rish","Yangilash","O'chirish"][i]}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Order Types */}
                        <div className="py-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Buyurtmalar (turlari)</span>
                                <Toggle
                                    checked={p.orderTypes.takeaway && p.orderTypes.table && p.orderTypes.delivery && p.orderTypes.new}
                                    onChange={v => onChange({ posPerms: { ...p, orderTypes: { takeaway: v, table: v, delivery: v, new: v } } })}
                                />
                            </div>
                            <div className="flex items-center gap-4 pl-1 flex-wrap">
                                {([
                                    { key: "takeaway", label: "Olib ketish" },
                                    { key: "table",    label: "Stolga" },
                                    { key: "delivery", label: "Yetkazib berish" },
                                    { key: "new",      label: "Yangi" },
                                ] as const).map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                                        <Toggle checked={p.orderTypes[key]} onChange={v => setOrderType(key, v)} />
                                        <span className="text-xs text-gray-400">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                        Bekor qilish
                    </button>
                    <button type="button" onClick={onSave} disabled={isPending || !canSave} className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isPending ? "Saqlanmoqda..." : (editingId ? "Saqlash" : "Qo'shish")}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Regular Staff Form ────────────────────────────────────────────────────────

function RegularStaffForm({
    form, editingId, onChange, onSave, onClose, isPending,
}: {
    form: typeof emptyForm;
    editingId: string | null;
    onChange: (u: Partial<typeof emptyForm>) => void;
    onSave: () => void;
    onClose: () => void;
    isPending: boolean;
}) {
    const togglePerm = (id: string) =>
        onChange({ simplePerms: form.simplePerms.includes(id) ? form.simplePerms.filter(p => p !== id) : [...form.simplePerms, id] });

    const canSave = !!form.name.trim() && !!form.username.trim() && (!!editingId || !!form.password.trim());

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 h-full w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="font-semibold text-gray-800 text-[15px]">{editingId ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Photo + Name */}
                    <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                            <Camera size={20} className="text-gray-300 group-hover:text-blue-400 mb-1" />
                            <span className="text-[10px] text-gray-400 text-center leading-tight">Rasm<br/>yuklash</span>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Ism Familiya <span className="text-red-500">*</span></label>
                            <input value={form.name} onChange={e => onChange({ name: e.target.value })} placeholder="Nodir Aliyev"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Login <span className="text-red-500">*</span></label>
                            <input value={form.username} onChange={e => onChange({ username: e.target.value })} placeholder="nodir_ofitsiant"
                                disabled={!!editingId}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">{editingId ? "Yangi parol" : "Parol"}{!editingId && <span className="text-red-500"> *</span>}</label>
                            <input type="password" value={form.password} onChange={e => onChange({ password: e.target.value })} placeholder="••••••"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Lavozim</label>
                            <select value={form.role} onChange={e => onChange({ role: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white">
                                {ROLES.filter(r => r !== "POS apparati").map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Bo'lim</label>
                            <select value={form.branch} onChange={e => onChange({ branch: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white">
                                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Telefon</label>
                            <PhoneInput value={form.phone} onChange={val => onChange({ phone: val })} 
                                className="w-full text-sm border border-gray-200 rounded-lg focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 bg-white" />
                        </div>
                        {editingId && (
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Holat</label>
                                <select value={form.status} onChange={e => onChange({ status: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white">
                                    <option value="active">Faol</option>
                                    <option value="inactive">Nofaol</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Permissions */}
                    <div className="border-t border-gray-100 pt-4 space-y-0 divide-y divide-gray-50">
                        {SIMPLE_PERMISSIONS.map(perm => (
                            <div key={perm.id} className="flex items-center justify-between py-3">
                                <span className="text-sm text-gray-700">{perm.label}</span>
                                <Toggle checked={form.simplePerms.includes(perm.id)} onChange={() => togglePerm(perm.id)} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                        Bekor qilish
                    </button>
                    <button type="button" onClick={onSave} disabled={isPending || !canSave} className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isPending ? "Saqlanmoqda..." : (editingId ? "Saqlash" : "Qo'shish")}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function UbtStaffContent() {
    const qc = useQueryClient();
    const searchParams = useSearchParams();
    const roleQuery = searchParams.get("role");

    const [roleFilter, setRoleFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [showPosForm, setShowPosForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm, posPerms: defaultPosPermissions() });

    const updateForm = (updates: Partial<typeof emptyForm>) => setForm(f => ({ ...f, ...updates }));

    useEffect(() => {
        if (roleQuery && ROLES.includes(roleQuery)) setRoleFilter(roleQuery);
        else setRoleFilter("all");
    }, [roleQuery]);

    const { data, isLoading, isError, error: queryError } = useQuery({
        queryKey: ["staff"],
        queryFn: () => api.staff.list(),
        retry: 2,
    });

    const allStaff: any[] = (data as any)?.staff ?? (Array.isArray(data) ? data : []);
    const ubtStaff = allStaff.filter((s: any) => ROLES.includes(s.role));

    const buildPayload = () => {
        const isPosDevice = form.role === "POS apparati";
        const permissions = isPosDevice ? form.posPerms : form.simplePerms;
        const base: any = { name: form.name, username: form.username, role: form.role, branch: form.branch, phone: form.phone || "", status: form.status, permissions };
        if (form.password) base.password = form.password;
        return base;
    };

    const createMutation = useMutation({
        mutationFn: (d: any) => api.staff.create(d),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); closeAll(); },
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, d }: any) => api.staff.update(id, d),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); closeAll(); },
    });
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.staff.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
    });

    const closeAll = () => { setShowForm(false); setShowPosForm(false); setEditingId(null); setForm({ ...emptyForm, posPerms: defaultPosPermissions() }); };

    const openNew = (role?: string) => {
        const newRole = role || "Ofitsiant";
        setEditingId(null);
        setForm({ ...emptyForm, posPerms: defaultPosPermissions(), role: newRole });
        if (newRole === "POS apparati") setShowPosForm(true);
        else setShowForm(true);
    };

    const openEdit = (s: any) => {
        setEditingId(s.id);
        const isPosDevice = s.role === "POS apparati";
        let simplePerms: string[] = [];
        let posPerms = defaultPosPermissions();
        if (isPosDevice && s.permissions && typeof s.permissions === "object" && !Array.isArray(s.permissions)) {
            posPerms = { posDevice: { ...posPerms.posDevice, ...s.permissions.posDevice }, modules: { ...posPerms.modules, ...s.permissions.modules }, orderTypes: { ...posPerms.orderTypes, ...s.permissions.orderTypes } };
        } else if (Array.isArray(s.permissions)) {
            simplePerms = s.permissions;
        }
        setForm({ name: s.name || "", role: s.role || "Ofitsiant", branch: s.branch || "Asosiy Zal", username: s.username || "", password: "", phone: s.phone || "", status: s.status || "active", simplePerms, posPerms });
        if (isPosDevice) setShowPosForm(true);
        else setShowForm(true);
    };

    const handleSave = () => {
        if (!form.name.trim() || !form.username.trim()) return;
        const payload = buildPayload();
        if (editingId) {
            const { username, ...rest } = payload;
            updateMutation.mutate({ id: editingId, d: rest });
        } else {
            if (!form.password) return;
            createMutation.mutate(payload);
        }
    };

    const filtered = ubtStaff.filter((s: any) => {
        const m = s.name?.toLowerCase().includes(search.toLowerCase()) || s.username?.toLowerCase().includes(search.toLowerCase());
        return m && (roleFilter === "all" || s.role === roleFilter);
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Xodimlar (UBT)</h1>
                    <p className="text-sm text-slate-400 mt-1">{filtered.length} ta xodim</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => openNew("POS apparati")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30 transition-colors text-sm font-medium">
                        <Monitor size={15} /> POS Apparat
                    </button>
                    <button onClick={() => openNew(roleFilter !== "all" && roleFilter !== "POS apparati" ? roleFilter : "Ofitsiant")} className="btn-primary flex items-center gap-2">
                        <Plus size={16} /> Xodim qo'shish
                    </button>
                </div>
            </div>

            {/* KPI Filters */}
            <div className="flex gap-4">
                <div onClick={() => setRoleFilter("all")} className={clsx("flex-1 cursor-pointer transition-all border p-4 rounded-xl", roleFilter === "all" ? "bg-brand/10 border-brand text-brand" : "glass-card border-surface-border hover:bg-surface-elevated")}>
                    <p className="text-2xl font-bold">{ubtStaff.length}</p>
                    <p className="text-sm opacity-80 mt-1">Barchasi</p>
                </div>
                {ROLES.map(role => {
                    const count = ubtStaff.filter((s: any) => s.role === role).length;
                    return (
                        <div key={role} onClick={() => setRoleFilter(role)} className={clsx("flex-1 cursor-pointer transition-all border p-4 rounded-xl", roleFilter === role ? "bg-brand/10 border-brand text-brand" : "glass-card border-surface-border hover:bg-surface-elevated")}>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-sm opacity-80 mt-1">{role}</p>
                        </div>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ism yoki username..." className="input-field pl-9" />
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Xodim</th><th>Username</th><th>Lavozim</th><th>Bo'lim</th><th>Telefon</th><th>Holat</th><th>Harakat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={7} className="text-center text-slate-500 py-8">Yuklanmoqda...</td></tr>
                        ) : isError ? (
                            <tr><td colSpan={7} className="text-center text-red-400 py-8">{(queryError as any)?.message}</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="text-center text-slate-500 py-8">Xodim topilmadi</td></tr>
                        ) : filtered.map((s: any) => (
                            <tr key={s.id}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", ROLE_COLOR[s.role] ?? "bg-slate-500/20 text-slate-400")}>
                                            {s.role === "POS apparati" ? <Monitor size={14} /> : (s.name?.[0]?.toUpperCase() ?? "?")}
                                        </div>
                                        <span className="font-medium text-slate-800">{s.name}</span>
                                    </div>
                                </td>
                                <td className="text-slate-400 font-mono text-sm">{s.username}</td>
                                <td><span className={clsx("px-2 py-0.5 rounded text-xs font-medium", ROLE_COLOR[s.role] ?? "bg-slate-500/20 text-slate-400")}>{s.role}</span></td>
                                <td className="text-slate-400 text-sm">{s.branch}</td>
                                <td className="text-slate-400 text-sm">{s.phone || "—"}</td>
                                <td>
                                    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", s.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                                        {s.status === "active" ? "Faol" : "Nofaol"}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-surface-elevated hover:bg-brand/20 text-slate-400 hover:text-brand transition-all"><Edit2 size={14} /></button>
                                        <button onClick={() => deleteMutation.mutate(s.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded-lg bg-surface-elevated hover:bg-danger/20 text-slate-400 hover:text-danger transition-all"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showPosForm && <PosApparatForm form={form} editingId={editingId} onChange={updateForm} onSave={handleSave} onClose={closeAll} isPending={isPending} />}
            {showForm && <RegularStaffForm form={form} editingId={editingId} onChange={updateForm} onSave={handleSave} onClose={closeAll} isPending={isPending} />}
        </div>
    );
}

export default function UbtStaffPage() {
    return (
        <Suspense fallback={<div>Yuklanmoqda...</div>}>
            <UbtStaffContent />
        </Suspense>
    );
}
