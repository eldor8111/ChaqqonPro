"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    Plus, Search, FileSpreadsheet, X, Check, Trash2,
    RotateCw, AlertCircle, ChevronDown
} from "lucide-react";
import { useFrontendStore } from "@/lib/frontend/store";
import { useLang } from "@/lib/LangContext";


interface Product {
    id: string;
    name: string;
    unit: string;
    stock: number;
    price: number;
    productType: "xomashyo" | "polfabrikat" | "mahsulot";
}

export default function OmborSjisaniyaPage() {
    const { t } = useLang();
    const { user } = useFrontendStore();
    const canCreate = user?.role === "ADMIN" || user?.permissions?.includes("sjisaniya");

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
                price: Number(x.price) || 0,
                productType: x.type === "polfabrikat" ? "polfabrikat" : "xomashyo",
            }));

            const mahsulot: Product[] = menuItems
                .filter((m: any) => m.type === "mahsulot" || !m.type)
                .map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    unit: m.unit || "dona",
                    stock: Number(m.stock) || 0,
                    price: Number(m.cost || m.price) || 0,
                    productType: "mahsulot" as const,
                }));

            setAllProducts([...xomashyo, ...mahsulot]);
        } catch (e) {
            console.error("Mahsulotlar yuklanmadi:", e);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        productId: "", productName: "", quantity: "", unit: "kg",
        reason: "Buzilgan / Muddat o'tgan", approvedBy: "",
        costPrice: 0,
    });
    const [prodSearch, setProdSearch] = useState("");
    const [isComboOpen, setIsComboOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const comboRef = useRef<HTMLDivElement>(null);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/ombor/sjisaniya");
            if (res.ok) setItems(await res.json());
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

    useEffect(() => { fetchItems(); loadProducts(); fetchStaff(); }, [loadProducts]);

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
    const totalLoss = Number(formData.quantity) * formData.costPrice;

    const REASONS = [
        "Buzilgan / Muddat o'tgan",
        "Siniq / Shikastlangan",
        "Yo'qolgan (O'g'rilik)",
        "Xodimlar ovqati uchun",
        "Xato kirim qilingan",
        "Namlanib ketgan",
        "Boshqa sabab",
    ];

    const selectProduct = (prod: typeof allProducts[0]) => {
        setFormData(f => ({
            ...f,
            productId: prod.id,
            productName: prod.name,
            unit: prod.unit,
            costPrice: prod.price,
        }));
        setProdSearch(prod.name);
        setIsComboOpen(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productId) return alert("Mahsulotni tanlang.");
        if (Number(formData.quantity) <= 0) return alert("Miqdorni kiriting.");
        if (isOverQty) return alert(`Ombordan faqat ${maxQty} ${formData.unit} mavjud.`);
        if (!formData.approvedBy.trim()) return alert("Tasdiqlovchi xodimni kiriting.");

        setIsSaving(true);
        try {
            const qty = Number(formData.quantity);
            const payload = {
                date: new Date(),
                productId: formData.productId,
                productName: formData.productName,
                productType: selectedProd?.productType || "xomashyo",
                quantity: qty,
                unit: formData.unit,
                reason: formData.reason,
                approvedBy: formData.approvedBy,
                costPrice: formData.costPrice,
                totalLoss: totalLoss,
            };
            const res = await fetch("/api/ubt/ombor/sjisaniya", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ productId: "", productName: "", quantity: "", unit: "kg", reason: "Buzilgan / Muddat o'tgan", approvedBy: "", costPrice: 0 });
                setProdSearch("");
                // DB dan fresh ma'lumot yuklash
                await Promise.all([fetchItems(), loadProducts()]);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Serverda xatolik yuz berdi");
            }
        } catch (err) { console.error(err); }
        finally { setIsSaving(false); }
    };

    const filtered = items.filter(t =>
        t.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.approvedBy?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalLossAll = items.reduce((s, i) => s + (i.totalLoss || 0), 0);
    const thisMonthLoss = items
        .filter(i => {
            const d = new Date(i.createdAt);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, i) => s + (i.totalLoss || 0), 0);

    return (
        <div className="animate-fade-in bg-slate-50 min-h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t('nav.ombor_sjisaniya')}</h1>
                        <p className="text-sm text-slate-500 mt-1">Buzilgan, yo&apos;qolgan yoki yaroqsiz mahsulotlarni tizimdan o&apos;chirish</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm">
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                        {canCreate && (
                            <button onClick={() => { setIsModalOpen(true); loadProducts(); }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/30 hover:-translate-y-0.5">
                                <Plus size={18} strokeWidth={2.5} /> {t('common.add')} {t('nav.ombor_sjisaniya')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-5 grid sm:grid-cols-3 gap-4 border-b border-slate-200 bg-white/60">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">{t('common.total')} hujjatlar</p>
                        <p className="text-xl font-black text-slate-800">{items.length} <span className="text-sm font-semibold text-slate-400">ta</span></p>
                    </div>
                    <div className="w-11 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><Trash2 size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Bu oylik zarar</p>
                        <p className="text-xl font-black text-red-600">{thisMonthLoss.toLocaleString()} <span className="text-sm font-semibold text-red-300">UZS</span></p>
                    </div>
                    <div className="w-11 h-11 bg-red-50 text-red-400 rounded-xl flex items-center justify-center"><AlertCircle size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Jami zarar (barchasi)</p>
                        <p className="text-xl font-black text-slate-700">{totalLossAll.toLocaleString()} <span className="text-sm font-semibold text-slate-400">UZS</span></p>
                    </div>
                    <div className="w-11 h-11 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><AlertCircle size={22} /></div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm gap-4">
                    <div className="w-full sm:flex-1 sm:max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input type="text" placeholder={t('common.search') + "..."}
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg text-sm font-medium outline-none text-slate-700 focus:ring-2 focus:ring-red-100" />
                    </div>
                    <button onClick={fetchItems} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                        <RotateCw size={17} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-100">{filtered.length} ta</div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                <tr>
                                    <th className="px-5 py-4">{t('common.date')}</th>
                                    <th className="px-5 py-4">{t('inventory.totalProducts')}</th>
                                    <th className="px-5 py-4">Sabab</th>
                                    <th className="px-5 py-4">{t('inventory.unit') || 'Miqdori'}</th>
                                    <th className="px-5 py-4">Tannarx</th>
                                    <th className="px-5 py-4">Zarar summasi</th>
                                    <th className="px-5 py-4">Tasdiqlagan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="py-16 text-center"><RotateCw className="animate-spin mx-auto text-red-400" size={28} /></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-16 text-center text-slate-400 text-sm">{t('common.noData')}</td></tr>
                                ) : filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(item.createdAt).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{item.productName}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">{item.reason}</span>
                                        </td>
                                        <td className="px-5 py-3.5 font-bold text-red-600 whitespace-nowrap">
                                            -{Number(item.quantity).toLocaleString()} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                                            {Number(item.costPrice || 0).toLocaleString()} <span className="text-xs">UZS/{item.unit}</span>
                                        </td>
                                        <td className="px-5 py-3.5 font-black text-red-700 whitespace-nowrap">
                                            {Number(item.totalLoss || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500">{item.approvedBy || "—"}</td>
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
                        <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-red-900">{t('common.add')} {t('nav.ombor_sjisaniya')}</h2>
                                    <p className="text-xs text-red-600">Tasdiqlanganda stock avtomatik kamayadi</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {/* Product combobox */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('inventory.totalProducts')} <span className="text-red-500">*</span></label>
                                <div ref={comboRef} className="relative">
                                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100 transition-all"
                                        onClick={() => setIsComboOpen(true)}>
                                        <Search size={15} className="ml-3 text-slate-400 shrink-0" />
                                        <input type="text" placeholder="Xomashyo yoki polfabrikat qidiring..."
                                            value={prodSearch}
                                            onChange={e => { setProdSearch(e.target.value); setIsComboOpen(true); setFormData(f => ({ ...f, productId: "", productName: "", costPrice: 0 })); }}
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
                                                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center justify-between group">
                                                    <span className="text-sm font-semibold text-slate-800 group-hover:text-red-700">{prod.name}</span>
                                                    <span className="text-xs text-slate-400">
                                                        Qoldiq: <b className={prod.stock <= 0 ? "text-red-500" : ""}>{prod.stock} {prod.unit}</b>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedProd && (
                                    <p className="text-xs font-medium text-slate-500">
                                        Tannarx: <b className="text-slate-700">{selectedProd.price.toLocaleString()} UZS/{selectedProd.unit}</b> &nbsp;|&nbsp;
                                        Qoldiq: <b className={selectedProd.stock <= 5 ? "text-red-500" : "text-emerald-600"}>{selectedProd.stock} {selectedProd.unit}</b>
                                    </p>
                                )}
                            </div>

                            {/* Quantity */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chiqariladigan {t('inventory.unit') || 'miqdor'} <span className="text-red-500">*</span></label>
                                <div className="flex border border-slate-200 rounded-xl overflow-hidden focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100 transition-all">
                                    <input type="number" step="0.01" min="0" placeholder="0"
                                        value={formData.quantity}
                                        onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))}
                                        className="w-full px-4 py-3 outline-none text-sm font-black text-red-700 bg-transparent" />
                                    <select value={formData.unit} onChange={e => setFormData(f => ({ ...f, unit: e.target.value }))}
                                        className="px-3 py-3 bg-slate-50 outline-none text-xs font-medium text-slate-600 border-l border-slate-200">
                                        {["kg", "litr", "dona", "qop", "blok", "sht", "gr", "ml"].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                                {isOverQty && <p className="text-xs text-red-600 font-semibold">⚠️ Ombordan faqat {maxQty} {formData.unit} mavjud!</p>}
                            </div>

                            {/* Auto loss calculation */}
                            {formData.quantity && formData.costPrice > 0 && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                                    <AlertCircle size={18} className="text-red-500 shrink-0" />
                                    <div>
                                        <p className="text-xs text-red-600 font-medium">Hisoblanadigan zarar</p>
                                        <p className="text-lg font-black text-red-700">{totalLoss.toLocaleString()} UZS</p>
                                    </div>
                                </div>
                            )}

                            {/* Reason */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sabab <span className="text-red-500">*</span></label>
                                <select value={formData.reason} onChange={e => setFormData(f => ({ ...f, reason: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-red-500 text-sm bg-white transition-all">
                                    {REASONS.map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>

                            {/* Approved by */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tasdiqlovchi xodim <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.approvedBy}
                                    onChange={e => setFormData(f => ({ ...f, approvedBy: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-red-500 text-sm transition-all bg-white"
                                >
                                    <option value="" disabled>Mas'ul xodimni tanlang...</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Menejer">Menejer</option>
                                    {staffList.filter(s => s.role !== "POS apparati").map(s => (
                                        <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-xs font-medium border border-red-200">
                                    <AlertCircle size={14} /> Bu amal qaytarib bo&apos;lmaydi. Ehtiyot bo&apos;ling!
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">
                                        {t('common.cancel')}
                                    </button>
                                    <button type="submit" disabled={isSaving || isOverQty}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/30 hover:bg-red-700 hover:-translate-y-0.5 transition-all disabled:opacity-60">
                                        {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        {t('nav.ombor_sjisaniya')}
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
