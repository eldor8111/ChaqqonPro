"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    Plus, Search, FileSpreadsheet, X, Check, ArrowRightLeft,
    RotateCw, AlertTriangle, ChevronDown
} from "lucide-react";
import { useLang } from "@/lib/LangContext";


interface Product {
    id: string;
    name: string;
    unit: string;
    stock: number;
    productType: "xomashyo" | "polfabrikat" | "mahsulot";
}

export default function OmborKochirishPage() {
    const { t } = useLang();
    // ── Mahsulotlar ro'yxati — API dan fresh data ────────────────────────────
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);

    const loadProducts = useCallback(async () => {
        try {
            setProductsLoading(true);
            const [xomRes, menuRes] = await Promise.all([
                fetch("/api/ubt/xomashyo"),
                fetch("/api/ubt/menu?all=1"),
            ]);
            const xomData = xomRes.ok ? await xomRes.json() : [];
            const menuData = menuRes.ok ? await menuRes.json() : { items: [] };
            const menuItems: any[] = Array.isArray(menuData.items) ? menuData.items : [];

            const xomashyo: Product[] = (Array.isArray(xomData) ? xomData : []).map((x: any) => ({
                id: x.id,
                name: x.name,
                unit: x.unit || "kg",
                stock: Number(x.stock) || 0,
                productType: x.type === "polfabrikat" ? "polfabrikat" : "xomashyo",
            }));

            const mahsulot: Product[] = menuItems
                .filter((m: any) => m.type === "mahsulot" || !m.type)
                .map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    unit: m.unit || "dona",
                    stock: Number(m.stock) || 0,
                    productType: "mahsulot" as const,
                }));

            setAllProducts([...xomashyo, ...mahsulot]);
        } catch (e) {
            console.error("Mahsulotlar yuklanmadi:", e);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    const [transfers, setTransfers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        productId: "", productName: "", quantity: "",
        fromWarehouse: "Asosiy Ombor", toWarehouse: "Oshxona Ombori",
        employee: "", notes: "", unit: "kg", productType: "",
    });
    const [prodSearch, setProdSearch] = useState("");
    const [isComboOpen, setIsComboOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const comboRef = useRef<HTMLDivElement>(null);

    const fetchTransfers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/ombor/kochirish");
            if (res.ok) setTransfers(await res.json());
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const [staffList, setStaffList] = useState<any[]>([]);

    const fetchStaff = async () => {
        try {
            const res = await fetch("/api/ubt/staff");
            if (res.ok) {
                const data = await res.json();
                setStaffList(data.staff || (Array.isArray(data) ? data : []));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchTransfers(); loadProducts(); fetchStaff(); }, [loadProducts]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (comboRef.current && !comboRef.current.contains(e.target as Node)) setIsComboOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filteredProds = allProducts.filter(p =>
        !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase())
    );

    const selectedProd = allProducts.find(p => p.id === formData.productId);
    const maxQty = selectedProd?.stock ?? 0;
    const isOverQty = Number(formData.quantity) > maxQty;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productId) return alert("Mahsulotni tanlang.");
        if (Number(formData.quantity) <= 0) return alert("Miqdorni kiriting.");
        if (isOverQty) return alert(`Ombordan ${maxQty} ${formData.unit} dan ko'p ko'chirib bo'lmaydi.`);
        if (formData.fromWarehouse === formData.toWarehouse) return alert("Dari va ga bir xil ombor bo'lmasin.");

        setIsSaving(true);
        try {
            const qty = Number(formData.quantity);
            const res = await fetch("/api/ubt/ombor/kochirish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: new Date(), ...formData, quantity: qty }),
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ productId: "", productName: "", quantity: "", fromWarehouse: "Asosiy Ombor", toWarehouse: "Oshxona Ombori", employee: "", notes: "", unit: "kg", productType: "" });
                setProdSearch("");
                // DB dan fresh ma'lumot yuklash
                await Promise.all([fetchTransfers(), loadProducts()]);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Xatolik yuz berdi");
            }
        } catch (err) { console.error(err); }
        finally { setIsSaving(false); }
    };

    const filtered = transfers.filter(t =>
        t.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.fromWarehouse?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.toWarehouse?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const WAREHOUSES = ["Asosiy Ombor", "Oshxona Ombori", "Bar Ombori", "Filial Ombori"];

    return (
        <div className="animate-fade-in bg-slate-50 min-h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t('nav.ombor_kochirish')}</h1>
                        <p className="text-sm text-slate-500 mt-1">{t('common.subtitle_transfer')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm">
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                        <button onClick={() => { setIsModalOpen(true); loadProducts(); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-500/30 hover:-translate-y-0.5">
                            <Plus size={18} strokeWidth={2.5} /> {t('common.add')} {t('nav.ombor_kochirish')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm gap-4">
                    <div className="w-full sm:flex-1 sm:max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input type="text" placeholder="Qidiruv (mahsulot yoki ombor)..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg text-sm font-medium outline-none text-slate-700 focus:ring-2 focus:ring-sky-100" />
                    </div>
                    <button onClick={fetchTransfers} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                        <RotateCw size={17} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <div className="px-4 py-2 bg-sky-50 text-sky-700 rounded-lg text-sm font-bold border border-sky-100">{filtered.length} ta</div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                <tr>
                                    <th className="px-5 py-4">{t('common.date')}</th>
                                    <th className="px-5 py-4">{t('inventory.totalProducts')}</th>
                                    <th className="px-5 py-4">{t('nav.ombor')} (Qayerdan)</th>
                                    <th className="px-5 py-4">{t('nav.ombor')} (Qayerga)</th>
                                    <th className="px-5 py-4">{t('inventory.unit') || 'Miqdori'}</th>
                                    <th className="px-5 py-4">{t('staff.employee')}</th>
                                    <th className="px-5 py-4">{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="py-16 text-center"><RotateCw className="animate-spin mx-auto text-sky-400" size={28} /></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-16 text-center text-slate-400 text-sm">{t('common.noData')}</td></tr>
                                ) : filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(item.createdAt).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{item.productName}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold">{item.fromWarehouse}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">{item.toWarehouse}</span>
                                        </td>
                                        <td className="px-5 py-3.5 font-bold text-sky-600 whitespace-nowrap">
                                            {Number(item.quantity).toLocaleString()} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500">{item.employee || "—"}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2.5 py-1 bg-sky-100 text-sky-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">Ko&apos;chirildi</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-sky-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
                                    <ArrowRightLeft size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-sky-900">{t('common.add')} {t('nav.ombor_kochirish')}</h2>
                                    <p className="text-xs text-sky-600">Ombor A → Ombor B</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {/* Product combobox */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('inventory.totalProducts')} <span className="text-red-500">*</span></label>
                                <div ref={comboRef} className="relative">
                                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all"
                                        onClick={() => setIsComboOpen(true)}>
                                        <Search size={15} className="ml-3 text-slate-400 shrink-0" />
                                        <input type="text" placeholder="Xomashyo yoki polfabrikat qidiring..."
                                            value={prodSearch}
                                            onChange={e => { setProdSearch(e.target.value); setIsComboOpen(true); setFormData(f => ({ ...f, productId: "", productName: "" })); }}
                                            className="w-full px-3 py-3 text-sm outline-none bg-transparent" />
                                        <ChevronDown size={15} className={`mr-3 text-slate-400 transition-transform ${isComboOpen ? "rotate-180" : ""}`} />
                                    </div>
                                    {isComboOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                            {filteredProds.length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-slate-400">{t('common.noData')}</div>
                                            ) : filteredProds.map(prod => (
                                                <button key={prod.id} type="button"
                                                    onClick={() => { setFormData(f => ({ ...f, productId: prod.id, productName: prod.name, unit: prod.unit, productType: prod.productType })); setProdSearch(prod.name); setIsComboOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-sky-50 flex items-center justify-between group">
                                                    <div>
                                                        <span className="text-sm font-semibold text-slate-800 group-hover:text-sky-700">{prod.name}</span>
                                                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${prod.productType === "xomashyo" ? "bg-orange-100 text-orange-600" : "bg-purple-100 text-purple-600"}`}>
                                                            {prod.productType === "xomashyo" ? "X" : "P"}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-slate-400">Qoldiq: {prod.stock} {prod.unit}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedProd && (
                                    <p className="text-xs text-sky-600 font-medium">Hozirgi qoldiq: <b>{selectedProd.stock} {selectedProd.unit}</b></p>
                                )}
                            </div>

                            {/* Quantity */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('inventory.unit') || 'Miqdori'} <span className="text-red-500">*</span></label>
                                <div className="flex border border-slate-200 rounded-xl overflow-hidden focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                                    <input type="number" step="0.01" min="0" placeholder="0"
                                        value={formData.quantity}
                                        onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))}
                                        className="w-full px-4 py-3 outline-none text-sm font-bold bg-transparent" />
                                    <select value={formData.unit} onChange={e => setFormData(f => ({ ...f, unit: e.target.value }))}
                                        className="px-3 py-3 bg-slate-50 outline-none text-xs font-medium text-slate-600 border-l border-slate-200">
                                        {["kg", "litr", "dona", "qop", "blok", "sht", "gr", "ml"].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                                {isOverQty && <p className="text-xs text-red-500 font-semibold">⚠️ Ombordan {maxQty} {formData.unit} dan ko&apos;p ko&apos;chirib bo&apos;lmaydi</p>}
                            </div>

                            {/* Warehouses */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('nav.ombor')} (Qayerdan)</label>
                                    <select value={formData.fromWarehouse} onChange={e => setFormData(f => ({ ...f, fromWarehouse: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 text-orange-800 font-semibold outline-none focus:border-orange-400 text-sm transition-all">
                                        {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('nav.ombor')} (Qayerga)</label>
                                    <select value={formData.toWarehouse} onChange={e => setFormData(f => ({ ...f, toWarehouse: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold outline-none focus:border-emerald-400 text-sm transition-all">
                                        {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Employee + notes */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('staff.employee')}</label>
                                    <select
                                        value={formData.employee}
                                        onChange={e => setFormData(f => ({ ...f, employee: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-sky-500 text-sm transition-all bg-white"
                                    >
                                        <option value="" disabled>Mas'ul xodimni tanlang...</option>
                                        <option value="Omborchi">Omborchi (Standart)</option>
                                        {staffList.filter(s => s.role !== "POS apparati").map(s => (
                                            <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Izoh</label>
                                    <input type="text" placeholder="Sabab..."
                                        value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-sky-500 text-sm transition-all" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2 text-sky-600 bg-sky-50 px-3 py-2 rounded-lg text-xs font-medium border border-sky-200">
                                    <AlertTriangle size={14} /> Umumiy stock o&apos;zgarmaydi, faqat saqlash joyi.
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">
                                        {t('common.cancel')}
                                    </button>
                                    <button type="submit" disabled={isSaving || isOverQty}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-500/30 hover:bg-sky-700 hover:-translate-y-0.5 transition-all disabled:opacity-60">
                                        {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
                                        {t('nav.ombor_kochirish')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
