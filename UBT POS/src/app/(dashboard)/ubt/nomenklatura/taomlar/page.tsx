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
            const res = await fetch("/api/ubt/menu");
            const data = await res.json();
            setDbItems(data.items ?? []);
            setDbCategories(data.categories ?? []);
            
            const ingRes = await fetch("/api/ubt/xomashyo");
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
        fetch("/api/ubt/printers")
            .then(r => r.json())
            .then(d => setprintersList(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [recipeForm, setRecipeForm] = useState({ ombor: "", turi: "xomashyo", xomashyoId: "", amount: "" });

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
            const res = await fetch("/api/ubt/menu", {
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
                    modifiers: formData.modifiers || []
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

    const handleDelete = async (id: string) => {
        if (!confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) return;
        // Find in DB items first, fallback to id as name
        const taom = dbItems.find((t: any) => t.id === id);
        if (taom) {
            try {
                const res = await fetch("/api/ubt/menu", {
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

    return (
        <div className="animate-fade-in relative bg-white border border-slate-200">
            {/* Header Top */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-7 bg-blue-500 rounded text-transparent">|</div>
                        <h1 className="text-xl sm:text-[22px] font-bold text-slate-900">{t('nav.nom_dishes')}</h1>
                    </div>
                    <button className="flex items-center gap-2 px-2 py-1.5 bg-[#f4f5f7] text-slate-700 rounded-md text-sm hover:bg-slate-200 transition font-bold border border-slate-300">
                        <Trash2 size={14} /> Arxivga o'ting
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button 
                        onClick={() => {
                            const csvContent = "data:text/csv;charset=utf-8," 
                                + ["Nomi,Turi,O'lchov,Tannarx,Sotish narxi,Qoldiq,Holat"].join(",") + "\n"
                                + filteredTaomlar.map(t => `${t.name},${t.type},${t.unit},${t.cost},${t.price},${t.stock},${t.inStock ? "Faol" : "Nofaol"}`).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", "taomlar.csv");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00b050] text-white rounded text-sm hover:bg-[#009b47] transition font-bold shadow-sm w-full sm:w-auto"
                    >
                        <FileSpreadsheet size={16} /> EXCEL dasturini yuklab oling
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition font-bold shadow-sm w-full sm:w-auto">
                        {t('common.add')} <Plus size={16} />
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
                            className="w-full px-4 py-2 border border-slate-200 rounded text-sm outline-none focus:border-blue-400 placeholder:text-slate-300"
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
                    <button onClick={() => { setSearchQuery(""); setSelectedCategory(""); }} className="w-full lg:w-auto px-6 py-2 border border-[#f6a0a8] text-[#e3342f] rounded text-sm hover:bg-red-50 transition font-medium">
                        {t('common.filter') + ' ' + t('common.delete') || 'Tozalash'}
                    </button>
                </div>
            </div>

            {/* Content area */}
            <div className="p-2 overflow-x-auto">
                <table className="w-full text-xs text-left border-separate border-spacing-y-2">
                    <thead className="bg-[#e4ebf5] text-slate-800 font-black border-b-none text-[11px] uppercase tracking-wide">
                        <tr>
                            <th className="px-1.5 py-2 rounded-l-lg border-r border-[#d4dceb] font-bold text-center">№</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold">Rasm</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold">{t('common.name')}</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold">Turi</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold text-center">Birlik</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold text-right">Tannarx</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold text-right">Narx</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold">Menyu</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold">Printer</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold">Retseptlar</th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold text-center">Qoldiq</th>
                            <th className="px-1 py-2 border-r border-[#d4dceb] text-center font-bold text-[10px]">
                                Avto
                            </th>
                            <th className="px-1.5 py-2 border-r border-[#d4dceb] font-bold text-center">{t('common.status')}</th>
                            <th className="px-1 py-2 rounded-r-lg font-bold"></th>
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
                                <tr key={item.id} className="bg-[#f0f3f8] hover:bg-[#e4ebf5] transition text-slate-900 font-semibold">
                                    <td className="px-1.5 py-1.5 rounded-l-lg border-r border-[#e4ebf5]">
                                        <input type="text" value={item.sortOrder || "1"} readOnly className="w-8 h-8 px-1 bg-white border border-slate-300 rounded text-center text-xs outline-none text-slate-800 font-bold" />
                                    </td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5]">
                                        <div className="w-10 h-10 bg-[#eef1f6] rounded border border-[#e4ebf5] flex items-center justify-center text-slate-400 relative overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt="dish" className="w-full h-full object-contain p-0.5" />
                                            ) : (
                                                <ImageIcon size={18} />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-1.5 py-1.5 font-black text-[13px] border-r border-[#e4ebf5] max-w-[150px] truncate">{item.name}</td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5]">{item.type === "mahsulot" ? "Mahsulot" : "Taomlar"}</td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5] text-center font-bold">{item.unit || "np"}</td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5] text-right text-slate-700">{formatCurrency(item.cost).replace("so'm", "UZS")}</td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5] text-right font-black text-slate-900">{formatCurrency(item.price).replace("so'm", "UZS")}</td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5] text-slate-800">{category?.name || ""}</td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5] leading-snug font-bold">
                                        {(() => {
                                            const ip = (item as any).printerIp || item.printer;
                                            if (!ip) return <span className="text-slate-400">-</span>;
                                            const found = printersList.find(p => p.ipAddress === ip);
                                            return <span className="text-blue-700 text-[11px]">{found ? found.name : ip}</span>;
                                        })()}
                                    </td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5]">
                                        <div className="flex items-center gap-1.5 font-bold whitespace-nowrap text-slate-800">
                                            <div className="p-0.5 border border-slate-500 rounded-sm">
                                                <List size={12} className="text-slate-700" />
                                            </div>
                                            Retsept ({item.recipes?.length || 0} ta)
                                        </div>
                                    </td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5]">
                                        <div className="flex items-center bg-[#e4ebf5] border border-blue-500 rounded text-[#3490dc] overflow-hidden w-16 h-8">
                                            <input type="text" value={item.stock || "-"} readOnly className="w-10 bg-transparent px-2 text-center text-xs outline-none font-black flex-1 text-slate-900" />
                                            <button className="pr-2 bg-transparent hover:opacity-80"><RotateCw size={13} /></button>
                                        </div>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center border-r border-[#e4ebf5]">
                                        <div className={`w-5 h-5 rounded-full mx-auto ${item.autoCalculate ? "bg-[#00b050]" : "bg-slate-400 border border-slate-500"}`} />
                                    </td>
                                    <td className="px-1.5 py-1.5 border-r border-[#e4ebf5] text-center">
                                        {item.inStock ? (
                                            <span className="border border-[#00b050] text-[#00b050] px-2 py-0.5 rounded text-[10px] font-black w-max mx-auto bg-white">#faol</span>
                                        ) : (
                                            <span className="border border-slate-500 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black w-max mx-auto bg-white shadow-sm">#nofaol</span>
                                        )}
                                    </td>
                                    <td className="px-1.5 py-1.5 rounded-r-lg space-x-2 text-right">
                                        <button onClick={() => handleOpenModal(item)} className="p-1.5 border border-[#3490dc] text-[#3490dc] hover:bg-blue-50 bg-white rounded transition"><Pencil size={13} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 border border-[#e3342f] text-[#e3342f] hover:bg-red-50 bg-white rounded transition"><Trash2 size={13} /></button>
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
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-700 hover:text-slate-900 hover:bg-slate-200 p-2 rounded-xl transition font-bold">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden min-h-0 px-6 py-4">

                            {/* Left column - 2/3 width */}
                            <div className="flex-[2] lg:overflow-y-auto space-y-6 pb-4">
                                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-8">
                                    {/* Image upload box - drag & drop */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Rasm</label>
                                        <div
                                            className={`relative w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group
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
                                                    <img src={formData.image} alt="taom rasmi" className="absolute inset-0 w-full h-full object-contain p-2" />
                                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
                                                        <ImageIcon size={28} className="text-white" />
                                                        <span className="text-white text-sm font-bold">Rasmni o&apos;zgartirish</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image: null }); }}
                                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow z-10"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 pointer-events-none text-slate-400">
                                                    <ImageIcon size={36} className="text-slate-300" />
                                                    <p className="text-sm font-bold text-slate-500">Rasmni bu yerga tashlang</p>
                                                    <p className="text-xs text-slate-400">yoki bosib yukl ang (PNG, JPG, WEBP)</p>
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

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-black text-slate-900 mb-2">Nomi <span className="text-red-600">*</span></label>
                                            <input type="text" placeholder="Nomni kiriting" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600 transition placeholder:text-slate-400 font-bold text-slate-900" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-black text-slate-900 mb-2">Menyu</label>
                                            <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600 transition appearance-none bg-white font-bold text-slate-900">
                                                <option value="">Menyuni tanlang</option>
                                                {dbCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Saralashtirish</label>
                                        <input type="text" placeholder="Saralashtirishni kiriting" value={formData.sortOrder || ""} onChange={e => setFormData({ ...formData, sortOrder: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition placeholder:text-slate-300" />
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

                            {/* Right column - 1/3 width */}
                            <div className="flex-[1] bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm space-y-6 lg:overflow-y-auto">

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
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, inStock: !prev.inStock }))}>
                                        <div className={`relative w-11 h-6 transition-colors rounded-full shrink-0 ${formData.inStock ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.inStock ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 select-none">Holat</span>
                                    </div>

                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, hasBarcode: !prev.hasBarcode }))}>
                                        <div className={`relative w-11 h-6 transition-colors rounded-full shrink-0 ${formData.hasBarcode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.hasBarcode ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 select-none">Belgilash kodi mavjud</span>
                                    </div>

                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                                        setFormData(prev => {
                                            const newVal = !prev.autoCalculate;
                                            updateCalculatedCost(prev.recipes || [], newVal);
                                            return { ...prev, autoCalculate: newVal };
                                        });
                                    }}>
                                        <div className={`relative w-11 h-6 transition-colors rounded-full shrink-0 ${formData.autoCalculate ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.autoCalculate ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 select-none">Avtomatik hisob-kitob (Tannarx)</span>
                                    </div>

                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, isSetMenu: !prev.isSetMenu }))}>
                                        <div className={`relative w-11 h-6 transition-colors rounded-full shrink-0 ${formData.isSetMenu ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.isSetMenu ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 select-none">Set-menyu</span>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button type="submit" className="w-[120px] py-3 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                                        {editingItem ? t('common.edit') : t('common.add')}
                                    </button>
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
        </div>
    );
}
