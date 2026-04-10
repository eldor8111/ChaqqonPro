"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileSpreadsheet, X, Check, Package, RotateCw, AlertTriangle, Printer, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";

export default function OmborKirimPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [kirimlar, setKirimlar] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Nomenklatura items (Faqat xaridi va sotuvi bo'ladigan mahsulotlar hamda Xomashyolar)
    const { nomenklaturaTaomlar, nomenklaturaXomashyo, updateNomenklaturaTaom, updateNomenklaturaXomashyo } = useStore();
    const allProducts = [
        ...nomenklaturaTaomlar.filter(t => t.type === 'mahsulot' || t.hasBarcode).map(t => ({ ...t, productType: 'taom' })),
        ...nomenklaturaXomashyo.map(x => ({ ...x, productType: 'xomashyo' }))
    ];

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const initialItem = { productId: "", productName: "", quantity: "", costPrice: "", unit: "dona", productType: "" };
    const [formData, setFormData] = useState({
        supplier: "",
        warehouse: "Asosiy Ombor",
        currency: "UZS",
        notes: "",
        items: [{ ...initialItem }]
    });
    
    const [isSaving, setIsSaving] = useState(false);

    const fetchKirimlar = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ubt/ombor/kirim");
            if (res.ok) {
                const data = await res.json();
                setKirimlar(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKirimlar();
    }, []);

    const handleProductSelect = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const prod = allProducts.find(p => p.id === selectedId);
        if (prod) {
            const newItems = [...formData.items];
            newItems[index] = {
                ...newItems[index],
                productId: prod.id,
                productName: prod.name,
                unit: (prod as any).unit || "dona",
                costPrice: ((prod as any).cost || (prod as any).price || 0).toString(),
                productType: prod.productType
            };
            setFormData({ ...formData, items: newItems });
        }
    };

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...formData.items];
        (newItems[index] as any)[field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const addItemRow = () => {
        setFormData({ ...formData, items: [...formData.items, { ...initialItem }] });
    };

    const removeItemRow = (index: number) => {
        if (formData.items.length <= 1) return;
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        
        // Validation
        const validItems = formData.items.filter(item => item.productId && Number(item.quantity) > 0);
        if (validItems.length === 0) return alert("Kamida 1 ta mahsulotni to'liq kiriting (Miqdori bo'sh bo'lmasin)");

        setIsSaving(true);
        try {
            const res = await fetch("/api/ubt/ombor/kirim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: new Date(),
                    supplier: formData.supplier,
                    warehouse: formData.warehouse,
                    currency: formData.currency,
                    notes: formData.notes,
                    items: validItems,
                    status: "accepted"
                })
            });
            
            if (res.ok) {
                // Tizim holatini yangila (Zustand)
                validItems.forEach(item => {
                    const parsedQty = Number(item.quantity);
                    const prod = allProducts.find(p => p.id === item.productId);
                    if (prod && parsedQty > 0) {
                        const newStock = ((prod as any).stock || 0) + parsedQty;
                        if (prod.productType === 'taom') {
                             updateNomenklaturaTaom(prod.id, { stock: newStock });
                        } else {
                             updateNomenklaturaXomashyo(prod.id, { stock: newStock });
                        }
                    }
                });

                setIsModalOpen(false);
                setFormData({ supplier: "", warehouse: "Asosiy Ombor", currency: "UZS", notes: "", items: [{ ...initialItem }] });
                fetchKirimlar();
            } else {
                alert("Serverda xatolik yuz berdi");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintInvoice = (item: any) => {
        // Simple receipt print window creation
        const printWindow = window.open("", "_blank", "width=800,height=600");
        if (!printWindow) return alert("Pop-uplarga ruxsat bering");

        const dateStr = new Date(item.createdAt).toLocaleString('uz-UZ');
        const printContent = `
            <html>
                <head>
                    <title>Nakladnoy - ${item.id || 'Kirim'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                        .table th { background-color: #f8f9fa; }
                        .total { text-align: right; margin-top: 20px; font-weight: bold; font-size: 18px; }
                        .footer { margin-top: 50px; display: flex; justify-content: space-between; }
                        .sign-box { border-top: 1px solid #333; padding-top: 5px; width: 200px; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>KIRIM NAKLADNOYI</h2>
                        <p>Kirim Sanasi: ${dateStr}</p>
                    </div>
                    
                    <div>
                        <p><strong>Yetkazib beruvchi:</strong> ${item.supplier || 'Noma\'lum'}</p>
                        <p><strong>Qaysi Omborga:</strong> ${item.warehouse || 'Asosiy Ombor'}</p>
                    </div>

                    <table class="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Mahsulot Nomi</th>
                                <th>O'lchov (birligi)</th>
                                <th>Miqdori</th>
                                <th>Narxi</th>
                                <th>Umumiy Summasi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>${item.productName}</td>
                                <td>${item.unit}</td>
                                <td>${item.quantity}</td>
                                <td>${(item.costPrice || 0).toLocaleString()} ${item.notes?.includes('Valyuta: USD') ? 'USD' : 'UZS'}</td>
                                <td>${(item.totalCost || 0).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="total">
                        JAMI SUMMA: ${(item.totalCost || 0).toLocaleString()} ${item.notes?.includes('Valyuta: USD') ? 'USD' : 'UZS'}
                    </div>

                    <div class="footer">
                        <div class="sign-box">Topshirdi (Yetkazib beruvchi)</div>
                        <div class="sign-box">Qabul qildi (Omborchi)</div>
                    </div>
                    
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const filtered = kirimlar.filter(k => 
        k.productName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        k.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grandTotal = formData.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.costPrice) || 0), 0);

    return (
        <div className="animate-fade-in relative bg-white border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-7 bg-blue-500 rounded text-transparent">|</div>
                    <h1 className="text-[22px] font-bold text-slate-800">Kirim Hujjatlari</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5">
                        <FileSpreadsheet size={16} /> EXCEL
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm hover:from-blue-700 hover:to-indigo-700 transition-all font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5">
                        <Plus size={16} strokeWidth={2.5} /> Yangi kirim
                    </button>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1 max-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Qidiruv (Mahsulot yoki Yetkazib beruvchi)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 placeholder:text-slate-300 transition-all"
                        />
                    </div>
                </div>
                <button onClick={fetchKirimlar} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                    <RotateCw size={16} className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="p-4 overflow-x-auto flex-1">
                <table className="w-full text-xs text-left whitespace-nowrap border-separate border-spacing-y-2">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                            <th className="px-4 py-3 rounded-l-xl">Sana</th>
                            <th className="px-4 py-3">Mahsulot nomi</th>
                            <th className="px-4 py-3">Yetkazib beruvchi</th>
                            <th className="px-4 py-3">Ombor</th>
                            <th className="px-4 py-3">Miqdori</th>
                            <th className="px-4 py-3">Summasi</th>
                            <th className="px-4 py-3">Holati</th>
                            <th className="px-4 py-3 rounded-r-xl">Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {isLoading ? (
                            <tr><td colSpan={8} className="text-center py-10"><RotateCw className="animate-spin mx-auto text-blue-500" /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-10 text-slate-500">Hech qanday hujjat topilmadi</td></tr>
                        ) : (
                            filtered.map((item) => (
                                <tr key={item.id} className="bg-white border hover:shadow-sm transition-all group">
                                    <td className="px-4 py-3 border-y border-l rounded-l-xl border-slate-100">
                                        {new Date(item.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100 font-medium text-blue-700">{item.productName}</td>
                                    <td className="px-4 py-3 border-y border-slate-100">{item.supplier}</td>
                                    <td className="px-4 py-3 border-y border-slate-100">{item.warehouse}</td>
                                    <td className="px-4 py-3 border-y border-slate-100 font-bold text-emerald-600">
                                        +{item.quantity} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100 font-bold text-slate-800">
                                        {item.totalCost?.toLocaleString()} {item.notes?.includes('Valyuta: USD') ? 'USD' : 'UZS'}
                                    </td>
                                    <td className="px-4 py-3 border-y border-slate-100">
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Qabul qilingan</span>
                                    </td>
                                    <td className="px-4 py-3 border-y border-r rounded-r-xl border-slate-100">
                                        <button onClick={() => handlePrintInvoice(item)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold flex items-center gap-1 transition-colors border border-blue-200">
                                            <Printer size={14} /> Nakladnoy 
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Premium Multi-Item Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Yangi Kirim Hujjati</h2>
                                    <p className="text-xs text-slate-500">Omborga bir martada bir nechta mahsulot qabul qilish</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 overflow-y-auto flex-1">
                                {/* Hujjat Asosiy Ma'lumotlari */}
                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Yetkazib beruvchi</label>
                                        <input type="text" placeholder="Sharq Ta'minot..." value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Qaysi Omborga</label>
                                        <select value={formData.warehouse} onChange={e => setFormData({...formData, warehouse: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm bg-white">
                                            <option value="Asosiy Ombor">Asosiy Ombor</option>
                                            <option value="Oshxona Ombori">Oshxona Ombori</option>
                                            <option value="Bar Ombori">Bar Ombori</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Valyuta</label>
                                        <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm bg-white font-bold text-blue-700">
                                            <option value="UZS">🇺🇿 UZS (So'm)</option>
                                            <option value="USD">🇺🇸 USD (Dollar)</option>
                                            <option value="EUR">🇪🇺 EUR (Yevro)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Izoh</label>
                                        <input type="text" placeholder="Kirim haqida..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" />
                                    </div>
                                </div>

                                {/* Mahsulotlar Ro'yxati */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm whitespace-nowrap bg-white">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3 w-[40%]">Mahsulot nomi</th>
                                                <th className="px-4 py-3 w-[20%]">Miqdori (birligi bilan)</th>
                                                <th className="px-4 py-3 w-[20%]">Kelish narxi (Tannarx)</th>
                                                <th className="px-4 py-3 w-[15%]">Jami</th>
                                                <th className="px-4 py-3 w-[5%] text-center"><Trash2 size={16} className="mx-auto" /></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {formData.items.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50">
                                                    <td className="px-2 py-2">
                                                        <select required value={item.productId} onChange={(e) => handleProductSelect(index, e)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 transition-all text-sm bg-white">
                                                            <option value="" disabled>-- Tanlang --</option>
                                                            <optgroup label="Tayyor Sotiladigan Mahsulotlar (Kola, Suv...)">
                                                                {allProducts.filter(p => p.productType === 'taom').map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </optgroup>
                                                            <optgroup label="Xomashyo">
                                                                {allProducts.filter(p => p.productType === 'xomashyo').map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </optgroup>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <div className="flex border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-500 transition-all">
                                                            <input required type="number" step="0.01" min="0" placeholder="0" value={item.quantity} onChange={e => handleItemChange(index, "quantity", e.target.value)} className="w-full px-3 py-2 outline-none text-sm font-bold bg-transparent" />
                                                            <select value={item.unit} onChange={e => handleItemChange(index, "unit", e.target.value)} className="px-2 py-2 bg-slate-50 outline-none text-xs font-medium text-slate-600 border-l border-slate-200">
                                                                <option value="dona">dona</option>
                                                                <option value="kg">kg</option>
                                                                <option value="litr">litr</option>
                                                                <option value="qop">qop</option>
                                                                <option value="blok">blok</option>
                                                                <option value="sht">sht</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input required type="number" min="0" placeholder="0" value={item.costPrice} onChange={e => handleItemChange(index, "costPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 transition-all text-sm" />
                                                    </td>
                                                    <td className="px-4 py-2 font-bold text-slate-800">
                                                        {(Number(item.quantity) * Number(item.costPrice) || 0).toLocaleString()} {formData.currency}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <button type="button" onClick={() => removeItemRow(index)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" disabled={formData.items.length <= 1}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <button type="button" onClick={addItemRow} className="mt-3 flex items-center gap-1.5 px-4 py-2 w-full justify-center bg-blue-50 text-blue-600 font-bold rounded-xl text-sm hover:bg-blue-100 transition-colors border border-dashed border-blue-200">
                                    <Plus size={16} strokeWidth={3} /> Yana mahsulot qo'shish
                                </button>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-sm font-black border border-amber-200 shadow-sm">
                                    <AlertTriangle size={18} /> Jami summa: {grandTotal.toLocaleString()} {formData.currency}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all border border-slate-200 bg-white">
                                        Bekor qilish
                                    </button>
                                    <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0">
                                        {isSaving ? <RotateCw size={18} className="animate-spin" /> : <Check size={18} />}
                                        Qabul qilish
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
