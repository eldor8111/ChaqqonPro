"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    Plus, Search, FileSpreadsheet, X, Check, Package,
    RotateCw, AlertTriangle, Printer, Trash2, TrendingUp, ChevronDown, CheckSquare
} from "lucide-react";
import { useLang } from "@/lib/LangContext";


interface Product {
    id: string;
    name: string;
    unit: string;
    price: number;
    stock: number;
    productType: "xomashyo" | "polfabrikat" | "mahsulot" | "taom";
    categoryId?: string;
}

interface FormItem {
    productId: string;
    productName: string;
    quantity: string;
    costPrice: string;
    unit: string;
    productType: string;
    // combobox search
    search: string;
    isOpen: boolean;
}

const emptyItem = (): FormItem => ({
    productId: "", productName: "", quantity: "", costPrice: "",
    unit: "kg", productType: "", search: "", isOpen: false
});

export default function OmborKirimPage() {
    const { t } = useLang();
    // ── API-based product loading (real DB data, not mock store) ─────────────
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);

    const loadProducts = useCallback(async () => {
        try {
            setProductsLoading(true);
            // xomashyo API — type parametrsiz = barcha ingredientlar (xomashyo + polfabrikat)
            // menu API — ?all=1 = barcha Product'lar (taom + mahsulot, sotilishi mumkin bo'lgan)
            const [xomRes, menuRes] = await Promise.all([
                fetch("/api/ubt/xomashyo"),
                fetch("/api/ubt/menu?all=1"),
            ]);
            const xomData = xomRes.ok ? await xomRes.json() : [];
            const menuData = menuRes.ok ? await menuRes.json() : { items: [] };
            const menuItems: any[] = Array.isArray(menuData.items) ? menuData.items : [];

            // Xomashyo va polfabrikatlar — UbtIngredient jadvalidan
            const xomashyo: Product[] = (Array.isArray(xomData) ? xomData : [])
                .map((x: any) => ({
                    id: x.id,
                    name: x.name,
                    unit: x.unit || "kg",
                    price: Number(x.price) || 0,
                    stock: Number(x.stock) || 0,
                    productType: (x.type === "polfabrikat" ? "polfabrikat" : "xomashyo") as any,
                    categoryId: x.categoryId,
                }));

            // Tayyor mahsulotlar — Product jadvalidan (taom + mahsulot type'lar)
            const mahsulot: Product[] = menuItems
                .map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    unit: t.unit || "dona",
                    price: Number(t.cost || t.price) || 0,
                    stock: Number(t.stock) || 0,
                    productType: "mahsulot" as const,
                    categoryId: t.categoryId,
                }));

            setAllProducts([...xomashyo, ...mahsulot]);
        } catch (e) {
            console.error("Mahsulotlar yuklanmadi:", e);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [usdRate, setUsdRate] = useState(12500);

    const fetchSuppliers = useCallback(async () => {
        try {
            const res = await fetch("/api/ubt/kontragent");
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data.suppliers || []);
            }
        } catch (e) { console.error(e); }
    }, []);

    const fetchUsdRate = useCallback(async () => {
        try {
            const res = await fetch("/api/ubt/moliya");
            if (res.ok) {
                const data = await res.json();
                if (data.usdRate) setUsdRate(Number(data.usdRate));
            }
        } catch (e) {}
    }, []);

    useEffect(() => { loadProducts(); fetchSuppliers(); fetchUsdRate(); }, [loadProducts, fetchSuppliers, fetchUsdRate]);

    // Kirim history
    const [kirimlar, setKirimlar] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // ── Modal state + open handler ────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const openModal = () => {
        setIsModalOpen(true);
        // Always reload products when modal opens (fresh from DB)
        loadProducts();
    };
    const [formHeader, setFormHeader] = useState({
        supplier: "",
        warehouse: "Asosiy Ombor",
        currency: "UZS",
        notes: "",
        invoiceNo: "",
    });
    const [formItems, setFormItems] = useState<FormItem[]>([emptyItem()]);
    const [isSaving, setIsSaving] = useState(false);

    // ── Row detail expand ─────────────────────────────────────────────────────
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

    // ── Bulk select / delete state ────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map((k: any) => k.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;
        if (!confirm(`${selectedIds.size} ta hujjatni o'chirishni tasdiqlaysizmi?`)) return;
        setIsDeleting(true);
        try {
            // documentId orqali butun hujjatni o'chirish
            for (const docId of Array.from(selectedIds)) {
                await fetch("/api/ubt/ombor/kirim", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ documentId: docId }),
                });
            }
            setSelectedIds(new Set());
            fetchKirimlar();
        } catch (e) {
            console.error(e);
            alert("O'chirishda xatolik yuz berdi");
        } finally {
            setIsDeleting(false);
        }
    };

    const comboRefs = useRef<(HTMLDivElement | null)[]>([]);

    const fetchKirimlar = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/ombor/kirim");
            if (res.ok) setKirimlar(await res.json());
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchKirimlar(); }, []);

    // Close combobox on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            setFormItems(prev => prev.map((item, i) => {
                if (comboRefs.current[i] && !comboRefs.current[i]!.contains(e.target as Node)) {
                    return { ...item, isOpen: false };
                }
                return item;
            }));
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const updateItem = (index: number, patch: Partial<FormItem>) => {
        setFormItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it));
    };

    const selectProduct = (index: number, prod: Product) => {
        updateItem(index, {
            productId: prod.id,
            productName: prod.name,
            unit: prod.unit,
            costPrice: prod.price > 0 ? prod.price.toString() : "",
            productType: prod.productType,
            search: prod.name,
            isOpen: false,
        });
    };

    const addRow = () => setFormItems(prev => [...prev, emptyItem()]);

    const removeRow = (index: number) => {
        if (formItems.length <= 1) return;
        setFormItems(prev => prev.filter((_, i) => i !== index));
    };

    const grandTotal = formItems.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.costPrice) || 0), 0);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const valid = formItems.filter(it => it.productId && Number(it.quantity) > 0);
        if (valid.length === 0) return alert("Kamida 1 ta mahsulot va miqdorini kiriting.");
        setIsSaving(true);
        try {
            const payload = {
                date: new Date(),
                supplier: formHeader.supplier,
                warehouse: formHeader.warehouse,
                currency: formHeader.currency,
                invoiceNo: formHeader.invoiceNo,
                notes: formHeader.notes,
                items: valid.map(it => ({
                    productId: it.productId,
                    productName: it.productName,
                    quantity: Number(it.quantity),
                    costPrice: Number(it.costPrice),
                    totalCost: Number(it.quantity) * Number(it.costPrice),
                    unit: it.unit,
                    productType: it.productType,
                })),
                status: "accepted",
            };
            const res = await fetch("/api/ubt/ombor/kirim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                // Update local product stock (client-side optimistic update)
                setAllProducts(prev => prev.map(p => {
                    const match = valid.find(it => it.productId === p.id);
                    if (match) return { ...p, stock: (p.stock || 0) + Number(match.quantity) };
                    return p;
                }));
                setIsModalOpen(false);
                setFormHeader({ supplier: "", warehouse: "Asosiy Ombor", currency: "UZS", notes: "", invoiceNo: "" });
                setFormItems([emptyItem()]);
                fetchKirimlar();
            } else {
                alert("Serverda xatolik yuz berdi");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintNakladnoy = (kirim: any) => {
        const items = Array.isArray(kirim.items) ? kirim.items : [kirim];
        const dateStr = new Date(kirim.createdAt).toLocaleString("uz-UZ");
        const rows = items.map((item: any, i: number) => `
            <tr>
                <td>${i + 1}</td>
                <td>${item.productName}</td>
                <td>${item.unit}</td>
                <td>${Number(item.quantity).toLocaleString()}</td>
                <td>${Number(item.costPrice || 0).toLocaleString()} ${kirim.currency || "UZS"}</td>
                <td><b>${Number(item.totalCost || item.quantity * item.costPrice || 0).toLocaleString()} ${kirim.currency || "UZS"}</b></td>
            </tr>`).join("");

        const total = items.reduce((s: number, it: any) => s + Number(it.totalCost || 0), 0);

        const win = window.open("", "_blank", "width=860,height=650");
        if (!win) return alert("Pop-uplarga ruxsat bering");
        win.document.write(`
            <html><head><title>Nakladnoy #${kirim.invoiceNo || kirim.id}</title>
            <style>
                body{font-family:Arial,sans-serif;padding:24px;color:#111}
                h2{text-align:center;margin-bottom:4px}p{margin:2px 0}
                table{width:100%;border-collapse:collapse;margin-top:18px}
                th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}
                th{background:#f3f4f6;font-size:12px;text-transform:uppercase}
                .total{text-align:right;font-size:18px;font-weight:bold;margin-top:16px}
                .footer{display:flex;justify-content:space-between;margin-top:60px}
                .sign{border-top:1px solid #333;width:220px;text-align:center;padding-top:6px;font-size:12px}
            </style></head><body>
            <h2>KIRIM NAKLADNOYI ${kirim.invoiceNo ? "— #" + kirim.invoiceNo : ""}</h2>
            <p><b>Sana:</b> ${dateStr}</p>
            <p><b>Yetkazib beruvchi:</b> ${kirim.supplier || "—"}</p>
            <p><b>Ombor:</b> ${kirim.warehouse || "Asosiy Ombor"}</p>
            ${kirim.notes ? `<p><b>Izoh:</b> ${kirim.notes}</p>` : ""}
            <table>
                <thead><tr><th>#</th><th>Mahsulot</th><th>Birlik</th><th>Miqdor</th><th>Narx</th><th>Jami</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="total">JAMI: ${total.toLocaleString()} ${kirim.currency || "UZS"}</div>
            <div class="footer">
                <div class="sign">Topshirdi (Ta'minotchi)</div>
                <div class="sign">Qabul qildi (Omborchi)</div>
            </div>
            <script>window.onload=()=>{window.print();window.close();}</script>
            </body></html>`);
        win.document.close();
    };

    const filtered2 = kirimlar.filter(k =>
        k.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toUzs = (amount: number, currency: string) => {
        if (currency === "USD") return amount * usdRate;
        if (currency === "EUR") return amount * usdRate * 1.08;
        return amount;
    };

    // grouped document (har bir documentId = 1 qator)
    const filtered = kirimlar.filter((k: any) =>
        k.items?.some((it: any) => it.productName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        k.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalToday = kirimlar
        .filter((k: any) => new Date(k.createdAt).toDateString() === new Date().toDateString())
        .reduce((s: number, k: any) => s + (k.totalCostUzs || toUzs(k.totalCost || 0, k.currency || "UZS")), 0);

    return (
        <div className="animate-fade-in bg-slate-50 min-h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t('nav.ombor_kirim')}</h1>
                        <p className="text-sm text-slate-500 mt-1">{t('nav.nom_raw')} {t('common.and') || 'va'} {t('nav.nom_dishes')} {t('nav.ombor_kirim')} tarixi</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm">
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5">
                            <Plus size={18} strokeWidth={2.5} /> {t('common.add')} {t('nav.ombor_kirim')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-5 grid sm:grid-cols-3 gap-4 border-b border-slate-200 bg-white/60">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">{t('reports.daily')} {t('nav.ombor_kirim')}</p>
                        <p className="text-xl font-black text-slate-800">{totalToday.toLocaleString()} <span className="text-sm font-semibold text-slate-400">UZS</span></p>
                    </div>
                    <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><TrendingUp size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">{t('common.total')} hujjatlar</p>
                        <p className="text-xl font-black text-slate-800">{kirimlar.length} <span className="text-sm font-semibold text-slate-400">ta</span></p>
                    </div>
                    <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Package size={22} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">{t('common.active')} {t('inventory.totalProducts')}</p>
                        <p className="text-xl font-black text-slate-800">{allProducts.length} <span className="text-sm font-semibold text-slate-400">tur</span></p>
                    </div>
                    <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Package size={22} /></div>
                </div>
            </div>

            {/* Search + Table */}
            <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm gap-4">
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input
                            type="text"
                            placeholder="Qidiruv (mahsulot, yetkazib beruvchi yoki hujjat raqami)..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 text-slate-700" />
                    </div>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all shadow-md disabled:opacity-60">
                            {isDeleting ? <RotateCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            {selectedIds.size} ta o'chirish
                        </button>
                    )}
                    <button onClick={fetchKirimlar} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
                        <RotateCw size={17} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-100">
                        {filtered.length} ta hujjat
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-4 py-4">
                                        <input type="checkbox"
                                            onChange={toggleSelectAll}
                                            checked={filtered.length > 0 && selectedIds.size === filtered.length}
                                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                    </th>
                                    <th className="px-5 py-4">{t('common.date')}</th>
                                    <th className="px-5 py-4">Hujjat #</th>
                                    <th className="px-5 py-4">{t('inventory.totalProducts')}</th>
                                    <th className="px-5 py-4">{t('inventory.supplier')}</th>
                                    <th className="px-5 py-4">{t('nav.ombor')}</th>
                                    <th className="px-5 py-4">{t('common.units')}</th>
                                    <th className="px-5 py-4">{t('common.amount')}</th>
                                    <th className="px-5 py-4">{t('common.status')}</th>
                                    <th className="px-5 py-4">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                {isLoading ? (
                                    <tr><td colSpan={9} className="py-16 text-center"><RotateCw className="animate-spin mx-auto text-blue-400" size={28} /></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm">Hech qanday hujjat topilmadi. Yangi kirim qo&apos;shing.</td></tr>
                                ) : filtered.map((doc: any) => (
                                    <>
                                        <tr key={doc.documentId}
                                            onClick={e => { if ((e.target as HTMLElement).tagName !== "INPUT" && !(e.target as HTMLElement).closest("button")) toggleExpand(doc.documentId); }}
                                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${selectedIds.has(doc.documentId) ? "bg-blue-50" : expandedId === doc.documentId ? "bg-amber-50/50" : ""}`}>
                                            <td className="px-4 py-3.5">
                                                <input type="checkbox"
                                                    checked={selectedIds.has(doc.documentId)}
                                                    onChange={() => toggleSelect(doc.documentId)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                                                {new Date(doc.createdAt).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-400">{doc.invoiceNo || "—"}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    {doc.items?.slice(0, 2).map((it: any, i: number) => (
                                                        <span key={i} className="text-blue-700 font-semibold text-xs">{it.productName}</span>
                                                    ))}
                                                    {doc.items?.length > 2 && (
                                                        <span className="text-slate-400 text-[10px]">+{doc.items.length - 2} ta boshqa</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">{doc.supplier || "—"}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">{doc.warehouse}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap font-bold text-emerald-600">
                                                {doc.items?.length || 0} <span className="text-xs font-normal text-slate-400">tur</span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-800">
                                                {Number(doc.totalCost || 0).toLocaleString()}{" "}
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                    doc.currency === "USD" ? "bg-emerald-100 text-emerald-700" :
                                                    doc.currency === "EUR" ? "bg-blue-100 text-blue-700" :
                                                    "bg-slate-100 text-slate-500"
                                                }`}>{doc.currency || "UZS"}</span>
                                                {(doc.currency && doc.currency !== "UZS") && (
                                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                        ≈ {Math.round(doc.totalCostUzs || toUzs(doc.totalCost||0, doc.currency)).toLocaleString()} UZS
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">{t('common.confirm')}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <button onClick={e => { e.stopPropagation(); handlePrintNakladnoy(doc); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-xs transition-colors border border-blue-200">
                                                    <Printer size={13} /> {t('common.print')}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === doc.documentId && (
                                            <tr key={doc.documentId + "_detail"}>
                                                <td colSpan={10} className="px-6 py-4 bg-amber-50/80 border-b border-amber-200">
                                                    <p className="text-sm font-bold text-amber-800 mb-3">📦 Hujjat tarkibi ({doc.items?.length} ta mahsulot)</p>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="text-slate-500 border-b border-amber-200">
                                                                    <th className="text-left py-2 pr-4 font-semibold">Mahsulot</th>
                                                                    <th className="text-right py-2 pr-4 font-semibold">Miqdori</th>
                                                                    <th className="text-right py-2 pr-4 font-semibold">Narxi ({doc.currency || "UZS"})</th>
                                                                    <th className="text-right py-2 pr-4 font-semibold">Jami ({doc.currency || "UZS"})</th>
                                                                    {doc.currency !== "UZS" && <th className="text-right py-2 font-semibold">Jami (UZS)</th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {doc.items?.map((it: any, i: number) => (
                                                                    <tr key={i} className="border-b border-amber-100 last:border-0">
                                                                        <td className="py-2 pr-4 font-semibold text-slate-800">{it.productName}</td>
                                                                        <td className="py-2 pr-4 text-right text-emerald-700 font-bold">{Number(it.quantity).toLocaleString()} {it.unit}</td>
                                                                        <td className="py-2 pr-4 text-right text-slate-600">{Number(it.costPrice).toLocaleString()}</td>
                                                                        <td className="py-2 pr-4 text-right font-bold text-blue-700">{Number(it.totalCost).toLocaleString()}</td>
                                                                        {doc.currency !== "UZS" && (
                                                                            <td className="py-2 text-right text-slate-500">{Math.round(it.totalCostUzs || toUzs(it.totalCost, doc.currency)).toLocaleString()}</td>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot>
                                                                <tr className="font-bold text-slate-800 border-t-2 border-amber-300">
                                                                    <td className="py-2 pr-4">JAMI</td>
                                                                    <td className="py-2 pr-4 text-right text-emerald-700">{doc.items?.reduce((s:number,it:any)=>s+it.quantity,0)} ta</td>
                                                                    <td></td>
                                                                    <td className="py-2 pr-4 text-right text-blue-700">{Number(doc.totalCost).toLocaleString()} {doc.currency || "UZS"}</td>
                                                                    {doc.currency !== "UZS" && <td className="py-2 text-right">{Math.round(doc.totalCostUzs).toLocaleString()} UZS</td>}
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                    {doc.supplier && <p className="mt-3 text-xs text-slate-500">🚚 <b>Yetkazib beruvchi:</b> {doc.supplier} &nbsp;|&nbsp; 🏭 <b>Ombor:</b> {doc.warehouse}</p>}
                                                    {doc.notes && <p className="mt-1 text-xs text-slate-500">📝 {doc.notes}</p>}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ===== MODAL ===== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Package size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Yangi Kirim Hujjati</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Faqat xomashyo va mahsulotlar qabul qilinadi
                                        {productsLoading
                                            ? " · ⏳ Mahsulotlar yuklanmoqda..."
                                            : ` · ${allProducts.length} ta mahsulot yuklandi`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Header fields */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('inventory.supplier')}</label>
                                        <input list="suppliersList" type="text" placeholder="Sharq Ta'minot LLC..." value={formHeader.supplier}
                                            onChange={e => setFormHeader({ ...formHeader, supplier: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm transition-all" />
                                        <datalist id="suppliersList">
                                            {suppliers.map(s => <option key={s.id} value={s.name} />)}
                                        </datalist>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Hujjat #</label>
                                        <input type="text" placeholder="INV-001..." value={formHeader.invoiceNo}
                                            onChange={e => setFormHeader({ ...formHeader, invoiceNo: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('nav.ombor')}</label>
                                        <select value={formHeader.warehouse} onChange={e => setFormHeader({ ...formHeader, warehouse: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm bg-white transition-all">
                                            <option>Asosiy Ombor</option>
                                            <option>Oshxona Ombori</option>
                                            <option>Bar Ombori</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('fin.currency') || 'Valyuta'}</label>
                                        <select value={formHeader.currency} onChange={e => setFormHeader({ ...formHeader, currency: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm bg-white font-bold text-blue-700 transition-all">
                                            <option value="UZS">🇺🇿 UZS</option>
                                            <option value="USD">🇺🇸 USD</option>
                                            <option value="EUR">🇪🇺 EUR</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Items table */}
                                <div className="border border-slate-200 rounded-xl overflow-visible">
                                    <div className="bg-slate-50 border-b border-slate-200 rounded-t-xl px-4 py-2.5 grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <div className="col-span-4">Mahsulot</div>
                                        <div className="col-span-1">Tur</div>
                                        <div className="col-span-2">Miqdor + Birlik</div>
                                        <div className="col-span-2">Kelish narxi</div>
                                        <div className="col-span-2">Jami</div>
                                        <div className="col-span-1 text-center">—</div>
                                    </div>

                                    {formItems.map((item, index) => {
                                        const filteredProds = allProducts.filter(p =>
                                            !item.search || p.name.toLowerCase().includes(item.search.toLowerCase())
                                        );
                                        const lineTotal = Number(item.quantity) * Number(item.costPrice) || 0;

                                        return (
                                            <div key={index} className="px-4 py-3 grid grid-cols-12 gap-2 items-center border-b border-slate-100 hover:bg-slate-50/50">
                                                {/* Combobox */}
                                                <div className="col-span-4 relative" ref={el => { comboRefs.current[index] = el; }}>
                                                    <div
                                                        className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all cursor-pointer"
                                                        onClick={() => updateItem(index, { isOpen: !item.isOpen })}
                                                    >
                                                        <Search size={14} className="ml-3 text-slate-400 shrink-0" />
                                                        <input
                                                            type="text"
                                                            placeholder="Mahsulot qidiring..."
                                                            value={item.search}
                                                            onChange={e => updateItem(index, { search: e.target.value, isOpen: true, productId: "", productName: "" })}
                                                            onClick={e => { e.stopPropagation(); updateItem(index, { isOpen: true }); }}
                                                            className="w-full px-2 py-2 text-sm outline-none bg-transparent"
                                                        />
                                                        <ChevronDown size={14} className={`mr-2 text-slate-400 transition-transform ${item.isOpen ? "rotate-180" : ""}`} />
                                                    </div>
                                                    {item.isOpen && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                                                            {productsLoading ? (
                                                                <div className="px-4 py-4 text-sm text-slate-400 flex items-center gap-2">
                                                                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                                    Mahsulotlar yuklanmoqda...
                                                                </div>
                                                            ) : filteredProds.length === 0 ? (
                                                                <div className="px-4 py-3 text-sm text-slate-400">
                                                                    {allProducts.length === 0 ? "⚠️ Hech qanday mahsulot topilmadi. Avval nomenklaturaga qo'shing." : "Qidiruv natijasi yo'q"}
                                                                </div>
                                                            ) : filteredProds.map(prod => (
                                                                <button
                                                                    key={prod.id}
                                                                    type="button"
                                                                    onClick={() => selectProduct(index, prod)}
                                                                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                                                                >
                                                                    <div>
                                                                        <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{prod.name}</span>
                                                                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                                            prod.productType === "xomashyo" ? "bg-orange-100 text-orange-600" :
                                                                            prod.productType === "polfabrikat" ? "bg-purple-100 text-purple-600" :
                                                                            prod.productType === "taom" ? "bg-blue-100 text-blue-600" :
                                                                            "bg-emerald-100 text-emerald-600"
                                                                        }`}>
                                                                            {prod.productType === "xomashyo" ? "XOMASHYO" :
                                                                             prod.productType === "polfabrikat" ? "POLFABRIKAT" :
                                                                             prod.productType === "taom" ? "TAOM" : "MAHSULOT"}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs text-slate-400">{prod.stock} {prod.unit}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Type badge */}
                                                <div className="col-span-1">
                                                    {item.productType ? (
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                                            item.productType === "xomashyo" ? "bg-orange-100 text-orange-600" :
                                                            item.productType === "polfabrikat" ? "bg-purple-100 text-purple-600" :
                                                            item.productType === "taom" ? "bg-blue-100 text-blue-600" :
                                                            "bg-emerald-100 text-emerald-600"
                                                        }`}>
                                                            {item.productType === "xomashyo" ? "XOM" :
                                                             item.productType === "polfabrikat" ? "POL" :
                                                             item.productType === "taom" ? "TAOM" : "MAH"}
                                                        </span>
                                                    ) : <span className="text-slate-300 text-xs">—</span>}
                                                </div>

                                                {/* Quantity + unit */}
                                                <div className="col-span-2 flex border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                                    <input
                                                        type="number" step="0.01" min="0" placeholder="0"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(index, { quantity: e.target.value })}
                                                        className="w-full px-3 py-2 outline-none text-sm font-bold bg-transparent"
                                                    />
                                                    <select
                                                        value={item.unit}
                                                        onChange={e => updateItem(index, { unit: e.target.value })}
                                                        className="px-1.5 py-2 bg-slate-50 outline-none text-xs text-slate-600 border-l border-slate-200 font-medium"
                                                    >
                                                        {["kg", "litr", "dona", "qop", "blok", "sht", "gr", "ml"].map(u => <option key={u}>{u}</option>)}
                                                    </select>
                                                </div>

                                                {/* Cost price */}
                                                <div className="col-span-2">
                                                    <input
                                                        type="number" min="0" placeholder="0"
                                                        value={item.costPrice}
                                                        onChange={e => updateItem(index, { costPrice: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                                                    />
                                                </div>

                                                {/* Line total */}
                                                <div className="col-span-2 font-bold text-slate-800 text-sm">
                                                    {lineTotal > 0 ? `${lineTotal.toLocaleString()} ${formHeader.currency}` : <span className="text-slate-300">0</span>}
                                                </div>

                                                {/* Remove */}
                                                <div className="col-span-1 flex justify-center">
                                                    <button type="button" onClick={() => removeRow(index)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        disabled={formItems.length <= 1}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button type="button" onClick={addRow}
                                    className="flex items-center gap-2 w-full justify-center px-4 py-2.5 border-2 border-dashed border-blue-200 text-blue-600 font-bold rounded-xl text-sm hover:bg-blue-50 hover:border-blue-300 transition-all">
                                    <Plus size={16} strokeWidth={3} /> Yana mahsulot qo&apos;shish
                                </button>

                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Izoh (ixtiyoriy)</label>
                                    <input type="text" placeholder="Kirim haqida qo'shimcha ma'lumot..."
                                        value={formHeader.notes}
                                        onChange={e => setFormHeader({ ...formHeader, notes: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm transition-all" />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3 text-amber-700 bg-amber-50 px-5 py-2.5 rounded-xl text-sm font-black border border-amber-200">
                                    <AlertTriangle size={18} />
                                    Jami: {grandTotal.toLocaleString()} {formHeader.currency}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all border border-slate-200 bg-white">
                                        {t('common.cancel')}
                                    </button>
                                    <button type="submit" disabled={isSaving}
                                        className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-70">
                                        {isSaving ? <RotateCw size={18} className="animate-spin" /> : <Check size={18} />}
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
