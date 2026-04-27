"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    Plus, Search, FileSpreadsheet, X, Check, ArrowUpRight,
    RotateCw, AlertTriangle, ChevronDown
} from "lucide-react";
import { useLang } from "@/lib/LangContext";


interface Product {
    id: string;
    name: string;
    unit: string;
    stock: number;
    price: number;
    productType: "xomashyo" | "polfabrikat" | "mahsulot" | "taom";
}

export default function OmborChiqimPage() {
    const { t } = useLang();
    const [searchQuery, setSearchQuery] = useState("");
    const [chiqimlar, setChiqimlar] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Mahsulotlar ro'yxati (API dan) ─────────────────────────────────────
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
                price: Number(x.price) || 0,
                productType: x.type === "polfabrikat" ? "polfabrikat" : "xomashyo",
            }));

            const mahsulot: Product[] = menuItems.map((t: any) => ({
                id: t.id,
                name: t.name,
                unit: t.unit || "dona",
                stock: Number(t.stock) || 0,
                price: Number(t.cost || t.price) || 0,
                productType: "mahsulot",
            }));

            setAllProducts([...xomashyo, ...mahsulot]);
        } catch (e) {
            console.error("Mahsulotlar yuklanmadi:", e);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        productId: "",
        productName: "",
        productType: "",
        quantity: "",
        reason: "prep",
        fromWarehouse: "Asosiy Ombor",
        employee: "Omborchi",
        notes: "",
        unit: "dona",
    });
    const [isSaving, setIsSaving] = useState(false);

    // Combobox state
    const [prodSearch, setProdSearch] = useState("");
    const [isComboOpen, setIsComboOpen] = useState(false);
    const comboRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (comboRef.current && !comboRef.current.contains(e.target as Node)) setIsComboOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filteredProds = useMemo(() =>
        allProducts.filter(p => !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase())),
        [allProducts, prodSearch]
    );

    const selectedProd = allProducts.find(p => p.id === formData.productId);
    const maxQty = selectedProd?.stock ?? 0;
    const isOverQty = Number(formData.quantity) > maxQty && maxQty > 0;

    const selectProduct = (prod: Product) => {
        setFormData(f => ({
            ...f,
            productId: prod.id,
            productName: prod.name,
            productType: prod.productType,
            unit: prod.unit,
        }));
        setProdSearch(prod.name);
        setIsComboOpen(false);
    };

    const openModal = () => {
        setIsModalOpen(true);
        loadProducts();
    };

    const [staffList, setStaffList] = useState<any[]>([]);

    const fetchChiqimlar = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/ombor/chiqim");
            if (res.ok) {
                const data = await res.json();
                setChiqimlar(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await fetch("/api/ubt/staff");
            if (res.ok) {
                const data = await res.json();
                setStaffList(data.staff || (Array.isArray(data) ? data : []));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchChiqimlar(); fetchStaff(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productId) return alert("Mahsulotni tanlang.");
        if (Number(formData.quantity) <= 0) return alert("Miqdorni kiriting.");
        if (isOverQty) return alert(`Ombordan faqat ${maxQty} ${formData.unit} mavjud.`);

        setIsSaving(true);
        try {
            const res = await fetch("/api/ubt/ombor/chiqim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: new Date(),
                    productId: formData.productId,
                    productName: formData.productName,
                    productType: formData.productType,
                    quantity: Number(formData.quantity),
                    unit: formData.unit,
                    reason: formData.reason,
                    fromWarehouse: formData.fromWarehouse,
                    employee: formData.employee,
                    notes: formData.notes,
                })
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ productId: "", productName: "", productType: "", quantity: "", reason: "prep", fromWarehouse: "Asosiy Ombor", employee: "Omborchi", notes: "", unit: "dona" });
                setProdSearch("");
                fetchChiqimlar();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Xatolik yuz berdi");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const filtered = chiqimlar.filter(c =>
        c.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getReasonLabel = (r: string) => {
        switch (r) {
            case 'sale': return "Sotuv";
            case 'damage': return "Yaroqsiz";
            case 'writeoff': return "Hisobdan chiqarish";
            case 'prep': return "Oshxonaga (Tayyorgarlik)";
            default: return r;
        }
    };

    const getTypeLabel = (t: string) => {
        if (t === "xomashyo") return "Xomashyo";
        if (t === "polfabrikat") return "Polfabrikat";
        return "Mahsulot";
    };

    return (
        <div className="animate-fade-in relative bg-white border border-slate-200 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-7 bg-amber-500 rounded text-transparent">|</div>
                    <h1 className="text-xl sm:text-[22px] font-bold text-slate-800">{t('nav.ombor_chiqim')}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all font-bold shadow-lg shadow-emerald-500/30">
                        <FileSpreadsheet size={16} /> EXCEL
                    </button>
                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm hover:from-amber-600 hover:to-orange-600 transition-all font-bold shadow-lg shadow-orange-500/30 hover:-translate-y-0.5">
                        <Plus size={16} strokeWidth={2.5} /> {t('common.add')} {t('nav.ombor_chiqim')}
                    </button>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="w-full sm:flex-1 sm:max-w-[300px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('common.search') + '...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 placeholder:text-slate-300 transition-all"
                    />
                </div>
                <button onClick={fetchChiqimlar} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                    <RotateCw size={16} className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="p-4 overflow-x-auto flex-1">
                <table className="w-full text-xs text-left whitespace-nowrap border-separate border-spacing-y-2">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                            <th className="px-4 py-3 rounded-l-xl">{t('common.date')}</th>
                            <th className="px-4 py-3">{t('inventory.totalProducts')}</th>
                            <th className="px-4 py-3">{t('nav.ombor')}</th>
                            <th className="px-4 py-3">{t('inventory.category')}</th>
                            <th className="px-4 py-3">{t('common.units')}</th>
                            <th className="px-4 py-3">{t('staff.employee')}</th>
                            <th className="px-4 py-3 rounded-r-xl">{t('common.status')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {isLoading ? (
                            <tr><td colSpan={7} className="text-center py-10"><RotateCw className="animate-spin mx-auto text-amber-500" /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-slate-500">{t('common.noData')}</td></tr>
                        ) : (
                            filtered.map((item) => (
                                <tr key={item.id} className="bg-white border hover:shadow-sm transition-all group">
                                    <td className="px-4 py-3 border-y border-l rounded-l-xl border-slate-100">
                                        {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100 font-medium text-blue-700">{item.productName}</td>
                                    <td className="px-4 py-3 border-y border-slate-100">{item.fromWarehouse}</td>
                                    <td className="px-4 py-3 border-y border-slate-100">{getReasonLabel(item.reason)}</td>
                                    <td className="px-4 py-3 border-y border-slate-100 font-bold text-amber-600">
                                        -{item.quantity} <span className="text-xs text-amber-500/70 font-normal">{item.unit}</span>
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100">{item.employee}</td>
                                    <td className="px-4 py-3 border-y border-r rounded-r-xl border-slate-100">
                                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold uppercase tracking-wider">{t('nav.ombor_chiqim')}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                    <ArrowUpRight size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-amber-900">{t('common.add')} {t('nav.ombor_chiqim')}</h2>
                                    <p className="text-xs text-amber-700/70">{t('nav.ombor')}dan {t('inventory.totalProducts')} chiqarish</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6">
                            <div className="grid grid-cols-2 gap-5">

                                {/* ── Mahsulot Combobox ───────────────────────────────── */}
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Mahsulot <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative" ref={comboRef}>
                                        <div
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${isComboOpen ? "border-amber-500 ring-4 ring-amber-500/10" : "border-slate-200 hover:border-amber-400"}`}
                                            onClick={() => { setIsComboOpen(v => !v); if (!isComboOpen) setProdSearch(""); }}
                                        >
                                            {formData.productId ? (
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-medium text-slate-800 truncate">{formData.productName}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold shrink-0">{getTypeLabel(formData.productType)}</span>
                                                    {selectedProd && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold shrink-0">
                                                            Qoldiq: {selectedProd.stock} {selectedProd.unit}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">{productsLoading ? t('common.loading') : t('inventory.totalProducts') + '...'}</span>
                                            )}
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-2 ${isComboOpen ? "rotate-180" : ""}`} />
                                        </div>

                                        {isComboOpen && (
                                            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                                                <div className="p-2 border-b border-slate-100">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Qidirish..."
                                                        value={prodSearch}
                                                        onChange={e => setProdSearch(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400"
                                                    />
                                                </div>
                                                <div className="max-h-52 overflow-y-auto">
                                                    {filteredProds.length === 0 ? (
                                                        <p className="text-center text-sm text-slate-400 py-4">{t('common.noData')}</p>
                                                    ) : filteredProds.map(p => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => selectProduct(p)}
                                                            className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-amber-50 transition-colors ${formData.productId === p.id ? "bg-amber-50" : ""}`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-sm font-medium text-slate-800 truncate">{p.name}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold shrink-0">{getTypeLabel(p.productType)}</span>
                                                            </div>
                                                            <span className="text-xs text-slate-500 shrink-0 ml-2">{p.stock} {p.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {isOverQty && (
                                        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                            <AlertTriangle size={12} /> Ombordan faqat {maxQty} {formData.unit} mavjud
                                        </p>
                                    )}
                                </div>

                                {/* ── Miqdor ────────────────────────────────────────── */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('common.units')} <span className="text-red-500">*</span></label>
                                    <div className="flex">
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            placeholder="0"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-l-xl border border-slate-200 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-sm"
                                        />
                                        <div className="px-3 py-2.5 rounded-r-xl border-y border-r border-slate-200 bg-slate-50 text-sm font-medium text-slate-600 min-w-[60px] text-center">
                                            {formData.unit || "dona"}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Sabab ─────────────────────────────────────────── */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('inventory.category')} <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.reason}
                                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-sm bg-white"
                                    >
                                        <option value="prep">Oshxonaga (Tayyorgarlik)</option>
                                        <option value="sale">Sotuvga</option>
                                        <option value="damage">Yaroqsiz</option>
                                        <option value="writeoff">Hisobdan chiqarish</option>
                                        <option value="other">Boshqa</option>
                                    </select>
                                </div>

                                {/* ── Ombor ─────────────────────────────────────────── */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('nav.ombor')}</label>
                                    <select
                                        value={formData.fromWarehouse}
                                        onChange={e => setFormData({ ...formData, fromWarehouse: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-sm bg-white"
                                    >
                                        <option value="Asosiy Ombor">Asosiy Ombor</option>
                                        <option value="Oshxona Ombori">Oshxona Ombori</option>
                                        <option value="Bar Ombori">Bar Ombori</option>
                                    </select>
                                </div>

                                {/* ── Xodim ─────────────────────────────────────────── */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mas&apos;ul xodim</label>
                                    <select
                                        value={formData.employee}
                                        onChange={e => setFormData({ ...formData, employee: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-sm bg-white"
                                    >
                                        <option value="" disabled>Mas'ul xodimni tanlang...</option>
                                        <option value="Omborchi">Omborchi (Standart)</option>
                                        {staffList.filter(s => s.role !== "POS apparati").map(s => (
                                            <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* ── Izoh ──────────────────────────────────────────── */}
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Izoh</label>
                                    <textarea
                                        placeholder="Chiqim sababi va qo'shimcha ma'lumotlar..."
                                        rows={2}
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-sm resize-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-100">
                                    <AlertTriangle size={14} /> Ushbu amal ombor qoldig&apos;ini kamaytiradi.
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving || !formData.productId || isOverQty}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
                                        {t('nav.ombor_chiqim')}
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
