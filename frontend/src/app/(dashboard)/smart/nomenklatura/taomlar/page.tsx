"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, Pencil, Trash2, X, CheckCircle, AlertCircle, FileSpreadsheet, ChevronRight, ChevronsUpDown, List, RotateCw, Image as ImageIcon, Layers, Check } from "lucide-react";
import { useStore, NomenklaturaTaom } from "@/lib/store";
import { formatCurrency } from "@/lib/mockData";
import { useLang } from "@/lib/LangContext";


interface ModifierItem {
    id: string;
    name: string;
}
interface ModifierGroup {
    id: string;
    name: string;
    items: ModifierItem[];
}

export default function TaomlarPage() {
    const { t } = useLang();
    // ── DB-backed state (same source as POS) ────────────────────────────────
    const { addNomenklaturaTaom, updateNomenklaturaTaom, deleteNomenklaturaTaom } = useStore();
    const [dbItems, setDbItems] = useState<any[]>([]);
    const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);
    const [dbXomashyo, setDbXomashyo] = useState<{ id: string; name: string; unit: string; price: number }[]>([]);
    const [dbLoading, setDbLoading] = useState(true);

    const loadFromDB = async () => {
        try {
            const res = await fetch("/api/smart/menu");
            const data = await res.json();
            setDbItems(data.items ?? []);
            setDbCategories(data.categories ?? []);
            
            const ingRes = await fetch("/api/smart/xomashyo");
            const ingData = await ingRes.json();
            setDbXomashyo(Array.isArray(ingData) ? ingData : []);
        } catch {}
        setDbLoading(false);
    };

    useEffect(() => { loadFromDB(); }, []);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [printersList, setprintersList] = useState<{ id: string; name: string; ipAddress: string; port: number }[]>([]);

    useEffect(() => {
        fetch("/api/smart/printers")
            .then(r => r.json())
            .then(d => setprintersList(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [recipeForm, setRecipeForm] = useState({ ombor: "", turi: "xomashyo", xomashyoId: "", amount: "" });
    const [isNewMenuModalOpen, setIsNewMenuModalOpen] = useState(false);
    const [newMenuName, setNewMenuName] = useState("");
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    type BulkRow = { name: string; categoryId: string; price: string; printer: string; unit: string; type: string; sortOrder: string; image: string | null; warehouse: string };
    const emptyBulkRow = (): BulkRow => ({ name: "", categoryId: "", price: "", printer: "", unit: "dona", type: "taom", sortOrder: "", image: null, warehouse: "" });
    const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyBulkRow()]);
    const [bulkSaving, setBulkSaving] = useState(false);

    // Modifier state
    const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
    const [editingModifierGroupIdx, setEditingModifierGroupIdx] = useState<number | null>(null);
    const [modifierGroupForm, setModifierGroupForm] = useState<{ name: string; items: ModifierItem[] }>({
        name: "",
        items: []
    });
    const [modifierItemSearch, setModifierItemSearch] = useState("");

    const [editingItem, setEditingItem] = useState<NomenklaturaTaom | null>(null);
    const [formData, setFormData] = useState<Partial<NomenklaturaTaom> & { modifiers?: ModifierGroup[]; warehouse?: string }>({
        name: "", categoryId: "", price: 0, cost: 0,
        type: "taom", sortOrder: "", stock: 0, unit: "", printer: "", printers: "",
        inStock: true, hasBarcode: false, autoCalculate: true, isSetMenu: false, image: null, recipes: [], modifiers: [],
        warehouse: ""
    });

    // Filter — over DB items
    const filteredTaomlar = useMemo(() => dbItems.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory ? (dbCategories.find(c => c.id === selectedCategory)?.name === dbCategories.find(c => c.id === t.categoryId)?.name) : true;
        return matchesSearch && matchesCat;
    }), [dbItems, dbCategories, searchQuery, selectedCategory]);

    // Auto-calculate cost
    // Whenever recipes change, if autoCalculate is true, update cost
    const updateCalculatedCost = (recipes: { xomashyoId: string, amount: number }[], shouldCalc: boolean) => {
        if (!shouldCalc) return;
        const newCost = recipes.reduce((sum, r) => {
            const xItem = dbXomashyo.find(x => x.id === r.xomashyoId);
            return sum + ((xItem?.price || 0) * r.amount);
        }, 0);
        setFormData(prev => ({ ...prev, cost: newCost }));
    };

    const handleOpenModal = (item?: NomenklaturaTaom) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name, categoryId: item.categoryId, price: item.price, cost: item.cost,
                type: item.type || "taom", sortOrder: item.sortOrder || "", stock: item.stock || 0,
                unit: item.unit || "", printer: (item as any).printerIp || item.printer || "", printers: item.printers || "",
                inStock: item.inStock ?? true, hasBarcode: item.hasBarcode ?? false,
                autoCalculate: item.autoCalculate ?? true, isSetMenu: item.isSetMenu ?? false, image: item.image || null,
                recipes: item.recipes || [],
                modifiers: (item as any).modifiers || [],
                warehouse: (item as any).warehouse || "",
                ...({ printerIp: (item as any).printerIp || item.printer || "" } as any)
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: "", categoryId: "", price: 0, cost: 0,
                type: "taom", sortOrder: "", stock: 0, unit: "", printer: "", printers: "",
                inStock: true, hasBarcode: false, autoCalculate: true, isSetMenu: false, image: null,
                recipes: [], modifiers: [],
                warehouse: ""
            });
        }
        setIsModalOpen(true);
    };

    // Modifier helpers
    const openModifierModal = (idx?: number) => {
        if (idx !== undefined) {
            const g = (formData.modifiers || [])[idx];
            setModifierGroupForm({ name: g.name, items: [...g.items] });
            setEditingModifierGroupIdx(idx);
        } else {
            setModifierGroupForm({ name: "", items: [] });
            setEditingModifierGroupIdx(null);
        }
        setModifierItemSearch("");
        setIsModifierModalOpen(true);
    };

    const saveModifierGroup = () => {
        if (!modifierGroupForm.name.trim()) return;
        const current: ModifierGroup[] = [...(formData.modifiers || [])];
        if (editingModifierGroupIdx !== null) {
            current[editingModifierGroupIdx] = { id: current[editingModifierGroupIdx].id, name: modifierGroupForm.name, items: modifierGroupForm.items };
        } else {
            current.push({ id: `mg_${Date.now()}`, name: modifierGroupForm.name, items: modifierGroupForm.items });
        }
        setFormData({ ...formData, modifiers: current });
        setIsModifierModalOpen(false);
    };

    const removeModifierGroup = (idx: number) => {
        const current = [...(formData.modifiers || [])];
        current.splice(idx, 1);
        setFormData({ ...formData, modifiers: current });
    };

    const toggleModifierItem = (item: ModifierItem) => {
        const exists = modifierGroupForm.items.some(i => i.id === item.id);
        if (exists) {
            setModifierGroupForm({ ...modifierGroupForm, items: modifierGroupForm.items.filter(i => i.id !== item.id) });
        } else {
            setModifierGroupForm({ ...modifierGroupForm, items: [...modifierGroupForm.items, item] });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const categoryName = dbCategories.find(k => k.id === formData.categoryId)?.name || "Umumiy";

        const taomData: NomenklaturaTaom = {
            id: editingItem ? editingItem.id : `T${Date.now()}`,
            name: formData.name || "",
            categoryId: formData.categoryId || "",
            price: formData.price || 0,
            cost: formData.cost || 0,
            type: formData.type as "taom" | "mahsulot",
            sortOrder: formData.sortOrder,
            stock: formData.stock,
            unit: formData.unit,
            printer: formData.printer,
            printers: formData.printers,
            inStock: formData.inStock ?? true,
            hasBarcode: formData.hasBarcode,
            autoCalculate: formData.autoCalculate,
            isSetMenu: formData.isSetMenu,
            image: formData.image,
            recipes: formData.recipes || []
        };

        // 1. Persist to DB first so we can catch active order validation errors
        try {
            const res = await fetch("/api/smart/menu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingItem?.id || undefined,
                    name: taomData.name,
                    category: categoryName,
                    sellingPrice: taomData.price,
                    costPrice: taomData.cost,
                    type: taomData.type || "taom",
                    warehouse: (formData as any).warehouse || null,
                    stock: taomData.stock || 0,
                    unit: taomData.unit || "dona",
                    image: taomData.image || null,
                    printerIp: (formData as any).printerIp || formData.printer || null,
                    isSetMenu: taomData.isSetMenu || false,
                    inStock: formData.inStock ?? true,
                    hasBarcode: formData.hasBarcode ?? false,
                    autoCalculate: formData.autoCalculate ?? true,
                    modifiers: formData.modifiers || [],
                    recipes: formData.recipes || []
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Saqlashda xatolik yuz berdi");
                return;
            }
        } catch (err) {
            console.error("Menu API fetch error:", err);
            alert("Tizim bilan ulanishda xatolik");
            return;
        }

        // 2. Save to local Zustand state ONLY IF DB SAVED SUCCESSFULLY
        if (editingItem) {
            updateNomenklaturaTaom(editingItem.id, taomData);
        } else {
            addNomenklaturaTaom(taomData);
        }

        // 🔄 Reload admin list from DB so it matches POS
        await loadFromDB();

        setIsModalOpen(false);
    };

    const handleToggleStatus = async (item: any) => {
        const newStatus = !item.inStock;
        try {
            const res = await fetch("/api/smart/menu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: item.id,
                    name: item.name,
                    category: item.category || "",
                    sellingPrice: item.sellingPrice ?? item.price ?? 0,
                    costPrice: item.costPrice ?? item.cost ?? 0,
                    type: item.type || "taom",
                    warehouse: item.warehouse || null,
                    stock: item.stock || 0,
                    unit: item.unit || "dona",
                    image: item.image || null,
                    printerIp: item.printerIp || item.printer || null,
                    isSetMenu: item.isSetMenu || false,
                    inStock: newStatus,
                    hasBarcode: item.hasBarcode ?? false,
                    autoCalculate: item.autoCalculate ?? true,
                    modifiers: item.modifiers || []
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Xatolik yuz berdi");
                return;
            }
            await loadFromDB();
        } catch (err) {
            alert("Tizim bilan ulanishda xatolik");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) return;
        // Find in DB items first, fallback to id as name
        const taom = dbItems.find((t: any) => t.id === id);
        if (taom) {
            try {
                const res = await fetch("/api/smart/menu", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: taom.id, name: taom.name }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    alert(data.error || "O'chirishda xatolik yuz berdi");
                    return; // Halt execution if active order blocks deletion
                }
            } catch (err) {
                alert("Tizim bilan ulanishda xatolik");
                return;
            }
        }
        deleteNomenklaturaTaom(id);
        // Reload from DB to sync admin list
        await loadFromDB();
    };

    const handleBulkSave = async () => {
        const validRows = bulkRows.filter(r => r.name.trim());
        if (validRows.length === 0) { alert("Kamida 1 ta taom nomi kiriting!"); return; }
        setBulkSaving(true);
        let count = 0;
        for (const row of validRows) {
            const catName = dbCategories.find(c => c.id === row.categoryId)?.name || "Umumiy";
            await fetch("/api/smart/menu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: row.name.trim(),
                    category: catName,
                    sellingPrice: Number(row.price) || 0,
                    costPrice: 0,
                    type: row.type,
                    unit: row.unit || "dona",
                    printerIp: row.printer || null,
                    image: row.image || null,
                    sortOrder: row.sortOrder || "",
                    warehouse: row.type === "mahsulot" ? (row.warehouse || null) : null,
                    inStock: true,
                    autoCalculate: true,
                    hasBarcode: false,
                })
            });
            count++;
        }
        setBulkSaving(false);
        setIsBulkModalOpen(false);
        setBulkRows([emptyBulkRow()]);
        await loadFromDB();
        alert(`${count} ta taom muvaffaqiyatli qo'shildi!`);
    };

    return (
        <div className="animate-fade-in relative bg-white border border-slate-200">
            {/* Header Top */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-7 bg-blue-500 rounded text-transparent">|</div>
                        <h1 className="text-xl sm:text-[22px] font-bold text-slate-900">{t('nav.nom_dishes')}</h1>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition font-bold border border-slate-300 shadow-sm">
                        <Trash2 size={16} /> Arxivga o'ting
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => { setBulkRows([emptyBulkRow()]); setIsBulkModalOpen(true); }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition font-bold shadow-md w-full sm:w-auto"
                    >
                        <Plus size={16} /> Ko'plikda qo'shish
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition font-bold shadow-md w-full sm:w-auto">
                        {t('common.add')} <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                    <div className="w-full sm:flex-1 sm:max-w-[300px]">
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 font-medium transition-all"
                        />
                    </div>
                    <div className="flex-1 max-w-[300px] relative text-slate-600 font-bold">
                        <select className="w-full px-4 py-2 border border-slate-200 rounded text-sm outline-none focus:border-blue-500 text-slate-700 appearance-none bg-white font-bold placeholder:text-slate-400">
                            <option value="">Oshpazni tanlang</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90" size={16} />
                    </div>
                    <div className="flex-1 max-w-[300px] relative text-slate-600 font-bold">
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded text-sm outline-none focus:border-blue-500 text-slate-800 appearance-none bg-white font-bold"
                        >
                            <option value="">Kategoriya</option>
                            {dbCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90" size={16} />
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button onClick={() => { setSearchQuery(""); setSelectedCategory(""); }} className="w-full lg:w-auto px-6 py-2.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 hover:border-red-300 transition font-bold shadow-sm">
                        {t('common.filter') + ' ' + t('common.delete') || 'Tozalash'}
                    </button>
                </div>
            </div>

            {/* Content area */}
            <div className="p-2 overflow-x-auto">
                <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-3 py-3 rounded-l-xl font-bold text-center">№</th>
                            <th className="px-3 py-3 font-bold">Rasm</th>
                            <th className="px-3 py-3 font-bold">{t('common.name')}</th>
                            <th className="px-3 py-3 font-bold">Turi</th>
                            <th className="px-3 py-3 font-bold text-center">Birlik</th>
                            <th className="px-3 py-3 font-bold text-right">Tannarx</th>
                            <th className="px-3 py-3 font-bold text-right">Narx</th>
                            <th className="px-3 py-3 font-bold">Menyu</th>
                            <th className="px-3 py-3 font-bold">Printer</th>
                            <th className="px-3 py-3 font-bold">Retseptlar</th>
                            <th className="px-3 py-3 font-bold text-center">Qoldiq</th>
                            <th className="px-3 py-3 text-center font-bold">
                                Avto
                            </th>
                            <th className="px-3 py-3 font-bold text-center">{t('common.status')}</th>
                            <th className="px-3 py-3 rounded-r-xl font-bold"></th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {dbLoading ? (
                            <tr><td colSpan={14} className="text-center py-12 text-slate-400">
                                <div className="flex items-center justify-center gap-2"><RotateCw size={16} className="animate-spin" /> {t('common.loading')}</div>
                            </td></tr>
                        ) : filteredTaomlar.map((item: any) => {
                            const category = dbCategories.find(c => c.id === item.categoryId);
                            return (
                                <tr key={item.id} className="bg-white hover:bg-slate-50 border border-slate-100 shadow-sm transition text-slate-800 font-medium rounded-xl group">
                                    <td className="px-3 py-2.5 rounded-l-xl">
                                        <input type="text" value={item.sortOrder || "1"} readOnly className="w-8 h-8 px-1 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs outline-none text-slate-700 font-bold" />
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="w-10 h-10 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 relative overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt="dish" className="w-full h-full object-contain p-0.5" />
                                            ) : (
                                                <ImageIcon size={18} />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 font-bold text-sm max-w-[150px] truncate">{item.name}</td>
                                    <td className="px-3 py-2.5 text-slate-500">{item.type === "mahsulot" ? "Mahsulot" : "Taomlar"}</td>
                                    <td className="px-3 py-2.5 text-center font-semibold text-slate-500">{item.unit || "np"}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-500">{formatCurrency(item.cost).replace("so'm", "UZS")}</td>
                                    <td className="px-3 py-2.5 text-right font-black text-emerald-600">{formatCurrency(item.price).replace("so'm", "UZS")}</td>
                                    <td className="px-3 py-2.5 text-slate-600 font-semibold">{category?.name || ""}</td>
                                    <td className="px-3 py-2.5 leading-snug font-bold">
                                        {(() => {
                                            const ip = (item as any).printerIp || item.printer;
                                            if (!ip) return <span className="text-slate-300">-</span>;
                                            const found = printersList.find(p => p.ipAddress === ip);
                                            return <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px]">{found ? found.name : ip}</span>;
                                        })()}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-1.5 font-bold whitespace-nowrap text-slate-600">
                                            <div className="p-1 bg-slate-100 rounded-md">
                                                <List size={14} className="text-slate-500" />
                                            </div>
                                            Retsept ({item.recipes?.length || 0} ta)
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg text-blue-600 overflow-hidden w-16 h-8">
                                            <input type="text" value={item.stock || "-"} readOnly className="w-10 bg-transparent px-2 text-center text-xs outline-none font-black flex-1" />
                                            <button className="pr-2 bg-transparent hover:opacity-80"><RotateCw size={13} /></button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        <div className={`w-5 h-5 rounded-full mx-auto shadow-inner ${item.autoCalculate ? "bg-emerald-500" : "bg-slate-300"}`} />
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        {item.inStock ? (
                                            <span onClick={() => handleToggleStatus(item)} className="cursor-pointer select-none bg-emerald-50 border border-emerald-200 text-emerald-600 px-2.5 py-1 rounded-md text-[11px] font-bold w-max mx-auto hover:bg-emerald-100 transition-colors">#faol</span>
                                        ) : (
                                            <span onClick={() => handleToggleStatus(item)} className="cursor-pointer select-none bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-md text-[11px] font-bold w-max mx-auto hover:bg-slate-100 transition-colors">#nofaol</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 rounded-r-xl space-x-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(item)} className="p-2 border border-blue-200 text-blue-600 hover:bg-blue-50 bg-white rounded-lg transition shadow-sm"><Pencil size={14} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 border border-red-200 text-red-600 hover:bg-red-50 bg-white rounded-lg transition shadow-sm"><Trash2 size={14} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredTaomlar.length === 0 && (
                    <div className="text-center py-10 text-slate-500">{t('common.noData')}</div>
                )}
            </div>

            {/* Full Screen Modal matched with the User's Screenshot */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-100 animate-fade-in flex flex-col">
                    {/* Modal Header */}
                    <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                            <h2 className="text-xl font-black text-slate-900">{editingItem ? t('common.edit') + ' ' + t('nav.nom_dishes') : t('common.add') + ' ' + t('nav.nom_dishes')}</h2>
                        </div>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-700 hover:text-slate-900 hover:bg-slate-200 p-2 rounded-xl transition font-bold">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50/50">
                        <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-20">

                            {/* Main Info Block */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-8">
                                    
                                    <div className="flex flex-col sm:flex-row gap-8">
                                        {/* Image upload box - 3x4 format */}
                                        <div className="shrink-0">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Rasm (3x4)</label>
                                            <div
                                                className={`relative w-36 h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group
                                                    ${formData.image ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"}`}
                                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-blue-500", "bg-blue-100"); }}
                                                onDragLeave={(e) => { e.currentTarget.classList.remove("border-blue-500", "bg-blue-100"); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove("border-blue-500", "bg-blue-100");
                                                    const file = e.dataTransfer.files?.[0];
                                                    if (file && file.type.startsWith("image/")) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                onClick={() => (document.getElementById("taom-rasm-input") as HTMLInputElement)?.click()}
                                            >
                                                {formData.image ? (
                                                    <>
                                                        <img src={formData.image} alt="taom rasmi" className="absolute inset-0 w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
                                                            <ImageIcon size={24} className="text-white" />
                                                            <span className="text-white text-xs font-bold text-center px-2">O'zgartirish</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image: null }); }}
                                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow z-10"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 pointer-events-none text-slate-400 px-4 text-center">
                                                        <ImageIcon size={32} className="text-slate-300" />
                                                        <p className="text-xs font-bold text-slate-500">Rasm yuklash</p>
                                                        <p className="text-[10px] text-slate-400">PNG, JPG</p>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                id="taom-rasm-input"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between space-y-4">
                                            <div>
                                                <label className="block text-sm font-black text-slate-900 mb-1.5">Nomi <span className="text-red-600">*</span></label>
                                                <input type="text" placeholder="Nomni kiriting" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600 transition placeholder:text-slate-400 font-bold text-slate-900 shadow-sm" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-black text-slate-900 mb-1.5">Menyu</label>
                                                    <select 
                                                        value={formData.categoryId} 
                                                        onChange={e => {
                                                            if (e.target.value === "ADD_NEW") {
                                                                setIsNewMenuModalOpen(true);
                                                            } else {
                                                                setFormData({ ...formData, categoryId: e.target.value });
                                                            }
                                                        }} 
                                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600 transition appearance-none bg-white font-bold text-slate-900 shadow-sm"
                                                    >
                                                        <option value="">Menyuni tanlang</option>
                                                        {dbCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                        <option value="ADD_NEW" className="font-bold text-blue-600 bg-blue-50">+ Yangi menyu qo'shish</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-black text-slate-900 mb-1.5">Saralashtirish</label>
                                                    <input type="text" placeholder="Tartib raqami" value={formData.sortOrder || ""} onChange={e => setFormData({ ...formData, sortOrder: e.target.value })} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600 transition placeholder:text-slate-400 font-bold text-slate-900 shadow-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center justify-between">
                                            Retseptlar
                                            <button type="button" onClick={() => setIsRecipeModalOpen(true)} className="text-sm text-[#007bff] hover:text-blue-700 font-bold flex items-center gap-1">
                                                <Plus size={16} /> Qo'shish
                                            </button>
                                        </label>
                                        {formData.recipes && formData.recipes.length > 0 ? (
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                                                {formData.recipes.map((r, idx) => {
                                                    const found = dbXomashyo.find(x => x.id === r.xomashyoId);
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-sm bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                                            <span className="font-medium text-slate-700">{found?.name || 'Topilmadi'}</span>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-slate-500 font-semibold">{r.amount} <span className="text-slate-400 font-normal">{found?.unit}</span></span>
                                                                <button type="button" onClick={() => {
                                                                    const newRecipes = [...(formData.recipes || [])];
                                                                    newRecipes.splice(idx, 1);
                                                                    setFormData({ ...formData, recipes: newRecipes });
                                                                    updateCalculatedCost(newRecipes, formData.autoCalculate || false);
                                                                }} className="text-red-500 hover:text-red-600 p-1 bg-red-50 hover:bg-red-100 rounded-md transition"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">Hali retsept qo'shilmagan</div>
                                        )}
                                    </div>

                                    {/* Modifikatorlar - only visible for Set-menu */}
                                    {formData.isSetMenu && (
                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="flex text-sm font-bold text-slate-700 mb-4 items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Layers size={16} className="text-purple-500" />
                                                    Modifikatorlar
                                                    <span className="text-[11px] font-normal text-slate-400">(mijoz set ichidan tanlaydi)</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => openModifierModal()}
                                                    className="text-sm text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition"
                                                >
                                                    <Plus size={15} /> Modifikator qo&apos;shish
                                                </button>
                                            </label>
                                            {formData.modifiers && formData.modifiers.length > 0 ? (
                                                <div className="space-y-3">
                                                    {formData.modifiers.map((group, idx) => (
                                                        <div key={group.id} className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
                                                                    <Layers size={14} className="text-purple-500" />
                                                                    {group.name}
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openModifierModal(idx)}
                                                                        className="p-1 text-purple-600 hover:bg-purple-200 rounded transition"
                                                                    >
                                                                        <Pencil size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeModifierGroup(idx)}
                                                                        className="p-1 text-red-500 hover:bg-red-100 rounded transition"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {group.items.length === 0 ? (
                                                                    <span className="text-xs text-purple-400 italic">Mahsulotlar qo&apos;shilmagan</span>
                                                                ) : (
                                                                    group.items.map(item => (
                                                                        <span key={item.id} className="px-2.5 py-1 bg-white border border-purple-300 rounded-full text-xs font-semibold text-purple-800">
                                                                            {item.name}
                                                                        </span>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div
                                                    className="text-sm text-purple-400 italic text-center py-6 bg-purple-50 rounded-xl border border-purple-200 border-dashed cursor-pointer hover:bg-purple-100 transition"
                                                    onClick={() => openModifierModal()}
                                                >
                                                    <Layers size={24} className="mx-auto mb-2 text-purple-300" />
                                                    Modifikator qo&apos;shish uchun bosing
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Additional Settings Block (Previously Right Column) */}
                            <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm space-y-6">

                                {/* Type toggle */}
                                <div className="flex p-1 bg-slate-200 rounded-xl max-w-sm">
                                    <button type="button" onClick={() => setFormData({ ...formData, type: "taom" })} className={`flex-1 flex items-center px-4 py-2.5 rounded-lg text-sm font-bold transition ${formData.type === "taom" ? "bg-blue-600 text-white shadow-md border border-blue-700" : "text-slate-700 hover:text-slate-900 hover:bg-slate-300"}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3.5 h-3.5 rounded-full border-[3px] flex items-center justify-center ${formData.type === "taom" ? "border-white" : "border-slate-400"}`}>
                                            </div>
                                            Taom
                                        </div>
                                    </button>
                                    <button type="button" onClick={() => setFormData({ ...formData, type: "mahsulot" })} className={`flex-1 flex items-center px-4 py-2.5 rounded-lg text-sm font-bold transition ${formData.type === "mahsulot" ? "bg-blue-600 text-white shadow-md border border-blue-700" : "text-slate-700 hover:text-slate-900 hover:bg-slate-300"}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3.5 h-3.5 rounded-full border-[3px] flex items-center justify-center ${formData.type === "mahsulot" ? "border-white" : "border-slate-500"}`}>
                                            </div>
                                            Mahsulot
                                        </div>
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-900 mb-2">Sotish narxi <span className="text-red-600">*</span></label>
                                    <input type="number" placeholder="Sotish narxini kiriting" value={formData.price || ""} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} required className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600 transition placeholder:text-slate-400 font-bold text-slate-900" />
                                </div>

                                {/* Sarflanish ombori — only for mahsulot type */}
                                {formData.type === "mahsulot" && (
                                    <div>
                                        <label className="block text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
                                            🏭 Sarflanish ombori
                                            <span className="text-[10px] font-normal text-slate-400">(omborda ko&apos;rinishi uchun tanlang)</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={(formData as any).warehouse || ""}
                                                onChange={e => setFormData({ ...formData, warehouse: e.target.value } as any)}
                                                className="flex-1 border-2 border-blue-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600 transition appearance-none bg-white font-bold text-slate-900"
                                            >
                                                <option value="">Ombor tanlanmagan (ko&apos;rinmaydi)</option>
                                                <option value="Asosiy Ombor">🏭 Asosiy Ombor (Glavniy)</option>
                                                <option value="Zaxira Ombor">📦 Zaxira Ombor</option>
                                                <option value="Bufet Ombor">🍹 Bufet Ombor</option>
                                            </select>
                                            {!(formData as any).warehouse && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, warehouse: "Asosiy Ombor" } as any)}
                                                    className="px-4 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition whitespace-nowrap shadow-md"
                                                >
                                                    ✅ Glavniy
                                                </button>
                                            )}
                                        </div>
                                        {(formData as any).warehouse && (
                                            <p className="text-xs text-emerald-600 font-bold mt-1.5">
                                                ✅ Bu mahsulot &quot;{(formData as any).warehouse}&quot;da ombor qoldiqlarda ko&apos;rinadi
                                            </p>
                                        )}
                                    </div>
                                )}

                                {formData.type === "mahsulot" && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Qoldiq</label>
                                        <input type="number" placeholder="Qoldiqni kiriting" value={formData.stock || ""} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition placeholder:text-slate-300" />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">O'lchov birligi</label>
                                    <select value={formData.unit || ""} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition appearance-none bg-white font-medium text-slate-600">
                                        <option value="">O'lchov birligini tanlang</option>
                                        <option value="dona">Dona</option>
                                        <option value="kg">Kg</option>
                                        <option value="litr">Litr</option>
                                        <option value="porsiya">Porsiya</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="flex text-sm font-bold text-slate-700 mb-2 items-center gap-1.5">
                                        🖨️ Printer (oshxona cheki)
                                    </label>
                                    <select
                                        value={(formData as any).printerIp || formData.printer || ""}
                                        onChange={e => setFormData({ ...formData, printer: e.target.value, ...({ printerIp: e.target.value } as any) })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-500 transition appearance-none bg-white font-medium text-slate-600">
                                        <option value="">Printer tanlanmagan</option>
                                        {printersList.map(p => (
                                            <option key={p.id} value={`${p.ipAddress}`}>{p.name} ({p.ipAddress}:{p.port})</option>
                                        ))}
                                    </select>
                                    {printersList.length === 0 && (
                                        <p className="text-xs text-orange-500 mt-1.5">⚠️ Sozlamalar &gt; Printerlar bo&apos;limida printer qo&apos;shing</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Printerlar</label>
                                    <select value={formData.printers || ""} onChange={e => setFormData({ ...formData, printers: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition appearance-none bg-white font-medium text-slate-600">
                                        <option value="">Printerni tanlang</option>
                                        <option value="all">Barchasi</option>
                                    </select>
                                </div>

                                <div className="space-y-5 pt-2">
                                    {/* Toggle list */}
                                    <button type="button" className="flex items-center gap-3 w-full text-left"
                                        onClick={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, inStock: !prev.inStock })); }}>
                                        <div className={`relative w-11 h-6 transition-colors rounded-full shrink-0 ${formData.inStock ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.inStock ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 select-none">Holat</span>
                                    </button>

                                    <button type="button" className="flex items-center gap-3 w-full text-left"
                                        onClick={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, hasBarcode: !prev.hasBarcode })); }}>
                                        <div className={`relative w-11 h-6 transition-colors rounded-full shrink-0 ${formData.hasBarcode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.hasBarcode ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 select-none">Belgilash kodi mavjud</span>
                                    </button>

                                    <button type="button" className="flex items-center gap-3 w-full text-left"
                                        onClick={(e) => { e.preventDefault(); setFormData(prev => { const newVal = !prev.autoCalculate; updateCalculatedCost(prev.recipes || [], newVal); return { ...prev, autoCalculate: newVal }; }); }}>
                                        <div className={`relative w-11 h-6 transition-colors rounded-full shrink-0 ${formData.autoCalculate ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.autoCalculate ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 select-none">Avtomatik hisob-kitob (Tannarx)</span>
                                    </button>

                                    <button type="button" className="flex items-center gap-3 w-full text-left"
                                        onClick={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, isSetMenu: !prev.isSetMenu })); }}>
                                        <div className={`relative w-11 h-6 transition-colors rounded-full shrink-0 ${formData.isSetMenu ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.isSetMenu ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 select-none">Set-menyu</span>
                                    </button>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <button type="submit" className="w-full py-4 rounded-xl bg-blue-600 text-white text-base font-black hover:bg-blue-700 transition shadow-md">
                                        {editingItem ? t('common.edit') : t('common.add')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Sub Modal: Modifikator Guruhi qo'shish */}
            {isModifierModalOpen && createPortal(
                <div className="fixed inset-0 z-[130] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col border border-purple-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50 shrink-0">
                            <div className="flex items-center gap-2">
                                <Layers size={18} className="text-purple-500" />
                                <h3 className="text-base font-black text-slate-900">
                                    {editingModifierGroupIdx !== null ? "Modifikatorni tahrirlash" : "Yangi modifikator guruhi"}
                                </h3>
                            </div>
                            <button onClick={() => setIsModifierModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 hover:bg-slate-100 rounded-full transition border border-slate-200">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Group name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Guruh nomi <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Ichimlik tanlang"
                                    value={modifierGroupForm.name}
                                    onChange={e => setModifierGroupForm({ ...modifierGroupForm, name: e.target.value })}
                                    className="w-full border border-slate-300 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none font-medium placeholder:text-slate-300 transition"
                                />
                            </div>

                            {/* Selected items chips */}
                            {modifierGroupForm.items.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {modifierGroupForm.items.map(item => (
                                        <span key={item.id} className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 border border-purple-300 rounded-full text-xs font-semibold text-purple-800">
                                            {item.name}
                                            <button type="button" onClick={() => toggleModifierItem(item)} className="text-purple-500 hover:text-red-500 transition">
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Search + list of dbItems */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mahsulotlarni tanlang</label>
                                <input
                                    type="text"
                                    placeholder="Qidiruv..."
                                    value={modifierItemSearch}
                                    onChange={e => setModifierItemSearch(e.target.value)}
                                    className="w-full border border-slate-200 focus:border-purple-400 rounded-lg px-2 py-2 text-sm outline-none mb-2 placeholder:text-slate-300 transition"
                                />
                                <div className="max-h-52 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2 bg-slate-50">
                                    {dbItems
                                        .filter(it => it.name.toLowerCase().includes(modifierItemSearch.toLowerCase()))
                                        .map((it: any) => {
                                            const selected = modifierGroupForm.items.some(i => i.id === it.id);
                                            return (
                                                <button
                                                    key={it.id}
                                                    type="button"
                                                    onClick={() => toggleModifierItem({ id: it.id, name: it.name })}
                                                    className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm font-medium transition ${
                                                        selected
                                                            ? "bg-purple-100 text-purple-900 border border-purple-300"
                                                            : "bg-white text-slate-700 border border-slate-200 hover:border-purple-300 hover:bg-purple-50"
                                                    }`}
                                                >
                                                    <span>{it.name}</span>
                                                    {selected && <Check size={14} className="text-purple-600" />}
                                                </button>
                                            );
                                        })
                                    }
                                    {dbItems.filter(it => it.name.toLowerCase().includes(modifierItemSearch.toLowerCase())).length === 0 && (
                                        <p className="text-center text-xs text-slate-400 py-4">Mahsulot topilmadi</p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModifierModalOpen(false)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition">Bekor qilish</button>
                                <button
                                    type="button"
                                    onClick={saveModifierGroup}
                                    disabled={!modifierGroupForm.name.trim() || modifierGroupForm.items.length === 0}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                >
                                    Saqlash
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Sub Modal: Retsept Qo'shish matched with screenshot */}
            {isRecipeModalOpen && createPortal(
                <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm animate-fade-in shadow-2xl drop-shadow-2xl">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-slate-200">
                        {/* Header Box */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white relative">
                            <div className="flex items-center gap-12">
                                <div>
                                    <p className="text-[11px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Nomlar</p>
                                    <h3 className="text-[15px] font-bold text-slate-800">{formData.name || 'Archives'}</h3>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Sotish narxi</p>
                                    <h3 className="text-[15px] font-bold text-slate-800">{formData.price ? formData.price.toLocaleString("uz-UZ") : '0'}</h3>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Tannarx</p>
                                    <h3 className="text-[15px] font-bold text-slate-800">{formData.cost ? formData.cost.toLocaleString("uz-UZ") : '0'}</h3>
                                </div>
                            </div>
                            <button onClick={() => setIsRecipeModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full transition">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Form Box */}
                        <div className="p-6 bg-white flex items-end gap-5 overflow-y-auto pb-8">
                            <div className="flex-[1.2]">
                                <label className="block text-xs font-bold text-slate-700 mb-2">Ombor</label>
                                <select value={recipeForm.ombor} onChange={e => setRecipeForm({ ...recipeForm, ombor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-[#007bff] text-slate-500 bg-white shadow-sm font-medium">
                                    <option value="">Omborni tanlang</option>
                                    <option value="main">Asosiy ombor</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-700 mb-2">Turi</label>
                                <select value={recipeForm.turi} onChange={e => setRecipeForm({ ...recipeForm, turi: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-[#007bff] text-slate-600 bg-white shadow-sm font-medium">
                                    <option value="xomashyo">Xomashyo</option>
                                    <option value="yarim_tayyor">Yarim tayyor</option>
                                </select>
                            </div>
                            <div className="flex-[1.8]">
                                <label className="block text-xs font-bold text-slate-700 mb-2">Mahsulot</label>
                                <select value={recipeForm.xomashyoId} onChange={e => setRecipeForm({ ...recipeForm, xomashyoId: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-[#007bff] text-[#007bff] bg-white shadow-sm font-medium">
                                    <option value="" className="text-slate-400">Tanlang</option>
                                    {dbXomashyo.map(x => <option key={x.id} value={x.id} className="text-slate-800">{x.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-700 mb-2">Miqdor <span className="text-[#e3342f]">*</span></label>
                                <div className="flex border border-slate-200 rounded-lg overflow-hidden focus-within:border-[#007bff] transition shadow-sm bg-white">
                                    <input type="number" step="any" placeholder="Kiritish" value={recipeForm.amount} onChange={e => setRecipeForm({ ...recipeForm, amount: e.target.value })} className="w-full px-2 py-2 outline-none text-sm min-w-0 font-medium placeholder:text-slate-300" />
                                    <div className="bg-[#f8fafc] flex items-center justify-center px-2 text-xs font-bold text-slate-400 border-l border-slate-200 min-w-[50px]">
                                        {recipeForm.xomashyoId ? (dbXomashyo.find(x => x.id === recipeForm.xomashyoId)?.unit || '') : ''}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <button type="button" onClick={() => {
                                    if (!recipeForm.xomashyoId || !recipeForm.amount) return;
                                    const current = formData.recipes || [];
                                    const newRecipes = [...current, { xomashyoId: recipeForm.xomashyoId, amount: Number(recipeForm.amount) }];
                                    setFormData({ ...formData, recipes: newRecipes });
                                    updateCalculatedCost(newRecipes, formData.autoCalculate || false);
                                    setRecipeForm({ ...recipeForm, xomashyoId: "", amount: "" });
                                    setIsRecipeModalOpen(false);
                                }} className="px-6 py-2.5 bg-[#007bff] text-white rounded-md text-[13px] font-bold hover:bg-[#0069d9] transition shadow-sm whitespace-nowrap h-[38px] flex items-center">
                                    Qo'shish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Sub Modal: Yangi menyu qo'shish */}
            {isNewMenuModalOpen && createPortal(
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h3 className="text-base font-black text-slate-900">Yangi menyu qo'shish</h3>
                            <button onClick={() => setIsNewMenuModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 hover:bg-slate-100 rounded-full transition border border-slate-200">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Menyu nomi</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Milliy taomlar"
                                    value={newMenuName}
                                    onChange={e => setNewMenuName(e.target.value)}
                                    autoFocus
                                    className="w-full border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-3 text-sm outline-none font-bold placeholder:text-slate-300 transition"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsNewMenuModalOpen(false)} className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 text-sm font-bold transition">
                                    Bekor qilish
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (newMenuName.trim()) {
                                            const newId = "cat_" + Date.now();
                                            const newCat = { id: newId, name: newMenuName.trim() };
                                            setDbCategories(prev => [...prev, newCat]);
                                            setFormData({ ...formData, categoryId: newId });
                                            setNewMenuName("");
                                            setIsNewMenuModalOpen(false);
                                        }
                                    }}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition shadow-sm"
                                >
                                    Qo'shish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Bulk Add Modal */}
            {isBulkModalOpen && createPortal(
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col border border-slate-200 max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-7 bg-emerald-500 rounded"></div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Ko'plikda taom qo'shish</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Har bir qatorga taom ma'lumotlarini kiriting, tayyor bo'lgach "Saqlash" tugmasini bosing</p>
                                </div>
                            </div>
                            <button onClick={() => setIsBulkModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 hover:bg-slate-100 rounded-full transition border border-slate-200">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto overflow-y-auto flex-1 px-4 py-4">
                            {/* Column Headers */}
                            <div className="grid gap-2 mb-2 px-2 min-w-[1050px]" style={{gridTemplateColumns: '2fr 1.1fr 0.85fr 1.1fr 0.75fr 0.75fr 1fr 0.6fr 44px 32px'}}>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Taom nomi <span className="text-red-500">*</span></span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Menyu</span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Sotish narxi</span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Printer</span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">O'lchov</span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Turi</span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Sklad</span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Sort</span>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Rasm</span>
                                <span className="w-8"></span>
                            </div>

                            <div className="space-y-2 min-w-[1050px]">
                                {bulkRows.map((row, idx) => (
                                    <div key={idx} className="grid gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 hover:border-blue-300 transition" style={{gridTemplateColumns: '2fr 1.1fr 0.85fr 1.1fr 0.75fr 0.75fr 1fr 0.6fr 44px 32px'}}>
                                        {/* Nomi */}
                                        <input
                                            type="text"
                                            placeholder={`${idx + 1}. Taom nomi...`}
                                            value={row.name}
                                            onChange={e => {
                                                const updated = [...bulkRows];
                                                updated[idx] = { ...updated[idx], name: e.target.value };
                                                setBulkRows(updated);
                                                // Auto-add new row when typing in the last row
                                                if (idx === bulkRows.length - 1 && e.target.value.trim()) {
                                                    setBulkRows([...updated, emptyBulkRow()]);
                                                }
                                            }}
                                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-bold placeholder:text-slate-300 bg-white transition"
                                        />
                                        {/* Menyu */}
                                        <select
                                            value={row.categoryId}
                                            onChange={e => {
                                                const updated = [...bulkRows];
                                                updated[idx] = { ...updated[idx], categoryId: e.target.value };
                                                setBulkRows(updated);
                                            }}
                                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium bg-white appearance-none transition"
                                        >
                                            <option value="">Tanlang</option>
                                            {dbCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                        {/* Narx */}
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={row.price}
                                            onChange={e => {
                                                const updated = [...bulkRows];
                                                updated[idx] = { ...updated[idx], price: e.target.value };
                                                setBulkRows(updated);
                                            }}
                                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-bold placeholder:text-slate-300 bg-white transition"
                                        />
                                        {/* Printer */}
                                        <select
                                            value={row.printer}
                                            onChange={e => {
                                                const updated = [...bulkRows];
                                                updated[idx] = { ...updated[idx], printer: e.target.value };
                                                setBulkRows(updated);
                                            }}
                                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium bg-white appearance-none transition w-full"
                                        >
                                            <option value="">Printer yo'q</option>
                                            {printersList.map(p => (
                                                <option key={p.id} value={p.ipAddress}>{p.name}</option>
                                            ))}
                                        </select>
                                        {/* O'lchov */}
                                        <select
                                            value={row.unit}
                                            onChange={e => {
                                                const updated = [...bulkRows];
                                                updated[idx] = { ...updated[idx], unit: e.target.value };
                                                setBulkRows(updated);
                                            }}
                                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium bg-white appearance-none transition"
                                        >
                                            <option value="dona">Dona</option>
                                            <option value="kg">Kg</option>
                                            <option value="litr">Litr</option>
                                            <option value="porsiya">Porsiya</option>
                                        </select>
                                        {/* Turi */}
                                        <select
                                            value={row.type}
                                            onChange={e => {
                                                const updated = [...bulkRows];
                                                updated[idx] = { ...updated[idx], type: e.target.value, warehouse: e.target.value === "taom" ? "" : updated[idx].warehouse };
                                                setBulkRows(updated);
                                            }}
                                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium bg-white appearance-none transition"
                                        >
                                            <option value="taom">Taom</option>
                                            <option value="mahsulot">Mahsulot</option>
                                        </select>
                                        {/* Sklad — only when mahsulot */}
                                        {row.type === "mahsulot" ? (
                                            <select
                                                value={row.warehouse}
                                                onChange={e => {
                                                    const updated = [...bulkRows];
                                                    updated[idx] = { ...updated[idx], warehouse: e.target.value };
                                                    setBulkRows(updated);
                                                }}
                                                className="border-2 border-orange-300 rounded-lg px-2 py-2 text-xs outline-none focus:border-orange-500 font-bold bg-orange-50 appearance-none transition w-full"
                                            >
                                                <option value="">Sklad yo'q</option>
                                                <option value="Asosiy Ombor">Asosiy Ombor</option>
                                                <option value="Zaxira Ombor">Zaxira Ombor</option>
                                                <option value="Bufet Ombor">Bufet Ombor</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center justify-center text-slate-300 text-xs font-medium">—</div>
                                        )}
                                        {/* Sort Order */}
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={row.sortOrder}
                                            onChange={e => {
                                                const updated = [...bulkRows];
                                                updated[idx] = { ...updated[idx], sortOrder: e.target.value };
                                                setBulkRows(updated);
                                            }}
                                            className="border border-slate-300 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-500 font-bold placeholder:text-slate-300 bg-white transition text-center"
                                        />
                                        {/* Rasm */}
                                        <label className="relative w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 overflow-hidden group transition shrink-0">
                                            {row.image ? (
                                                <>
                                                    <img src={row.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <ImageIcon size={12} className="text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <ImageIcon size={16} className="text-slate-400 group-hover:text-blue-500 transition" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            const updated = [...bulkRows];
                                                            updated[idx] = { ...updated[idx], image: reader.result as string };
                                                            setBulkRows(updated);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {/* Delete row */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (bulkRows.length === 1) return;
                                                setBulkRows(bulkRows.filter((_, i) => i !== idx));
                                            }}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add row manually */}
                            <button
                                type="button"
                                onClick={() => setBulkRows([...bulkRows, emptyBulkRow()])}
                                className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-600 border border-dashed border-emerald-300 rounded-xl w-full justify-center hover:bg-emerald-50 transition"
                            >
                                <Plus size={16} /> Yangi qator qo'shish
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 rounded-b-2xl">
                            <span className="text-sm text-slate-500 font-medium">
                                {bulkRows.filter(r => r.name.trim()).length} ta taom saqlashga tayyor
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsBulkModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-200 text-sm font-bold transition border border-slate-300"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkSave}
                                    disabled={bulkSaving}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition shadow-md disabled:opacity-60 flex items-center gap-2"
                                >
                                    {bulkSaving ? (
                                        <><RotateCw size={16} className="animate-spin" /> Saqlanmoqda...</>
                                    ) : (
                                        <><Check size={16} /> Hammasini saqlash</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
