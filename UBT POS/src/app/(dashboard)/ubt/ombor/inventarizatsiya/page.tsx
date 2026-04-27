"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
    Plus, Search, FileSpreadsheet, X, Check, ClipboardCheck,
    RotateCw, AlertTriangle, TrendingDown, TrendingUp, Minus, ChevronDown
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/LangContext";


export default function OmborInventarizatsiyaPage() {
    const { t } = useLang();
    const { updateNomenklaturaXomashyo } = useStore();

    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);

    const loadProducts = async () => {
        try {
            setProductsLoading(true);
            const [xomRes, menuRes] = await Promise.all([
                fetch("/api/ubt/xomashyo"),
                fetch("/api/ubt/menu?all=1"),
            ]);
            const xomData = xomRes.ok ? await xomRes.json() : [];
            const menuData = menuRes.ok ? await menuRes.json() : { items: [] };
            const menuItems: any[] = Array.isArray(menuData.items) ? menuData.items : [];

            const xomashyo = (Array.isArray(xomData) ? xomData : []).map((x: any) => ({
                id: x.id, name: x.name, unit: x.unit || "kg", stock: Number(x.stock) || 0, productType: x.type === "polfabrikat" ? "polfabrikat" : "xomashyo", categoryId: x.categoryId,
            }));
            const mahsulot = menuItems.map((t: any) => ({
                id: t.id, name: t.name, unit: t.unit || "dona", stock: Number(t.stock) || 0, productType: "mahsulot", categoryId: t.categoryId,
            }));
            setAllProducts([...xomashyo, ...mahsulot]);
        } catch (e) { console.error(e); }
        finally { setProductsLoading(false); }
    };

    const [items, setItems] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        productId: "", productName: "", systemStock: "", actualStock: "",
        warehouse: "Asosiy Ombor", employee: "", unit: "kg", productType: "",
    });
    const [prodSearch, setProdSearch] = useState("");
    const [isComboOpen, setIsComboOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const comboRef = useRef<HTMLDivElement>(null);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/ombor/inventarizatsiya");
            if (res.ok) setItems(await res.json());
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
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

    useEffect(() => { fetchItems(); loadProducts(); fetchStaff(); }, []);

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

    const selectProduct = (prod: typeof allProducts[0]) => {
        setFormData(f => ({
            ...f,
            productId: prod.id,
            productName: prod.name,
            systemStock: prod.stock.toString(),
            unit: prod.unit,
            productType: prod.productType,
        }));
        setProdSearch(prod.name);
        setIsComboOpen(false);
    };

    // Real-time difference
    const diff = formData.actualStock !== "" && formData.systemStock !== ""
        ? Number(formData.actualStock) - Number(formData.systemStock)
        : null;
    const diffLabel = diff === null ? null : diff > 0 ? `+${diff} (Ortiqlik)` : diff < 0 ? `${diff} (Kamomad)` : "Farq yo'q ✓";
    const diffColor = diff === null ? "" : diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-slate-500";

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productId) return alert("Mahsulotni tanlang.");
        if (formData.actualStock === "") return alert("Haqiqiy qoldiqni kiriting.");

        setIsSaving(true);
        try {
            const payload = {
                date: new Date(),
                ...formData,
                systemStock: Number(formData.systemStock),
                actualStock: Number(formData.actualStock),
                difference: diff ?? 0,
            };
            const res = await fetch("/api/ubt/ombor/inventarizatsiya", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                if (formData.productId && formData.actualStock !== "") {
                    // Muvaffaqiyatli saqlangandan so'ng qayta yuklash
                    loadProducts();
                }
                setIsModalOpen(false);
                setFormData({ productId: "", productName: "", systemStock: "", actualStock: "", warehouse: "Asosiy Ombor", employee: "", unit: "kg", productType: "" });
                setProdSearch("");
                fetchItems();
            } else { alert("Serverda xatolik yuz berdi"); }
        } catch (err) { console.error(err); }
        finally { setIsSaving(false); }
    };

    const filtered = items.filter(t =>
        t.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.employee?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.warehouse?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const shortageCount = items.filter(i => i.difference < 0).length;
    const surplusCount = items.filter(i => i.difference > 0).length;

    return (
        <div className="animate-fade-in bg-slate-50 min-h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t('nav.ombor_inventarizatsiya')}</h1>
                        <p className="text-sm text-slate-500 mt-1">{t('nav.ombor')} {t('inventory.currentStock')} taftish</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm">
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                        <button onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5">
                            <Plus size={18} strokeWidth={2.5} /> {t('common.add')} {t('nav.ombor_inventarizatsiya')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-5 grid sm:grid-cols-3 gap-4 border-b border-slate-200 bg-white/60">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">{t('common.total')} {t('nav.ombor_inventarizatsiya')}</p>
                        <p className="text-xl font-black text-slate-800">{items.length} <span className="text-sm font-semibold text-slate-400">ta</span></p>
                    </div>
                    <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><ClipboardCheck size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Kamomad holatlari</p>
                        <p className="text-xl font-black text-red-600">{shortageCount}</p>
                    </div>
                    <div className="w-11 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><TrendingDown size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Ortiqlik holatlari</p>
                        <p className="text-xl font-black text-emerald-600">{surplusCount}</p>
                    </div>
                    <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><TrendingUp size={22} /></div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm gap-4">
                    <div className="w-full sm:flex-1 sm:max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input type="text" placeholder="Qidiruv (mahsulot, xodim, ombor)..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg text-sm font-medium outline-none text-slate-700 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <button onClick={fetchItems} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                        <RotateCw size={17} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold border border-indigo-100">{filtered.length} ta</div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                <tr>
                                    <th className="px-5 py-4">{t('common.date')}</th>
                                    <th className="px-5 py-4">{t('inventory.totalProducts')}</th>
                                    <th className="px-5 py-4">{t('nav.ombor')}</th>
                                    <th className="px-5 py-4">{t('inventory.currentStock')} (tizim)</th>
                                    <th className="px-5 py-4">{t('inventory.currentStock')} (haqiqiy)</th>
                                    <th className="px-5 py-4">Farq</th>
                                    <th className="px-5 py-4">{t('staff.employee')}</th>
                                    <th className="px-5 py-4">{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                {isLoading ? (
                                    <tr><td colSpan={8} className="py-16 text-center"><RotateCw className="animate-spin mx-auto text-indigo-400" size={28} /></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">{t('common.noData')}</td></tr>
                                ) : filtered.map(item => {
                                    const d = Number(item.difference || 0);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                                                {new Date(item.createdAt).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </td>
                                            <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{item.productName}</td>
                                            <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{item.warehouse}</td>
                                            <td className="px-5 py-3.5 text-slate-400">{Number(item.systemStock).toLocaleString()} {item.unit}</td>
                                            <td className="px-5 py-3.5 font-bold text-slate-800">{Number(item.actualStock).toLocaleString()} {item.unit}</td>
                                            <td className={`px-5 py-3.5 font-black ${d < 0 ? "text-red-600" : d > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                                                {d > 0 ? "+" : ""}{d} {item.unit}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500">{item.employee || "—"}</td>
                                            <td className="px-5 py-3.5">
                                                {d === 0 ? (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase">Mos</span>
                                                ) : d < 0 ? (
                                                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-bold uppercase">Kamomad</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">Ortiqlik</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100 bg-indigo-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <ClipboardCheck size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-indigo-900">{t('common.add')} {t('nav.ombor_inventarizatsiya')}</h2>
                                    <p className="text-xs text-indigo-600">Tasdiqlanganda tizim qoldig&apos;i haqiqiy raqamga tenglashadi</p>
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
                                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
                                        onClick={() => setIsComboOpen(true)}>
                                        <Search size={15} className="ml-3 text-slate-400 shrink-0" />
                                        <input type="text" placeholder="Xomashyo yoki polfabrikat qidiring..."
                                            value={prodSearch}
                                            onChange={e => { setProdSearch(e.target.value); setIsComboOpen(true); setFormData(f => ({ ...f, productId: "", productName: "", systemStock: "", productType: "" })); }}
                                            className="w-full px-3 py-3 text-sm outline-none bg-transparent" />
                                        <ChevronDown size={15} className={`mr-3 text-slate-400 transition-transform ${isComboOpen ? "rotate-180" : ""}`} />
                                    </div>
                                    {isComboOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                            {filteredProds.length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-slate-400">Topilmadi</div>
                                            ) : filteredProds.map(prod => (
                                                <button key={prod.id} type="button"
                                                    onClick={() => selectProduct(prod)}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex items-center justify-between group">
                                                    <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{prod.name}</span>
                                                    <span className="text-xs text-slate-400">Hozir: <b>{prod.stock} {prod.unit}</b></span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* System stock (read-only) + actual stock */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('inventory.currentStock')} (tizim)</label>
                                    <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                                        <input type="number" readOnly placeholder="0"
                                            value={formData.systemStock}
                                            className="w-full px-4 py-3 outline-none text-sm text-slate-400 bg-transparent cursor-not-allowed" />
                                        <span className="flex items-center px-3 text-xs text-slate-400 font-medium">{formData.unit}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">Avtomatik to&apos;ldiriladi</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{t('inventory.currentStock')} (haqiqiy) <span className="text-red-500">*</span></label>
                                    <div className="flex border border-indigo-300 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 bg-indigo-50 transition-all">
                                        <input type="number" step="0.01" min="0" placeholder="0"
                                            value={formData.actualStock}
                                            onChange={e => setFormData(f => ({ ...f, actualStock: e.target.value }))}
                                            className="w-full px-4 py-3 outline-none text-sm font-black text-indigo-900 bg-transparent" />
                                        <span className="flex items-center px-3 text-xs text-indigo-600 font-bold">{formData.unit}</span>
                                    </div>
                                    <p className="text-[10px] text-indigo-500">Sanadagi haqiqiy raqam</p>
                                </div>
                            </div>

                            {/* Real-time diff display */}
                            {diff !== null && (
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-sm
                                    ${diff < 0 ? "bg-red-50 border-red-200 text-red-700" : diff > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                                    {diff < 0 ? <TrendingDown size={18} /> : diff > 0 ? <TrendingUp size={18} /> : <Minus size={18} />}
                                    Farq: {diffLabel}
                                    {diff !== 0 && <span className="ml-auto text-xs font-normal opacity-70">Tasdiqlanganda tizim qoldig&apos;i {formData.actualStock} {formData.unit} ga o&apos;rnatiladi</span>}
                                </div>
                            )}

                            {/* Ombor + Employee */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('nav.ombor')}</label>
                                    <select value={formData.warehouse} onChange={e => setFormData(f => ({ ...f, warehouse: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 text-sm bg-white transition-all">
                                        {["Asosiy Ombor", "Oshxona Ombori", "Bar Ombori", "Filial Ombori"].map(w => <option key={w}>{w}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mas&apos;ul xodim</label>
                                    <select
                                        value={formData.employee}
                                        onChange={e => setFormData(f => ({ ...f, employee: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 text-sm transition-all bg-white"
                                    >
                                        <option value="" disabled>Mas'ul xodimni tanlang...</option>
                                        {staffList.filter(s => s.role !== "POS apparati").map(s => (
                                            <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg text-xs font-medium border border-indigo-200">
                                    <AlertTriangle size={14} /> Farq avtomatik tuzatiladi.
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">
                                        {t('common.cancel')}
                                    </button>
                                    <button type="submit" disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-60">
                                        {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
                                        {t('common.confirm')}
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
