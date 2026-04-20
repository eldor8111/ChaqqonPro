"use client";

import { useState, useEffect, useMemo, useCallback, memo, createContext, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    UtensilsCrossed, Package, Bike, Users, Clock,
    Plus, Minus, Receipt, X, CreditCard, Banknote,
    QrCode, Search, CheckCircle, Check, Maximize2, Minimize2, RefreshCw,
    ShoppingBag, Lock, Phone, MapPin, User, CalendarCheck, Calendar,
    Wifi, Monitor, Moon, Sun, ChevronLeft
} from "lucide-react";
import { useStore, UbtTable } from "@/lib/store";
import { PhoneInput } from "@/components/ui/PhoneInput";

import AttendanceWidget from "@/components/AttendanceWidget";

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtSec = () => new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmtDate = () => new Date().toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });

// ─── i18n ───────────────────────────────────────────────────────────────────────
type Lang = "uz" | "ru";
const T: Record<string, Record<Lang, string>> = {
    search:         { uz: "Taom qidirish...",       ru: "Поиск блюд..." },
    all:            { uz: "Barchasi",                ru: "Все" },
    notFound:       { uz: "Taom topilmadi",          ru: "Блюдо не найдено" },
    total:          { uz: "Jami",                    ru: "Итого" },
    confirm:        { uz: "Tasdiqlash",              ru: "Подтвердить" },
    pay:            { uz: "To'lov qilish",           ru: "Оплатить" },
    cash:           { uz: "Naqd",                    ru: "Наличные" },
    card:           { uz: "Karta",                   ru: "Карта" },
    given:          { uz: "Berilgan pul",             ru: "Получено" },
    change:         { uz: "Qaytim",                  ru: "Сдача" },
    sending:        { uz: "Yuborilmoqda...",         ru: "Отправка..." },
    newOrder:       { uz: "Yangi zakaz",             ru: "Новый заказ" },
    pending:        { uz: "Kutilmoqda",              ru: "В ожидании" },
    done:           { uz: "Tayyor",                  ru: "Готово" },
    delivered:      { uz: "Yetkazildi",             ru: "Доставлено" },
    delivering:     { uz: "Yetkazilmoqda",          ru: "Доставляется" },
    orderItems:     { uz: "Buyurtma tarkibi",        ru: "Состав заказа" },
    nameLabel:      { uz: "Ismi",                   ru: "Имя" },
    phoneLabel:     { uz: "Telefon",                ru: "Телефон" },
    addrLabel:      { uz: "Manzil",                 ru: "Адрес" },
    noName:         { uz: "Mijoz ismi kiritilmagan", ru: "Имя не указано" },
    customer:       { uz: "Mijoz",                  ru: "Клиент" },
    cancel:         { uz: "Bekor",                  ru: "Отмена" },
    add:            { uz: "Qo'shish",               ru: "Добавить" },
    addMore:        { uz: "Taom qo'shish",          ru: "Добавить блюдо" },
    tablesLabel:    { uz: "Na stol",                ru: "На стол" },
    takeawayLabel:  { uz: "Olib ketish",            ru: "С собой" },
    deliveryLabel:  { uz: "Yetkazib berish",        ru: "Доставка" },
    reserveLabel:   { uz: "Bronlash",               ru: "Бронь" },
    noTables:       { uz: "Stollar topilmadi",      ru: "Столы не найдены" },
    noTablesHint:   { uz: "Admin panelda stol va joy qo'shing", ru: "Добавьте столы в панели администратора" },
    refresh:        { uz: "Yangilash",              ru: "Обновить" },
    free:           { uz: "Bo'sh",                  ru: "Свободен" },
    busy:           { uz: "Band",                   ru: "Занят" },
    bill:           { uz: "Hisob",                  ru: "Счёт" },
    comment:        { uz: "Kommentariya",           ru: "Комментарий" },
    tip:            { uz: "Tip",                    ru: "Чаевые" },
    receipt:        { uz: "Chek",                   ru: "Чек" },
    reservation:    { uz: "Bronlash",               ru: "Бронирование" },
    comingSoon:     { uz: "Tez orada qo'shiladi",  ru: "Скоро будет добавлено" },
    withService:    { uz: "Jami (10% xizmat bilan)", ru: "Итого (с 10% сервисным сбором)" },
    entering:       { uz: "Kirish yo'li",           ru: "Выходить" },
    qtyEnter:       { uz: "Miqdor kiriting...",     ru: "Введите количество..." },
    price:          { uz: "Narx",                   ru: "Цена" },
    orderConfirmed: { uz: "Zakaz qabul qilindi! ✅", ru: "Заказ принят! ✅" },
};
const t = (key: string, lang: Lang) => T[key]?.[lang] ?? T[key]?.uz ?? key;

// ─── Pos Settings Context ────────────────────────────────────────────────────────
interface PosCtx { lang: Lang; dark: boolean; }
const PosCtx = createContext<PosCtx>({ lang: "uz", dark: false });
const usePos = () => useContext(PosCtx);

// ─── Theme helpers ────────────────────────────────────────────────────────────────
const th = {
    bg:        (d: boolean) => d ? "bg-[#0a101d] text-slate-200" : "bg-slate-50 text-slate-800",
    card:      (d: boolean) => d ? "bg-[#111827]/90 backdrop-blur-md border border-white/5 shadow-xl shadow-black/20 text-white" : "bg-white border border-slate-200 shadow-sm text-slate-800",
    header:    (d: boolean) => d ? "bg-[#0a101d]/90 backdrop-blur-md border-white/5" : "bg-white/90 backdrop-blur-md border-slate-200 z-30",
    input:     (d: boolean) => d ? "bg-[#111827] text-white placeholder-slate-500 border border-white/5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" : "bg-white text-[#0078d7] placeholder-slate-400 border border-transparent focus:border-white focus:ring-2 focus:ring-white/50",
    sub:       (d: boolean) => d ? "text-slate-400" : "text-slate-500",
    tabInact:  (d: boolean) => d ? "bg-white/5 text-white hover:bg-white/10 font-bold border border-transparent" : "bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold shadow-sm",
    panel:     (d: boolean) => d ? "bg-[#0F172A]" : "bg-sky-50",
    row:       (d: boolean) => d ? "bg-white/5" : "bg-slate-50",
    border:    (d: boolean) => d ? "border-white/5 transition-colors" : "border-slate-200 transition-colors",
    label:     (d: boolean) => d ? "text-slate-200" : "text-slate-800 font-bold",
};

// ─── Kitchen Auto-Print Shared Function ─────────────────────────────────────────
const printKitchenReceipt = async (items: {item:any; qty:number}[], tableName: string) => {
    try {
        const printerGroups: Record<string, typeof items> = {};
        items.forEach(c => {
            const ip = (c.item as any).printerIp;
            if (ip) {
                if (!printerGroups[ip]) printerGroups[ip] = [];
                printerGroups[ip].push(c);
            }
        });
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        for (const [printerIp, pItems] of Object.entries(printerGroups)) {
            fetch("/api/ubt/print", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    printerIp, port: 9100, receiptType: "kitchen", tableName, time: timeStr,
                    items: pItems.filter((c: any) => c?.item).map((c: any) => ({ name: c.item.name, qty: c.qty, price: c.item.price, unit: c.item.unit })),
                    total: pItems.reduce((s, c) => s + c.item.price * c.qty, 0),
                }),
            }).catch(e => console.warn("[Kitchen Print]", printerIp, e));
        }
    } catch {}
};


// ─── Pay Modal ─────────────────────────────────────────────────────────────────
interface MenuItem { id: string; name: string; categoryId: string; price: number; inStock: boolean; image?: string | null; stock?: number; unit?: string; printerIp?: string | null; isSetMenu?: boolean; modifiers?: any[]; }
interface MenuCategory { id: string; name: string; }
interface CartItem { item: MenuItem; qty: number; selectedModifiers?: Record<string, any>; isSaboy?: boolean; shotId?: number; }

// ─── Multi-Shot (Split Bill) ──────────────────────────────────────────────────
interface Shot { id: number; label: string; cart: CartItem[]; isPaid: boolean; paymentMethod?: string; }
interface TableShotState { shots: Shot[]; activeShot: number; }

function PayModal({ total, onPay, onClose, loading, servicePct = 0 }: { total: number; onPay: (m: string, customerId?: string) => void; onClose: () => void; loading: boolean; servicePct?: number }) {
    const { lang, dark } = usePos();
    const [method, setMethod] = useState("cash");
    const [given, setGiven] = useState("");
    
    // Qarz states
    const [customers, setCustomers] = useState<any[]>([]);
    const [searchCust, setSearchCust] = useState("");
    const [selCustId, setSelCustId] = useState("");
    const [showAddCust, setShowAddCust] = useState(false);
    const [newCustName, setNewCustName] = useState("");
    const [newCustPhone, setNewCustPhone] = useState("");
    const [loadingCust, setLoadingCust] = useState(false);

    useEffect(() => {
        if (method === "qarz") {
            fetch("/api/customers").then(r => r.json()).then(d => setCustomers(d.customers || [])).catch(() => {});
        }
    }, [method]);

    const handleCreateCustomer = async () => {
        if (!newCustName) return;
        setLoadingCust(true);
        try {
            const r = await fetch("/api/customers", {
                method: "POST", headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ name: newCustName, phone: newCustPhone })
            });
            const d = await r.json();
            if (d.success) {
                setCustomers([{id: d.customer.id, name: newCustName, phone: newCustPhone}, ...customers]);
                setSelCustId(d.customer.id);
                setShowAddCust(false);
                setNewCustName("");
                setNewCustPhone("");
            }
        } finally { setLoadingCust(false); }
    };

    const grand = Math.round(total * (1 + servicePct / 100));
    const change = method === "cash" ? Math.max(0, Number(given.replace(/\s/g, "")) - grand) : 0;
    const canPay = !loading && (
        (method === "cash" && Number(given.replace(/\s/g, "")) >= grand) || 
        (method === "qarz" && selCustId !== "") ||
        (method !== "cash" && method !== "qarz")
    );
    
    // Combine standard, custom, and qarz
    const customMethods = (_menuCache?.paymentMethods || []).map((m: any) => ({
        id: m.name, label: m.name, icon: CreditCard
    }));

    const METHODS = [
        { id: "cash", label: "Naqd", icon: Banknote },
        ...customMethods,
        { id: "qarz", label: "Qarzga yopish", icon: Users }
    ];

    const QUICK = [50000, 100000, 200000, 500000];
    const filteredCust = customers.filter(c => c.name.toLowerCase().includes(searchCust.toLowerCase()) || (c.phone && c.phone.includes(searchCust)));

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${dark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                <div className="p-5 text-white" style={{ background: dark ? "linear-gradient(135deg, #065f46, #0f766e)" : "linear-gradient(135deg, #10b981, #0d9488)" }}>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2 font-bold text-lg"><Receipt size={20} /> To'lov</div>
                        <button onClick={onClose} disabled={loading} className="p-1.5 rounded-full hover:bg-white/20"><X size={20} /></button>
                    </div>
                    <div className="text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setGiven(String(grand))}>
                        <p className="text-emerald-100 text-sm mb-1">Jami ({servicePct > 0 ? `${servicePct}% xizmat` : 'xizmatsiz'})</p>
                        <p className="text-4xl font-black">{fmt(grand)} <span className="text-2xl text-emerald-200">so'm</span></p>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {METHODS.map((m, i) => (
                            <button key={i} onClick={() => setMethod(m.id)}
                                className={`flex flex-col items-center justify-center gap-2 py-3 px-1 rounded-xl border-2 font-semibold text-xs text-center transition-all ${method === m.id ? (dark ? "border-emerald-500 bg-emerald-900/40 text-emerald-400" : "border-emerald-500 bg-emerald-50 text-emerald-700") : (dark ? "border-slate-700 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-500" : "border-gray-200 text-gray-500 hover:border-emerald-500/30 hover:text-emerald-600")}`}>
                                <m.icon size={20} />{m.label}
                            </button>
                        ))}
                    </div>
                    
                    {method === "cash" && (
                        <div className="animate-fade-in">
                            <label className={`text-xs font-semibold mb-1.5 block ${dark ? "text-slate-400" : "text-gray-500"}`}>Berilgan pul</label>
                            <input type="number" value={given} onChange={e => setGiven(e.target.value)} placeholder="0" autoFocus
                                className={`w-full border-2 rounded-xl px-4 py-3 text-2xl font-bold text-right focus:outline-none transition-colors ${dark ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-600 focus:border-emerald-500" : "border-gray-200 text-gray-800 focus:border-emerald-400"}`} />
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {QUICK.map(q => <button key={q} onClick={() => setGiven(String(q))} className={`py-2 rounded-lg border text-xs font-bold transition-colors ${dark ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-emerald-900/40 hover:border-emerald-500 hover:text-emerald-400" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"}`}>{fmt(q)}</button>)}
                            </div>
                            {Number(given.replace(/\s/g, "")) > 0 && (
                                <div className={`mt-3 p-3 rounded-xl border text-center animate-slide-up ${dark ? "bg-emerald-900/30 border-emerald-800/50" : "bg-emerald-50 border-emerald-100"}`}>
                                    <p className={`text-xs ${dark ? "text-emerald-400" : "text-emerald-600"}`}>Qaytim</p>
                                    <p className={`text-2xl font-black ${dark ? "text-emerald-300" : "text-emerald-700"}`}>{fmt(change)} so'm</p>
                                </div>
                            )}
                        </div>
                    )}

                    {method === "qarz" && (
                        <div className="space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <label className={`text-xs font-semibold ${dark ? "text-slate-400" : "text-gray-500"}`}>Mijozni tanlang</label>
                                <button onClick={() => setShowAddCust(!showAddCust)} className={`text-xs font-bold flex items-center gap-1 hover:opacity-80 ${dark ? "text-emerald-400" : "text-emerald-600"}`}><Plus size={14}/> {showAddCust ? "Bekor qilish" : "Qo'shish"}</button>
                            </div>
                            
                            {showAddCust && (
                                <div className={`p-3 rounded-xl border space-y-2 mb-2 animate-slide-up ${dark ? "bg-slate-800 border-emerald-500/50" : "bg-gray-50 border-emerald-200"}`}>
                                    <input className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${dark ? "bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500" : "border-gray-300 focus:border-emerald-500"}`} placeholder="Mijoz ismi" value={newCustName} onChange={e => setNewCustName(e.target.value)} />
                                    <input className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${dark ? "bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500" : "border-gray-300 focus:border-emerald-500"}`} placeholder="Telefon (ixtiyoriy)" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} />
                                    <button onClick={handleCreateCustomer} disabled={loadingCust} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors">{loadingCust ? "Saqlanmoqda..." : "Saqlash va Tanlash"}</button>
                                </div>
                            )}
                            
                            {!showAddCust && (
                                <>
                                    <input type="text" placeholder="Ism yoki raqam..." className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${dark ? "bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-emerald-500" : "border-gray-200 text-gray-800 focus:border-emerald-400"}`} value={searchCust} onChange={e => setSearchCust(e.target.value)} />
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                        {filteredCust.length === 0 ? <p className={`text-xs text-center py-4 ${dark ? "text-slate-500" : "text-gray-400"}`}>Mijoz topilmadi</p> : filteredCust.map(c => (
                                            <div key={c.id} onClick={() => setSelCustId(c.id)} className={`p-2 rounded-lg border cursor-pointer transition-colors ${selCustId === c.id ? (dark ? 'border-emerald-500 bg-emerald-900/40' : 'border-emerald-500 bg-emerald-50') : (dark ? 'border-slate-700 hover:border-emerald-500/50' : 'border-gray-100 hover:border-emerald-500/30')}`}>
                                                <p className={`text-sm font-bold ${dark ? "text-slate-200" : "text-gray-800"}`}>{c.name}</p>
                                                <p className={`text-xs font-mono ${dark ? "text-slate-500" : "text-gray-500"}`}>{c.phone || "Telefon no'm. kiritilmagan"}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <button onClick={() => onPay(method, method === "qarz" ? selCustId : undefined)} disabled={!canPay}
                        className={`w-full py-4 rounded-xl text-white font-black text-lg shadow-lg disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${dark ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-900/50" : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200"}`}>
                        {loading ? <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><CheckCircle size={22} /> Tasdiqlash</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

const isWeightUnit = (unit?: string) => {
    if (!unit) return false;
    const u = unit.toLowerCase();
    return u.includes('kg') || u.includes('gr') || u.includes('g') || u.includes('litr') || u.includes('l') || u.includes('кг') || u.includes('гр');
};

// ─── Menu cache (module-level, survives tab switches, 90-sec TTL) ────────────────
let _menuCache: { items: MenuItem[]; cats: MenuCategory[]; cancelCode?: string; paymentMethods?: any[] } | null = null;
let _menuCacheAt = 0;
const MENU_CACHE_TTL = 15 * 1000; // 15 sekund — admin o'zgartirsa darhol aks etadi

// ─── Menu Panel ─────────────────────────────────────────────────────────────────
function MenuPanel({ onConfirm, onPay, kassirPrinterIp, instantAdd, servicePct = 0, tableName = "Buyurtma" }: {
    onConfirm: (cart: CartItem[]) => Promise<void>;
    onPay: (cart: CartItem[], method: string, customerId?: string) => Promise<void>;
    kassirPrinterIp?: string;
    instantAdd?: boolean;
    servicePct?: number;
    tableName?: string;
}) {
    const { lang, dark } = usePos();
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [cats, setCats_] = useState<MenuCategory[]>([]);
    const [cat, setCat] = useState("Barchasi");
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showPay, setShowPay] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const catMap = useMemo(() => Object.fromEntries(cats.map(k => [k.id, k.name])), [cats]);
    const catList = useMemo(() => ["Barchasi", ...cats.map(k => k.name)], [cats]);
    const filtered = useMemo(() => {
        let items = cat === "Barchasi" ? menu : menu.filter(m => catMap[m.categoryId] === cat);
        if (search) items = items.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
        return items;
    }, [menu, cat, search, catMap]);
    useEffect(() => {
        const now = Date.now();
        if (_menuCache && (now - _menuCacheAt) < MENU_CACHE_TTL) {
            setMenu(_menuCache.items); setCats_(_menuCache.cats); return;
        }
        fetch("/api/ubt/menu").then(r => r.json()).then(d => {
            const items = d.items ?? []; const cats = d.categories ?? [];
            _menuCache = { items, cats, cancelCode: d.cancelCode || "", paymentMethods: d.paymentMethods || [] };
            _menuCacheAt = Date.now();
            setMenu(items); setCats_(cats);
        }).catch(() => {});
    }, []);
    const [qtyPop, setQtyPop] = useState<{ item: MenuItem; qty: string } | null>(null);
    const [modPop, setModPop] = useState<{ item: MenuItem; selected: Record<string, { id: string, name: string }[]> } | null>(null);

    const confirmModPop = () => {
        if (!modPop) return;
        
        // All modifier groups are required — each must have at least 1 item
        for (const m of (modPop.item.modifiers as any[])) {
            if (!modPop.selected[m.id] || (modPop.selected[m.id] as any[]).length === 0) {
                alert(`"${m.name}" guruhidan kamida bitta taom tanlang!`);
                return;
            }
        }

        let modAppendix = "";
        const sortedModIds = Object.keys(modPop.selected).sort();
        sortedModIds.forEach(id => {
            const selList = modPop.selected[id] as any[];
            if (selList && selList.length > 0) modAppendix += ` | ${selList.map((x: any) => x.name).join(", ")}`;
        });

        let hash = 0;
        for (let i = 0; i < modAppendix.length; i++) hash = Math.imul(31, hash) + modAppendix.charCodeAt(i) | 0;
        
        const newItem = {
            ...modPop.item,
            id: `${modPop.item.id}-set-${hash}`,
            name: modPop.item.name + modAppendix,
        };

        if (instantAdd) {
            onConfirm([{ item: newItem, qty: 1 }]).catch(() => {});
        } else {
            setCart(prev => {
                const idx = prev.findIndex(c => c.item.id === newItem.id);
                if (idx >= 0) {
                    const n = [...prev]; n[idx] = { ...n[idx], qty: n[idx].qty + 1 }; return n;
                }
                return [...prev, { item: newItem, qty: 1 }];
            });
        }
        setModPop(null);
    };

    const addItem = (item: MenuItem) => {
        if (item.isSetMenu && item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
            // Admin panel saves modifiers as [{id, name, items:[{id,name}]}]
            // multi-select: each group maps to an array of selected items
            const defaultSelections: Record<string, { id: string, name: string }[]> = {};
            (item.modifiers as any[]).forEach((m: any) => {
                defaultSelections[m.id] = []; // start empty, user must pick
            });
            setModPop({ item, selected: defaultSelections });
            return;
        }

        if (isWeightUnit(item.unit)) {
            setQtyPop({ item, qty: "" });
            return;
        }
        if (instantAdd) {
            onConfirm([{ item, qty: 1 }]).catch(() => {});
            return;
        }
        setCart(prev => { const idx = prev.findIndex(c => c.item.id === item.id); if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], qty: n[idx].qty + 1 }; return n; } return [...prev, { item, qty: 1 }]; });
    };
    const addWithQty = (item: MenuItem, qty: number) => {
        if (qty <= 0) return;
        if (instantAdd) {
            onConfirm([{ item, qty }]).catch(() => {});
            return;
        }
        setCart(prev => { const idx = prev.findIndex(c => c.item.id === item.id); if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], qty: n[idx].qty + qty }; return n; } return [...prev, { item, qty }]; });
    };
    const [cancelPrompt, setCancelPrompt] = useState<{ action: () => void } | null>(null);
    const [cancelInput, setCancelInput] = useState("");
    const [cancelError, setCancelError] = useState("");

    const requireCancelCode = (action: () => void) => {
        const adminCode = _menuCache?.cancelCode;
        if (!adminCode) {
            action();
            return;
        }
        setCancelInput("");
        setCancelError("");
        setCancelPrompt({ action });
    };

    const changeQty = (id: string, d: number) => {
        if (d < 0) {
            requireCancelCode(() => setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, parseFloat(((c.qty + d)).toFixed(3))) } : c).filter(c => c.qty > 0)));
        } else {
            setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, parseFloat(((c.qty + d)).toFixed(3))) } : c).filter(c => c.qty > 0));
        }
    };
    const setQtyDirect = (id: string, val: string) => {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) return;
        const currentItem = cart.find(c => c.item.id === id);
        if (currentItem && num < currentItem.qty) {
            requireCancelCode(() => setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: num } : c)));
        } else {
            setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: num } : c));
        }
    };
    const total = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
    const cCount = cart.reduce((s, c) => s + c.qty, 0);

    // Tasdiqlash — submit order, cart stays (client can order more)
    const handleConfirm = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        // 🖨️ AUTO-PRINT KITCHEN RECEIPT
        await printKitchenReceipt(cart, tableName);

        await onConfirm(cart);
        setCart([]);          // ← eski itemlarni tozalash, modal ochiq qoladi
        setConfirmed(true);
        setLoading(false);
        setTimeout(() => setConfirmed(false), 2000);
    };

    // To'lov — final payment, clears cart + prints customer receipt
    const handlePay = async (method: string, customerId?: string) => {
        setLoading(true);

        await onPay(cart, method, customerId);

        // 🖨️ MIJOZ CHEKI — print to kassir/manablog/ofitsiant's printer
        if (kassirPrinterIp) {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            fetch("/api/ubt/print", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    printerIp: kassirPrinterIp,
                    port: 9100,
                    receiptType: "client",
                    tableName: "Mijoz cheki",
                    time: timeStr,
                    paymentMethod: method,
                    items: cart.filter((c: any) => c?.item).map((c: any) => ({ name: c.item.name, qty: c.qty, price: c.item.price, unit: c.item.unit })),
                    total: cart.reduce((s, c) => s + c.item.price * c.qty, 0),
                    serviceFee: servicePct
                }),
            }).catch(e => console.warn("[CustomReceipt]", e));
        }

        setCart([]);
        setShowPay(false);
        setLoading(false);
    };

    return (
        <div className={`h-full flex flex-col ${th.panel(dark)}`}>
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
                <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search", lang)}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none ${th.input(dark)}`} />
                </div>
            </div>
            <div className="flex gap-2 px-3 pb-2 overflow-x-auto scrollbar-none flex-shrink-0">
                {catList.map(c => <button key={c} onClick={() => setCat(c)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${cat === c ? "bg-sky-500 text-white" : th.tabInact(dark)}`}>{c === "Barchasi" ? t("all", lang) : c}</button>)}
            </div>
            <div className={`flex-1 overflow-y-auto px-3 pb-2 custom-scrollbar ${th.panel(dark)}`}>
                {filtered.length === 0 ? <div className={`py-8 text-center text-sm font-bold ${th.sub(dark)}`}>{t("notFound", lang)}</div> : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-1">
                        {filtered.map(item => {
                            if (!item) return null;
                            const inCart = cart.find(c => c?.item?.id === item.id);
                            const dimmed = !item.inStock;
                            const isWt = isWeightUnit(item.unit);
                            return (
                                <button key={item.id} onClick={() => addItem(item)}
                                    className={`relative flex flex-col rounded-xl text-left transition-all active:scale-[0.97] overflow-hidden border shadow-sm
                                        ${dark ? "bg-slate-800 border-slate-700 hover:border-slate-500" : "bg-white border-slate-200 hover:border-sky-300 hover:shadow-md"}
                                        ${inCart ? "border-sky-500 ring-1 ring-sky-500" : ""}
                                        ${dimmed ? "opacity-50 grayscale" : ""}`}>
                                    {/* Image area */}
                                    <div className="w-full h-24 overflow-hidden shrink-0 relative">
                                        {item.image ? (
                                            <>
                                                <img src={item.image} alt={item.name}
                                                    className="w-full h-full object-cover object-center" />
                                                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/65 to-transparent pointer-events-none" />
                                                <span className="absolute bottom-1.5 left-1.5 bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                                                    {fmt(item.price)}
                                                </span>
                                            </>
                                        ) : (
                                            <div className={`w-full h-full flex flex-col items-center justify-center gap-1 ${dark ? "bg-slate-700" : "bg-slate-50"}`}>
                                                <UtensilsCrossed size={22} className={dark ? "text-slate-500" : "text-slate-300"} />
                                            </div>
                                        )}
                                    </div>
                                    {/* Text area */}
                                    <div className={`px-2 py-1.5 flex-1 min-w-0 ${dark ? "bg-slate-800" : "bg-white"}`}>
                                        <p className={`font-bold text-[11px] leading-tight line-clamp-2 ${dark ? "text-slate-200" : "text-slate-800"}`}>{item.name}</p>
                                        {!item.image && (
                                            <p className={`text-[11px] font-black mt-0.5 ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(item.price)}<span className="text-[9px] text-slate-400 font-semibold ml-0.5">UZS</span></p>
                                        )}
                                        {isWt && <span className="text-orange-500 text-[9px] font-bold uppercase">{item.unit}</span>}
                                    </div>
                                    {/* Qty badge */}
                                    {inCart && (
                                        <div className="absolute top-1.5 right-1.5 min-w-[20px] h-5 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center px-1 shadow">
                                            {inCart.qty}×
                                        </div>
                                    )}
                                    {isWt && <span className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">{item.unit}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            {cart.length > 0 && !instantAdd && (
                <div className={`border-t shrink-0 ${th.border(dark)} ${th.panel(dark)}`}>
                    <div className="px-3 py-2 max-h-36 overflow-y-auto">
                        {cart.map(c => {
                            if (!c?.item) return null;
                            const isWt = isWeightUnit(c.item.unit);
                            return (
                            <div key={c.item.id} className="flex items-center gap-2 py-1.5">
                                <p className={`flex-1 text-sm font-semibold truncate ${th.label(dark)}`}>{c.item.name}</p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => changeQty(c.item.id, isWt ? -0.1 : -1)} className={`w-6 h-6 rounded-full flex items-center justify-center hover:text-red-600 ${dark ? "bg-gray-600 text-gray-300 hover:bg-red-900" : "bg-gray-100 text-gray-600 hover:bg-red-100"}`}><Minus size={12} /></button>
                                    {isWt ? (
                                        <input type="number" step="0.1" min="0.01"
                                            value={c.qty}
                                            onChange={e => setQtyDirect(c.item.id, e.target.value)}
                                            className={`w-14 text-center text-sm font-black rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-400 ${dark ? "text-gray-100 bg-gray-600" : "text-gray-800 bg-gray-100"}`} />
                                    ) : (
                                        <span className={`w-5 text-center text-sm font-black ${dark ? "text-gray-100" : "text-gray-800"}`}>{c.qty}</span>
                                    )}
                                    <button onClick={() => changeQty(c.item.id, isWt ? 0.1 : 1)} className={`w-6 h-6 rounded-full flex items-center justify-center ${dark ? "bg-gray-600 text-gray-300 hover:bg-emerald-800" : "bg-gray-100 hover:bg-emerald-100"}`}><Plus size={12} /></button>
                                </div>
                                <p className={`text-xs font-bold w-20 text-right ${th.sub(dark)}`}>{fmt(c.item.price * c.qty)}</p>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {showPay && <PayModal total={total} onPay={handlePay} onClose={() => setShowPay(false)} loading={loading} servicePct={servicePct} />}

            {/* Weight/Qty Popup */}
            {qtyPop && (
                <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setQtyPop(null)}>
                    <div className="bg-white rounded-2xl p-5 w-64 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <p className="font-black text-gray-800 text-base mb-1">{qtyPop.item.name}</p>
                        <p className="text-xs text-gray-400 mb-3">{qtyPop.item.unit} bo&apos;yicha miqdor kiriting</p>
                        <div className="flex gap-2 mb-3">
                            {[0.25, 0.5, 1, 2].map(v => (
                                <button key={v} onClick={() => setQtyPop(p => p ? { ...p, qty: String(v) } : p)}
                                    className={`flex-1 py-1.5 rounded-xl text-sm font-bold border transition
                                        ${qtyPop.qty === String(v) ? "bg-sky-500 text-white border-sky-500" : `border-gray-200 hover:border-sky-300 ${th.tabInact(dark)}`}`}>
                                    {v}
                                </button>
                            ))}
                        </div>
                        <input type="number" step="0.01" min="0.01" placeholder={t("qtyEnter", lang)}
                            value={qtyPop.qty}
                            onChange={e => setQtyPop(p => p ? { ...p, qty: e.target.value } : p)}
                            className="w-full text-center text-xl font-black text-gray-800 border-2 border-gray-200 focus:border-sky-400 rounded-xl py-2 focus:outline-none mb-3" />
                        <p className="text-center text-xs text-gray-400 mb-3">
                            {t("price", lang)}: {fmt(qtyPop.item.price)} × {qtyPop.qty || 0} = <span className="font-black text-gray-700">{fmt(qtyPop.item.price * (parseFloat(qtyPop.qty) || 0))}</span> so&apos;m
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setQtyPop(null)} className={`flex-1 py-2 rounded-xl font-bold text-sm ${th.tabInact(dark)}`}>{t("cancel", lang)}</button>
                            <button onClick={() => { addWithQty(qtyPop.item, parseFloat(qtyPop.qty) || 0); setQtyPop(null); }}
                                disabled={!parseFloat(qtyPop.qty) || parseFloat(qtyPop.qty) <= 0}
                                className="flex-1 py-2 rounded-xl bg-sky-500 text-white font-bold text-sm disabled:opacity-40">
                                {t("add", lang)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Menu Modifier Popup */}
            {modPop && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setModPop(null)}>
                    <div className="rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                        style={{ background: dark ? '#0f172a' : '#ffffff', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}
                        onClick={e => e.stopPropagation()}>

                        {/* Header — dark blue gradient */}
                        <div className="px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg,#1e40af,#0ea5e9)' }}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-black text-lg leading-tight text-white">{modPop.item.name}</p>
                                    <p className="text-xs mt-0.5 text-blue-100">Set tarkibidan taomlarni belgilang</p>
                                </div>
                                <button onClick={() => setModPop(null)}
                                    className="w-8 h-8 shrink-0 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
                                    <X size={16}/>
                                </button>
                            </div>
                        </div>

                        {/* Groups */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">
                            {(modPop.item.modifiers as any[])?.map((m: any) => {
                                const selList = (modPop.selected[m.id] as any[]) || [];
                                return (
                                    <div key={m.id}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                                                {m.name} <span className="text-red-500">*</span>
                                            </p>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                selList.length > 0
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}>{selList.length} tanlandi</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {m.items?.map((v: any) => {
                                                const isSelected = selList.some((x: any) => x.id === v.id);
                                                return (
                                                    <button key={v.id}
                                                        onClick={() => {
                                                            const cur = (modPop.selected[m.id] as any[]) || [];
                                                            const alreadyIn = cur.some((x: any) => x.id === v.id);
                                                            const next = alreadyIn ? cur.filter((x: any) => x.id !== v.id) : [...cur, v];
                                                            setModPop({ ...modPop, selected: { ...modPop.selected, [m.id]: next } });
                                                        }}
                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                                                            isSelected
                                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                                : (dark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300')
                                                        }`}>
                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                                            isSelected ? 'border-white bg-white/30' : (dark ? 'border-slate-500' : 'border-slate-300')
                                                        }`}>
                                                            {isSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                                                        </div>
                                                        <span className={`text-[12px] font-semibold leading-tight ${isSelected ? 'text-white' : ''}`}>{v.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className={`shrink-0 px-5 py-4 border-t flex gap-3 ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <button onClick={() => setModPop(null)}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm border transition ${
                                    dark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}>
                                Bekor
                            </button>
                            <button onClick={confirmModPop}
                                disabled={(modPop.item.modifiers as any[])?.some(m => ((modPop.selected[m.id] as any[]) || []).length === 0)}
                                className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg,#1e40af,#0ea5e9)' }}>
                                Qo&apos;shish
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// ─── Table Card ─────────────────────────────────────────────────────────────────
const TableCard = memo(function TableCard({ table, isSelected, onClick, upcomingRes, onCancelRes }: { table: UbtTable; isSelected: boolean; onClick: () => void; upcomingRes?: any; onCancelRes?: (id: string) => void }) {
    const { lang, dark } = usePos();
    const isFree     = table.status === "free";
    const isOccupied = table.status === "occupied";
    const isReceipt  = table.status === "receipt";
    const isColored  = isOccupied || isReceipt;
    const tableNum   = table.name?.replace(/[^0-9]/g, "") || table.name;

    const cardBg = isReceipt  ? "bg-emerald-500 text-slate-900"
                 : isOccupied ? "bg-orange-400 text-slate-900"
                 : table.status === "reserved" ? "bg-fuchsia-500 text-slate-900"
                 : dark ? "bg-[#111827] text-white" : "bg-white text-slate-800";

    const cardBorder = isSelected
        ? "border-blue-500 ring-2 ring-blue-500 border-transparent"
        : isColored ? "border-transparent" : dark ? "border-white/10" : "border-slate-200";

    return (
        <button onClick={onClick}
            className={`relative flex flex-col p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md active:scale-[0.99] min-h-[140px] text-left overflow-hidden group
                ${cardBg} ${cardBorder}`}>

            {/* Row 1: Number + status dot */}
            <div className="flex items-start justify-between mb-1 relative z-10">
                <span className={`font-bold text-3xl leading-none tabular-nums tracking-tighter ${isColored ? "text-slate-900" : (dark ? "text-white" : "")}`}>
                    {tableNum}
                </span>
                <span className={`w-3 h-3 rounded-full mt-2 shrink-0
                    ${isColored ? "bg-slate-900/40" 
                    : "bg-slate-300"}`} />
            </div>

            {/* Zone */}
            {table.zone && (
                <p className={`text-[11px] font-semibold truncate leading-none relative z-10 ${isColored ? "text-slate-900/70" : (dark ? "text-slate-300" : "text-slate-500")}`}>
                    {table.zone.toUpperCase()}
                </p>
            )}

            {/* Upcoming Reservation Badge */}
            {upcomingRes && (
                <div className="absolute top-2 right-2 flex flex-col items-end z-20 gap-1 pointer-events-auto cursor-pointer hover:scale-105 transition-transform"
                    onClick={(e) => { e.stopPropagation(); onCancelRes?.(upcomingRes.id); }}
                    title="Bronni yopish/bekor qilish">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-fuchsia-600 text-white shadow-xl border border-fuchsia-400">
                        {new Date(upcomingRes.reservationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] uppercase font-bold bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-white truncate shadow-sm max-w-[80px]">
                        {upcomingRes.customerName}
                    </span>
                    {upcomingRes.advance > 0 && (
                        <span className="text-[9px] font-bold text-fuchsia-200 bg-black/50 px-1 rounded truncate max-w-[80px]">Avans: {fmt(upcomingRes.advance)}</span>
                    )}
                </div>
            )}

            <div className="flex-1" />

            {/* Amount */}
            {table.amount > 0 && (
                <p className={`text-base font-bold tabular-nums mb-2 relative z-10 tracking-tight ${isColored ? "text-slate-900" : "text-emerald-600"}`}>
                    {fmt(table.amount)} <span className={`text-[10px] uppercase font-semibold tracking-widest ${isColored ? "text-slate-900/70" : "text-emerald-600/70"}`}>UZS</span>
                </p>
            )}

            {/* Bottom: status badge + time */}
            <div className="flex items-center justify-between gap-1 w-full relative z-10">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md leading-none uppercase tracking-widest
                    ${isColored ? "bg-slate-900/10 text-slate-900" : dark ? "bg-[#1e293b] text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                    {isReceipt ? t("bill", lang) : isOccupied ? (table.waiter || t("busy", lang)) : table.status === "reserved" ? t("reservation", lang) : t("free", lang)}
                </span>
                {isOccupied && table.since && (
                    <span className="text-[10px] text-slate-900 font-bold bg-slate-900/10 px-2 py-1 rounded-md">
                        {new Date(table.since).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                )}
            </div>
            {isSelected && <span className="absolute inset-0 rounded-xl border-4 border-blue-500 pointer-events-none z-20" />}
        </button>
    );
});

// ─── Live Clock (isolated — only this re-renders every second) ───────────────────
function LiveClock({ className, style }: { className?: string; style?: React.CSSProperties }) {
    const [t, setT] = useState(fmtSec());
    useEffect(() => { const id = setInterval(() => setT(fmtSec()), 1000); return () => clearInterval(id); }, []);
    return <span className={className} style={style}>{t}</span>;
}

function ClockWidget({ dark }: { dark: boolean }) {
    return (
        <div className={`flex items-center gap-2 px-5 py-1.5 rounded-2xl ${dark ? "bg-white/5 border border-white/10" : "bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200"}`}>
            <Clock size={14} className={dark ? "text-sky-400" : "text-sky-500"} />
            <LiveClock className={`font-black text-lg tabular-nums ${dark ? "text-sky-300" : "text-sky-700"}`} style={{ letterSpacing: "0.12em" }} />
            <span className={`text-[10px] font-semibold ${dark ? "text-slate-400" : "text-sky-400"}`}>{fmtDate()}</span>
        </div>
    );
}

// ─── Modals Copied from Dashboard ──────────────────────────────────────────
function ReservationModal({ tables, onConfirm, onClose }: {
    tables: UbtTable[];
    onConfirm: (tableId: string, guestName: string, since: string, customerPhone: string, advance: string, notes: string) => void;
    onClose: () => void;
}) {
    const freeTables = tables.filter(tb => tb.status === "free");
    
    // Extract unique zones
    const zones = Array.from(new Set(freeTables.map(t => t.zone).filter(Boolean))) as string[];
    const [zone, setZone] = useState(""); // "" means 'Barchasi' (All)
    
    const filteredTables = zone ? freeTables.filter(t => t.zone === zone) : freeTables;
    const [tableId, setTableId] = useState(filteredTables[0]?.id ?? "");

    // Sync tableId when zone changes — only depend on zone, not filteredTables (new ref every render)
    useEffect(() => {
        const current = zone ? freeTables.filter(t => t.zone === zone) : freeTables;
        if (current.length > 0 && !current.find(t => t.id === tableId)) {
            setTableId(current[0].id);
        } else if (current.length === 0) {
            setTableId("");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zone]);

    const [guestName, setGuestName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [advance, setAdvance] = useState("");
    const [notes, setNotes] = useState("");
    const [since, setSince] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    });

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Calendar size={18} className="text-blue-400" />
                        </div>
                        <h2 className="font-bold text-white text-base">Bron qo'shish</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (tableId) { onConfirm(tableId, guestName, since, customerPhone, advance, notes); onClose(); } }} className="p-5 space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Joy nomi (Zal)</label>
                            <select value={zone} onChange={e => setZone(e.target.value)}
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                <option value="" className="text-slate-900">Barchasi</option>
                                {zones.map(z => <option key={z} value={z} className="text-slate-900">{z}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Stol tanlang</label>
                            <select value={tableId} onChange={e => setTableId(e.target.value)} required
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                                {filteredTables.length === 0 && <option value="" className="text-slate-900">Bo'sh stol yo'q</option>}
                                {filteredTables.map(tb => <option key={tb.id} value={tb.id} className="text-slate-900">{tb.name} ({tb.seats} kishi)</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Mehmon ismi</label>
                            <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} required placeholder="Ismni kiriting"
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-slate-500"
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Telefon raqami</label>
                            <PhoneInput value={customerPhone} onChange={val => setCustomerPhone(val)} 
                                className="w-full rounded-xl text-sm text-white focus-within:border-white/30"
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Avans (So'm)</label>
                            <input type="number" value={advance} onChange={e => setAdvance(e.target.value)} placeholder="Avans puli" min="0" step="1000"
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-slate-500"
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Bron vaqti (Sana va Soat)</label>
                            <input type="datetime-local" value={since} onChange={e => setSince(e.target.value)} required
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-text"
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", colorScheme: "dark" }} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Izoh / Kommentariya</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Deraza oldidan joy, chiroyli bezatilgan..."
                            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-slate-500"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 items-center justify-center rounded-xl text-slate-300 text-sm font-semibold hover:bg-white/10 transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.15)" }}>Bekor</button>
                        <button type="submit" disabled={!tableId || filteredTables.length === 0 || !guestName}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold shadow-lg disabled:opacity-40 flex items-center justify-center gap-2">
                            <Calendar size={14} /> Band qilish
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function TableActionModal({ table, onClose, onFree, onOccupy }: {
    table: UbtTable; onClose: () => void; onFree: () => void; onOccupy: () => void;
}) {
    const statusCfg: Record<string, { label: string; color: string }> = {
        free:     { label: "Bo'sh",  color: "bg-slate-500/30 text-slate-300" },
        occupied: { label: "Band",   color: "bg-emerald-500/20 text-emerald-400" },
        reserved: { label: "Bron",   color: "bg-amber-500/20 text-amber-400" },
        receipt:  { label: "Hisob",  color: "bg-blue-500/20 text-blue-400" },
    };
    const cfg = statusCfg[table.status] ?? statusCfg.free;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-white text-base">{table.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <Users size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-400">{table.seats} kishi</span>
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-3">
                    {table.status === "occupied" && (
                        <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <p className="text-xs text-emerald-400 font-semibold mb-1">{table.order}</p>
                            <p className="text-xl font-black text-white">{fmt(table.amount)} so'm</p>
                            {table.since && <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><Clock size={10} /> {table.since} dan beri</p>}
                        </div>
                    )}
                    {table.status === "reserved" && (
                        <div className="rounded-xl p-4" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                            {table.order && <p className="text-sm font-semibold text-amber-400 mb-1">Mehmon: {table.order}</p>}
                            <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} /> Bron: {table.since}</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        {table.status !== "free" && (
                            <button onClick={() => { onFree(); onClose(); }}
                                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-red-400 hover:text-white transition-all"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <X size={14} /> Bo'shatish
                            </button>
                        )}
                        {table.status === "reserved" && (
                            <button onClick={() => { onOccupy(); onClose(); }}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg">
                                <CheckCircle size={14} /> Tashrif buyurdi / Band qilish
                            </button>
                        )}
                        <button onClick={onClose}
                            className="w-full py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}>Yopish</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function UbtPosPage() {
    const router = useRouter();
    const store = useStore();
    const tables = store.ubtTables;
    const waiterName = store.kassirSession?.name ?? "Xodim";
    const hasPaymentPerm = (store.kassirSession as any)?.role === "Kassir" || store.kassirSession?.permissions?.includes("acceptCash") || store.kassirSession?.id === "admin";

    const [printerStatus, setPrinterStatus] = useState<{ id: string; name: string; online: boolean }[]>([]);
    const [tab, setTab] = useState<"tables" | "takeaway" | "delivery" | "reservation">("tables");
    const [zone, setZone] = useState("all");
    const [selTable, setSelTable] = useState<UbtTable | null>(null);
    const [activeShot, setActiveShot] = useState<number>(1);
    const [actionTable, setActionTable] = useState<UbtTable | null>(null);
    const [showReservation, setShowReservation] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);

    const fetchReservations = useCallback(async () => {
        const token = store.kassirSession?.token || store.deviceSession?.token;
        if (!token) return;
        try {
            const res = await fetch("/api/ubt/reservations", { headers: { "Authorization": `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setReservations(data.reservations || []);
            }
        } catch {}
    }, [store.deviceSession, store.kassirSession]);

    useEffect(() => {
        fetchReservations();
        const intv = setInterval(fetchReservations, 120000);
        return () => clearInterval(intv);
    }, [fetchReservations]);

    const handleCancelRes = useCallback((resId: string) => {
        if (!window.confirm("Tanlangan bronni bekor qilasizmi yoki yopasizmi? (Ekranda o'chadi)")) return;
        const token = store.kassirSession?.token || store.deviceSession?.token;
        if (!token) return;
        fetch("/api/ubt/reservations", {
            method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ id: resId, status: "completed" })
        }).then(fetchReservations);
    }, [store.deviceSession, store.kassirSession, fetchReservations]);

    const [lang, setLang] = useState<Lang>(() => (typeof window !== "undefined" ? (localStorage.getItem("pos_lang") as Lang) ?? "uz" : "uz"));
    const [dark, setDark] = useState(() => typeof window !== "undefined" ? localStorage.getItem("pos_dark") === "1" : false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleLang = () => { const nl = lang === "uz" ? "ru" : "uz"; setLang(nl); localStorage.setItem("pos_lang", nl); };
    const toggleDark = () => { const nd = !dark; setDark(nd); localStorage.setItem("pos_dark", nd ? "1" : "0"); };
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };


    // Takeaway/Delivery customer info
    const [custName, setCustName] = useState("");
    const [custPhone, setCustPhone] = useState("");
    const [custAddr, setCustAddr] = useState("");
    const [showDlClientModal, setShowDlClientModal] = useState(false);
    // Table order confirm state (for right panel Tasdiqlash button)
    const [tableConfirmed, setTableConfirmed] = useState(false);
    const [tableConfirming, setTableConfirming] = useState(false);

    const [cancelPrompt, setCancelPrompt] = useState<{ action: () => void } | null>(null);
    const [cancelInput, setCancelInput] = useState("");
    const [cancelError, setCancelError] = useState("");

    const requireCancelCode = (action: () => void) => {
        const adminCode = _menuCache?.cancelCode;
        if (!adminCode) {
            action();
            return;
        }
        setCancelInput("");
        setCancelError("");
        setCancelPrompt({ action });
    };

    const handleUpdateTableItem = async (c: any, delta: number) => {
        if (!selTable) return;
        const updateLocalAndDb = async () => {
            // Multi-shot: update active shot's cart; else update tableOrders
            const shotState = tableShotMap[selTable.id];
            const activeShotObj = shotState?.shots.find(s => s.id === shotState.activeShot);
            const currentOrders: any[] = activeShotObj ? activeShotObj.cart : (tableOrders[selTable.id] || []);

            let newQty = c.qty + delta;
            const isWt = c.item?.unit?.toLowerCase().match(/kg|gr|g|litr|l|кг|гр/);
            if (!isWt) { newQty = Math.max(0, Math.round(newQty)); }
            else { newQty = Math.max(0, parseFloat(newQty.toFixed(3))); }

            const cancelledQty = c.qty - newQty;

            let nextOrders = currentOrders.map((o: any) => 
                o.item.id === c.item.id && !!o.isSaboy === !!c.isSaboy && (o.shotId || 1) === activeShot
                    ? { ...o, qty: newQty, printedQty: Math.min(o.printedQty || 0, newQty) } 
                    : o
            );
            nextOrders = nextOrders.filter((o: any) => o.qty > 0);

            if (activeShotObj) {
                setTableShotMap(prev => ({
                    ...prev,
                    [selTable.id]: { ...prev[selTable.id], shots: prev[selTable.id].shots.map(s => s.id === shotState.activeShot ? { ...s, cart: nextOrders } : s) }
                }));
            } else {
                setTableOrders({ ...tableOrders, [selTable.id]: nextOrders });
            }
            const token = store.kassirSession?.token || store.deviceSession?.token;
            const hdrs: Record<string, string> = { "Content-Type": "application/json" };
            if (token) hdrs["Authorization"] = `Bearer ${token}`;
            
            await fetch("/api/ubt/orders-db", {
                method: "PUT", headers: hdrs,
                body: JSON.stringify({ tableId: selTable.id, items: nextOrders, waiterName: store.kassirSession?.name })
            }).catch(() => {});
            
            if (cancelledQty > 0) {
                fetch("/api/ubt/returns", {
                    method: "POST", headers: hdrs,
                    body: JSON.stringify({
                        productId: c.item.id,
                        productName: c.item.name,
                        quantity: cancelledQty,
                        unit: c.item.unit,
                        employee: store.kassirSession?.name || "Kassir"
                    })
                }).catch(() => {});
            }
            
            store.fetchUbtTables();
        };

        if (delta < 0) { requireCancelCode(updateLocalAndDb); } 
        else { updateLocalAndDb(); }
    };

    // ─── Order types ───────────────────────────────────────────────────────────
    type LocalOrder = { id: number; num: number; total: number; name: string; phone: string; addr?: string; time: string; status: "pending" | "done"; items: CartItem[]; };

    // ─── Takeaway orders — DB-backed (+ localStorage fallback during session) ──
    const [twOrders, setTwOrders] = useState<LocalOrder[]>([]);
    const [dlOrders, setDlOrders] = useState<LocalOrder[]>([]);
    const twCounterRef = useRef(1);

    // Sync twOrders to localStorage to prevent data loss on page refresh
    const [isTwLoaded, setIsTwLoaded] = useState(false);
    useEffect(() => {
        try {
            const saved = localStorage.getItem("ubt_pos_twOrders");
            if (saved) { setTwOrders(JSON.parse(saved)); }
        } catch (e) { console.error("Failed to load twOrders", e); }
        setIsTwLoaded(true);
    }, []);

    useEffect(() => {
        if (!isTwLoaded) return;
        localStorage.setItem("ubt_pos_twOrders", JSON.stringify(twOrders));
    }, [twOrders, isTwLoaded]);

    // saveTwOrders: POST paid takeaway order to DB (Transaction). Does NOT refresh local list —
    // local pending orders are managed in session state via setTwOrders directly.
    const saveTwOrders = async (cartItems: CartItem[], custName: string, custPhone: string, payMethod: string, customerId?: string) => {
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        const total = Math.round(cartItems.reduce((s, c) => s + c.item.price * c.qty, 0));
        try {
            await fetch("/api/ubt/takeaway", {
                method: "POST", headers: hdrs,
                body: JSON.stringify({
                    name: custName, phone: custPhone,
                    items: cartItems,
                    paymentMethod: payMethod,
                    customerId,
                    total,
                    waiterName: store.kassirSession?.name,
                }),
            });
        } catch {}
        // Local state is NOT refreshed from DB here — the caller removes the paid order
        // from twOrders directly so it disappears immediately without reappearing.
    };

    // saveDlOrders: POST to /api/ubt/yetkazish then update local state
    const saveDlOrders = async (cartItems: CartItem[], custName: string, custPhone: string, custAddr: string, payMethod: string, customerId?: string) => {
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        const total = Math.round(cartItems.reduce((s, c) => s + c.item.price * c.qty, 0));
        try {
            await fetch("/api/ubt/yetkazish", {
                method: "POST", headers: hdrs,
                body: JSON.stringify({
                    customerName: custName, customerPhone: custPhone, address: custAddr,
                    items: cartItems.filter((c: any) => c?.item).map((c: any) => ({ name: c.item.name, qty: c.qty, price: c.item.price })),
                    totalAmount: total,
                    paymentMethod: payMethod,
                    customerId,
                }),
            });
        } catch {}
        // Add to local state immediately (optimistic)
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        setDlOrders(prev => [{
            id: Date.now(), num: prev.length + 1, total,
            name: custName, phone: custPhone, addr: custAddr,
            time: timeStr, status: "pending" as const, items: cartItems,
        }, ...prev]);
    };

    const [selOrder, setSelOrder] = useState<LocalOrder | null>(null);
    const [payingOrder, setPayingOrder] = useState(false);
    const [addMoreOrder, setAddMoreOrder] = useState(false);
    const [showTwMenu, setShowTwMenu] = useState(false);
    const [showDlMenu, setShowDlMenu] = useState(false);
    const [newOrderCart, setNewOrderCart] = useState<CartItem[]>([]);
    const [newOrderPaying, setNewOrderPaying] = useState(false);
    const [tableView, setTableView] = useState<"order" | "menu">("order");
    const [showTablePay, setShowTablePay] = useState(false);
    const [tablePayLoading, setTablePayLoading] = useState(false);
    const [showPrinterPick, setShowPrinterPick] = useState(false);
    const [availablePrinters, setAvailablePrinters] = useState<{id:string;name:string;ipAddress:string}[]>([]);
    const [isSaboyMode, setIsSaboyMode] = useState(false);

    // ─── Table Transfer (Stol Almashtirish) state ─────────────────────────────
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferPwInput, setTransferPwInput] = useState("");
    const [transferPwError, setTransferPwError] = useState("");
    const [transferStep, setTransferStep] = useState<"auth" | "pick">("auth");

    useEffect(() => {
        if (!selTable) setIsSaboyMode(false);
    }, [selTable]);

    const handleReservation = async (tableId: string, guestName: string, since: string, customerPhone: string, advance: string, notes: string) => {
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        
        try {
            await fetch("/api/ubt/reservations", {
                method: "POST", headers: hdrs,
                body: JSON.stringify({ 
                    tableId, 
                    guestName,
                    customerPhone,
                    advance,
                    notes,
                    reservationTime: since 
                })
            });
            fetchReservations();
        } catch {}
    };

    // ─── handleTransferShot: active shotni boshqa stolga ko'chirish ─────────────
    const handleTransferShot = async (targetTable: UbtTable) => {
        if (!selTable) return;
        setTransferLoading(true);
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        const getHdrs: Record<string, string> = {};
        if (token) getHdrs["Authorization"] = `Bearer ${token}`;

        try {
            // ── 1. DB'dan eski stolning HAQIQIY ma'lumotlarini olish ──────────
            const freshRes = await fetch(`/api/ubt/orders-db?tableId=${selTable.id}`, { headers: getHdrs });
            if (!freshRes.ok) throw new Error("Eski stol ma'lumotlarini yuklab bo'lmadi");
            const freshData = await freshRes.json();
            const allOrders: any[] = Array.isArray(freshData.items) ? freshData.items : [];

            const shotItems = allOrders.filter((c: any) => (c.shotId || 1) === activeShot);
            const remainingItems = allOrders.filter((c: any) => (c.shotId || 1) !== activeShot);

            if (shotItems.length === 0) {
                alert("Bu shot bo'sh — ko'chiradigan zakaz yo'q");
                setTransferLoading(false);
                return;
            }

            // ── 2. Eski stoldan barcha cart yozuvlarini o'chirish ────────────
            const delRes = await fetch(`/api/ubt/orders-db?tableId=${selTable.id}`, { method: "DELETE", headers: hdrs });
            if (!delRes.ok) throw new Error("Eski stoldan o'chirishda xatolik");

            // ── 3. Agar eski stolda boshqa shotlar bo'lsa — ularni qayta saqlash
            if (remainingItems.length > 0) {
                const putRes = await fetch("/api/ubt/orders-db", {
                    method: "PUT", headers: hdrs,
                    body: JSON.stringify({ tableId: selTable.id, items: remainingItems, waiterName: store.kassirSession?.name })
                });
                if (!putRes.ok) throw new Error("Eski stol qolgan buyurtmalarini saqlashda xatolik");
            }

            // ── 4. Yangi stolning mavjud shotlarini aniqlash ─────────────────
            const targetRes = await fetch(`/api/ubt/orders-db?tableId=${targetTable.id}`, { headers: getHdrs });
            const targetData = targetRes.ok ? await targetRes.json() : { items: [] };
            const targetOrders: any[] = Array.isArray(targetData.items) ? targetData.items : [];
            const existingShots = Array.from(new Set(targetOrders.map((o: any) => o.shotId || 1))) as number[];
            const newShotId = existingShots.length > 0 ? Math.max(...existingShots) + 1 : 1;
            const transferredItems = shotItems.map((c: any) => ({ ...c, shotId: newShotId }));

            // ── 5. Yangi stolga ko'chirilgan shotni qo'shish ─────────────────
            const postRes = await fetch("/api/ubt/orders-db", {
                method: "POST", headers: hdrs,
                body: JSON.stringify({
                    tableId: targetTable.id,
                    items: transferredItems,
                    waiterName: store.kassirSession?.name,
                    replace: false,
                })
            });
            if (!postRes.ok) throw new Error("Yangi stolga saqlashda xatolik");

            // ── 6. Ikkala stolning local state'ni DB'dan qayta yuklash ────────
            const [oldRefresh, newRefresh] = await Promise.all([
                fetch(`/api/ubt/orders-db?tableId=${selTable.id}`, { headers: getHdrs }),
                fetch(`/api/ubt/orders-db?tableId=${targetTable.id}`, { headers: getHdrs }),
            ]);
            const oldItems = oldRefresh.ok ? ((await oldRefresh.json()).items || []) : [];
            const newItems = newRefresh.ok ? ((await newRefresh.json()).items || []) : [];

            setTableOrders(prev => ({
                ...prev,
                [selTable.id]: oldItems,
                [targetTable.id]: newItems,
            }));

            store.fetchUbtTables();
            setShowTransferModal(false);
            setSelTable(null);
            alert(`✅ ${activeShot}-Chek → "${targetTable.name}" stolga muvaffaqiyatli ko'chirildi!`);
        } catch (err: any) {
            console.error("[handleTransferShot]", err);
            alert(`Ko'chirishda xatolik: ${err?.message || "Qaytadan urinib ko'ring."}`);
        } finally {
            setTransferLoading(false);
        }
    };

    // ─── Table orders — DB-backed ─────────────────────────────────────────────
    const [tableOrders, setTableOrders] = useState<Record<string, { item: any; qty: number; unit?: string; shotId?: number; printedQty?: number; isSaboy?: boolean; }[]>>({});
    // ─── Multi-Shot (Split Bill) state ────────────────────────────────────────
    const [tableShotMap, setTableShotMap] = useState<Record<string, TableShotState>>({});

    // Fetch table orders from DB for a specific table
    const fetchTableOrdersFromDB = useCallback(async (tableId: string) => {
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = {};
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        try {
            const res = await fetch(`/api/ubt/orders-db?tableId=${tableId}`, { headers: hdrs });
            if (res.ok) {
                const data = await res.json();
                const items = Array.isArray(data.items) ? data.items : [];
                setTableOrders(prev => ({ ...prev, [tableId]: items }));
            }
        } catch {}
    }, [store.kassirSession, store.deviceSession]);

    const saveTableOrders = async (orders: Record<string, any[]>, tableId?: string, newItems?: any[]) => {
        // Sync to local state immediately
        setTableOrders(orders);
        // If new items posted for a tableId, persist to DB
        if (tableId && newItems && newItems.length > 0) {
            const token = store.kassirSession?.token || store.deviceSession?.token;
            const hdrs: Record<string, string> = { "Content-Type": "application/json" };
            if (token) hdrs["Authorization"] = `Bearer ${token}`;
            fetch("/api/ubt/orders-db", {
                method: "POST", headers: hdrs,
                body: JSON.stringify({
                    tableId,
                    items: newItems,
                    waiterName: store.kassirSession?.name,
                    replace: false,
                }),
            }).catch(() => {});
        }
    };

    // ─── Multi-Shot helpers ───────────────────────────────────────────────────
    const initShots = (tableId: string) => {
        setTableShotMap(prev => ({
            ...prev,
            [tableId]: { shots: [{ id: 1, label: "1-shot", cart: [], isPaid: false }], activeShot: 1 }
        }));
    };
    const addShot = (tableId: string) => {
        setTableShotMap(prev => {
            const ex = prev[tableId];
            if (!ex) return prev;
            if (ex.shots.length >= 8) { alert("Maksimal 8-shot"); return prev; }
            const newId = ex.shots.length + 1;
            return { ...prev, [tableId]: { shots: [...ex.shots, { id: newId, label: `${newId}-shot`, cart: [], isPaid: false }], activeShot: newId } };
        });
    };
    const removeShot = (tableId: string, shotId: number) => {
        setTableShotMap(prev => {
            const ex = prev[tableId];
            if (!ex || ex.shots.length <= 1) return prev;
            const shot = ex.shots.find(s => s.id === shotId);
            if (shot && shot.cart.length > 0 && !shot.isPaid) { alert("Avval taomlarni o'chiring yoki to'lovni amalga oshiring"); return prev; }
            const newShots = ex.shots.filter(s => s.id !== shotId);
            const newActive = ex.activeShot === shotId ? (newShots[newShots.length - 1]?.id ?? 1) : ex.activeShot;
            return { ...prev, [tableId]: { shots: newShots, activeShot: newActive } };
        });
    };
    const setActiveShotFn = (tableId: string, shotId: number) => {
        setTableShotMap(prev => prev[tableId] ? { ...prev, [tableId]: { ...prev[tableId], activeShot: shotId } } : prev);
    };
    const updateShotCart = (tableId: string, shotId: number, newCart: CartItem[]) => {
        setTableShotMap(prev => {
            if (!prev[tableId]) return prev;
            return { ...prev, [tableId]: { ...prev[tableId], shots: prev[tableId].shots.map(s => s.id === shotId ? { ...s, cart: newCart } : s) } };
        });
    };

    const fetchPrinterStatus = () => {
        fetch("/api/ubt/printers/ping").then(r => r.json()).then(data => {
            if (Array.isArray(data)) setPrinterStatus(data);
        }).catch(() => {});
    };

    // Role Reports State
    const [showOtchotModal, setShowOtchotModal] = useState(false);
    const [showZakazModal, setShowZakazModal] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);
    const [reportLoading, setReportLoading] = useState(false);

    const loadReportData = async () => {
        setReportLoading(true);
        try {
            const token = store.kassirSession?.token || store.deviceSession?.token;
            const res = await fetch("/api/transactions?limit=500", {
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                const txs = data.transactions || [];
                // Filter for today
                const today = new Date().toISOString().split("T")[0];
                const todaysTxs = txs.filter((t: any) => String(t.createdAt).startsWith(today));
                
                // Map API fields to UI format
                const formatted = todaysTxs.map((t: any) => {
                    let receiptNumber = "N/A";
                    let tableLabel = "";
                    const notes = t.notes || "";
                    if (notes.includes("Chek: ")) {
                        const parts = notes.split("Chek: ")[1]?.split(" - ");
                        if (parts) { receiptNumber = parts[0] || "N/A"; tableLabel = parts[1] || "Olib ketish"; }
                    } else if (notes.includes("Olib ketish: ")) {
                        receiptNumber = notes.split("Olib ketish: ")[1] || "N/A";
                        tableLabel = "Olib ketish";
                    } else if (notes.startsWith("UBT - ")) {
                        tableLabel = notes.replace("UBT - ", "");
                    }

                    return {
                        ...t,
                        totalAmount: t.amount,
                        paymentMethod: t.method,
                        waiter: t.kassirName,
                        receiptNumber,
                        tableLabel
                    };
                });
                setReportData(formatted);
            } else {
                const errTxt = await res.text();
                window.alert(`Xatolik: API javobi qoniqarsiz (Status: ${res.status}). ${errTxt}`);
            }
        } catch (e: any) {
            window.alert(`Tarmoq xatosi: ${e?.message}`);
            console.error("Report load check:", e);
        } finally { setReportLoading(false); }
    };

    const handleOpenOtchot = () => { console.log('Opening Otchot'); setShowOtchotModal(true); loadReportData(); };
    const handleOpenZakaz = () => { console.log('Opening Zakaz'); setShowZakazModal(true); loadReportData(); };

    const handlePrintOtchot = async () => {
        const printerIp = (store.kassirSession as any)?.printerIp || (store.deviceSession as any)?.printerIp;
        if (!printerIp) {
            window.alert("Siz uchun printer sozlanmagan! Admin paneldan 'Printer IP' kiriting.");
            return;
        }

        const jami = reportData.reduce((s:any, t:any) => s + (t.totalAmount||0), 0);
        const naqd = reportData.filter((t:any) => t.paymentMethod==="Naqd pul").reduce((s:any, t:any) => s + (t.totalAmount||0), 0);
        const plastik = reportData.filter((t:any) => t.paymentMethod==="Plastik karta").reduce((s:any, t:any) => s + (t.totalAmount||0), 0);

        try {
            const token = store.kassirSession?.token || store.deviceSession?.token;
            const res = await fetch("/api/ubt/print", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    printerIp,
                    receiptType: "report",
                    waiter: waiterName,
                    total: jami,
                    cashAmount: naqd,
                    cardAmount: plastik,
                    items: []
                })
            });
            if (!res.ok) throw new Error(await res.text());
            window.alert("✅ Hisobot printerga muvaffaqiyatli yuborildi!");
        } catch (e: any) {
            window.alert(`❌ Chop etish xatosi: ${e?.message}`);
        }
    };

    const fetchTwAndDlOrders = useCallback(async () => {
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;

        // Takeaway orders are managed entirely in local session state.
        // The DB stores completed Transactions, not pending orders — so we skip
        // the DB fetch for takeaway to avoid overwriting locally-added pending orders.

        try {
            const resDl = await fetch("/api/ubt/yetkazish", { headers: hdrs });
            if (resDl.ok) {
                const data = await resDl.json();
                // Normalize DB delivery items: DB stores [{name,qty,price}], display expects [{item,qty}]
                const normalizeItems = (raw: any[]): any[] => raw.map((it: any) =>
                    it?.item ? it : {
                        item: { id: it.name || "", name: it.name || "", price: Number(it.price) || 0, categoryId: "", inStock: true },
                        qty: Number(it.qty ?? it.quantity ?? 1),
                    }
                );
                // Faqat faol (yetkazilmagan) orderlarni ko'rsatish — delivered/cancelled skip
                const activeOrders = Array.isArray(data.orders)
                    ? data.orders.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled")
                    : [];
                setDlOrders(activeOrders.map((o: any, i: number) => ({
                    id: o.id || i + 1,
                    num: o.num || i + 1,
                    total: o.totalAmount ?? o.total ?? 0,
                    name: o.customerName ?? o.name ?? "",
                    phone: o.customerPhone ?? o.phone ?? "",
                    addr: o.address ?? o.addr ?? "",
                    time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : (o.time ?? ""),
                    status: "pending" as const,
                    items: normalizeItems(typeof o.items === "string" ? JSON.parse(o.items) : (o.items ?? [])),
                })));
            }
        } catch {}
    }, [store.kassirSession, store.deviceSession]);

    useEffect(() => {
        store.fetchUbtTables();
        fetchPrinterStatus();
        fetchTwAndDlOrders();
        const ti = setInterval(() => { store.fetchUbtTables(); fetchTwAndDlOrders(); }, 60000);
        const pi = setInterval(() => fetchPrinterStatus(), 60000);
        return () => { clearInterval(ti); clearInterval(pi); };
    }, [store, fetchTwAndDlOrders]);

    // Fullscreen state listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const logout = () => { store.kassirLogout(); router.replace("/kassa/login"); };

    // Load available printers for printer picker
    const loadAvailablePrinters = async () => {
        try {
            const res = await fetch("/api/ubt/printers");
            const data = await res.json();
            setAvailablePrinters(Array.isArray(data) ? data : []);
        } catch {}
    };

    const handleTablePayDirect = async (method: string, customerId?: string) => {
        if (!selTable) return;
        setTablePayLoading(true);
        const allOrders = tableOrders[selTable.id] || [];
        const activeOrders = allOrders.filter((c: any) => (c.shotId || 1) === activeShot);
        
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        
        const subtotal = activeOrders.reduce((s: number, c: any) => s + c.item.price * c.qty, 0);
        const svcPct = (selTable.serviceFee ?? 0) / 100;
        const grandTotal = Math.round(subtotal * (1 + svcPct));
        
        try {
            const payRes = await fetch("/api/ubt/pay", {
                method: "POST", headers: hdrs,
                body: JSON.stringify({
                    tableId: selTable.id,
                    items: activeOrders.filter((c: any) => c?.item).map((c: any) => ({ menuItemId: c.item.id, name: c.item.name, qty: c.qty, price: c.item.price })),
                    paymentMethod: method,
                    customerId,
                    total: subtotal,
                    waiterName: store.kassirSession?.name,
                    tableLabel: selTable.name,
                    serviceFee: svcPct,
                }),
            });
            if (!payRes.ok) {
                const errData = await payRes.json().catch(() => ({}));
                alert(errData.error || "To'lov amalga oshmadi. Qayta urinib ko'ring.");
                setTablePayLoading(false);
                return;
            }
        } catch (payErr) {
            console.error("[handleTablePayDirect]", payErr);
            alert("Server bilan bog'lanishda xatolik. Internet aloqasini tekshiring.");
            setTablePayLoading(false);
            return;
        }
        // ✅ To'lov muvaffaqiyatli — buyurtmalarni o'chirish va UI yangilash
        // 🗳️ Update cart orders in DB to only delete the paid shot
        const remainingOrders = allOrders.filter((c: any) => (c.shotId || 1) !== activeShot);
        if (remainingOrders.length === 0) {
            fetch(`/api/ubt/orders-db?tableId=${selTable.id}`, { method: "DELETE", headers: hdrs }).catch(() => {});
        } else {
            fetch("/api/ubt/orders-db", {
                method: "PUT", headers: hdrs,
                body: JSON.stringify({ tableId: selTable.id, items: remainingOrders, waiterName: store.kassirSession?.name })
            }).catch(() => {});
        }
        
        // Chek print
        const printerIp = store.kassirSession?.printerIp || "";
        if (printerIp && activeOrders.length > 0) {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            fetch("/api/ubt/print", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    printerIp, port: 9100,
                    receiptType: "client",
                    tableName: selTable.name,
                    tableZone: selTable.zone || "",
                    tableType: "Na stol",
                    waiter: store.kassirSession?.name || "",
                    time: timeStr,
                    orderNum: Math.floor(Math.random() * 9000) + 1000,
                    paymentMethod: method,
                    cashAmount: method === "Naqd" ? grandTotal : 0,
                    cardAmount: method === "Karta" ? grandTotal : 0,
                    items: activeOrders.filter((c: any) => c?.item).map((c: any) => ({ name: c.item.name, qty: c.qty, price: c.item.price, unit: c.item.unit })),
                    total: grandTotal,
                }),
            }).catch(() => {});
        }
        if (remainingOrders.length === 0) {
            const updated = { ...tableOrders }; delete updated[selTable.id];
            setTableOrders(updated);
            setSelTable(null);
            setActiveShot(1);
        } else {
            setTableOrders({ ...tableOrders, [selTable.id]: remainingOrders });
            setActiveShot(remainingOrders[0]?.shotId || 1);
        }
        setShowTablePay(false);
        setTablePayLoading(false);
        setSelTable(null);
        store.fetchUbtTables();
    };

    // ─── Multi-shot payment ───────────────────────────────────────────────────
    const handleShotPay = async (method: string, customerId?: string) => {
        if (!selTable) return;
        const shotState = tableShotMap[selTable.id];
        if (!shotState) { return handleTablePayDirect(method, customerId); }

        const activeShotObj = shotState.shots.find(s => s.id === shotState.activeShot);
        if (!activeShotObj || activeShotObj.cart.length === 0) { alert("Bu shot bo'sh — avval taom qo'shing"); return; }

        setTablePayLoading(true);
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        const subtotal = activeShotObj.cart.reduce((s: number, c: any) => s + c.item.price * c.qty, 0);
        const svcPct = (selTable.serviceFee ?? 0) / 100;
        const grandTotal = Math.round(subtotal * (1 + svcPct));

        try {
            const payRes = await fetch("/api/ubt/pay", {
                method: "POST", headers: hdrs,
                body: JSON.stringify({
                    tableId: selTable.id,
                    items: activeShotObj.cart.filter((c: any) => c?.item).map((c: any) => ({ menuItemId: c.item.id, name: c.item.name, qty: c.qty, price: c.item.price })),
                    paymentMethod: method,
                    customerId,
                    total: subtotal,
                    waiterName: store.kassirSession?.name,
                    tableLabel: `${selTable.name} / ${activeShotObj.label}`,
                    serviceFee: svcPct,
                }),
            });
            if (!payRes.ok) {
                const errData = await payRes.json().catch(() => ({}));
                alert(errData.error || "To'lov amalga oshmadi. Qayta urinib ko'ring.");
                setTablePayLoading(false);
                return;
            }
        } catch {
            alert("Server bilan bog'lanishda xatolik.");
            setTablePayLoading(false);
            return;
        }

        // Chek chop etish (faqat shu shot uchun)
        const printerIp = store.kassirSession?.printerIp || "";
        if (printerIp && activeShotObj.cart.length > 0) {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            fetch("/api/ubt/print", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    printerIp, port: 9100, receiptType: "client",
                    tableName: `${selTable.name} / ${activeShotObj.label}`,
                    tableZone: selTable.zone || "", tableType: "Na stol",
                    waiter: store.kassirSession?.name || "",
                    time: timeStr, orderNum: Math.floor(Math.random() * 9000) + 1000,
                    paymentMethod: method,
                    cashAmount: method === "Naqd" ? grandTotal : 0,
                    cardAmount: method === "Karta" ? grandTotal : 0,
                    items: activeShotObj.cart.filter((c: any) => c?.item).map((c: any) => ({ name: c.item.name, qty: c.qty, price: c.item.price, unit: c.item.unit })),
                    total: grandTotal,
                }),
            }).catch(() => {});
        }

        // Ushbu shotni paid deb belgilash
        const updatedShots = shotState.shots.map(s => s.id === activeShotObj.id ? { ...s, isPaid: true, paymentMethod: method } : s);
        const allPaid = updatedShots.every(s => s.isPaid);

        if (allPaid) {
            // Barcha shotlar to'langan — stolni bo'shatish
            fetch(`/api/ubt/orders-db?tableId=${selTable.id}`, { method: "DELETE", headers: hdrs }).catch(() => {});
            const updated = { ...tableOrders }; delete updated[selTable.id];
            setTableOrders(updated);
            const updatedMap = { ...tableShotMap }; delete updatedMap[selTable.id];
            setTableShotMap(updatedMap);
            setShowTablePay(false);
            setTablePayLoading(false);
            setSelTable(null);
            store.fetchUbtTables();
        } else {
            // Qolgan shotlar bor — birinchi to'lanmaganga o'tish
            const remainingCart = updatedShots.filter(s => !s.isPaid).flatMap(s => s.cart);
            await fetch("/api/ubt/orders-db", {
                method: "PUT", headers: hdrs,
                body: JSON.stringify({ tableId: selTable.id, items: remainingCart, waiterName: store.kassirSession?.name }),
            }).catch(() => {});
            setTableOrders(prev => ({ ...prev, [selTable.id]: remainingCart }));
            const firstUnpaid = updatedShots.find(s => !s.isPaid);
            setTableShotMap(prev => ({
                ...prev,
                [selTable.id]: { shots: updatedShots, activeShot: firstUnpaid?.id ?? updatedShots[0].id }
            }));
            setShowTablePay(false);
            setTablePayLoading(false);
            store.fetchUbtTables();
        }
    };

        // Chek chop etish (to'lov qilmasdan)
    const handlePrintReceipt = async (overrideIp?: string) => {
        if (!selTable) return;
        const allOrders = tableOrders[selTable.id] || [];
        const activeOrders = allOrders.filter((c: any) => (c.shotId || 1) === activeShot);
        if (activeOrders.length === 0) { alert("Chek bo'sh — avval taom qo'shing"); return; }
        const printerIp = overrideIp || store.kassirSession?.printerIp || "";
        if (!printerIp) {
            // printerIp yo'q — printer tanlash modal ochish
            setShowPrinterPick(true);
            return;
        }
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const total = activeOrders.reduce((s: number, c: any) => s + c.item.price * c.qty, 0);
        fetch("/api/ubt/print", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                printerIp, port: 9100,
                receiptType: "client",
                tableName: selTable.name,
                tableZone: selTable.zone || "",
                tableType: "Na stol",
                waiter: store.kassirSession?.name || "",
                time: timeStr,
                orderNum: Math.floor(Math.random() * 9000) + 1000,
                items: activeOrders.filter((c: any) => c?.item).map((c: any) => ({ name: c.item.name, qty: c.qty, price: c.item.price, unit: c.item.unit })),
                total,
            }),
        }).catch(() => {});
        
        // Update table status to receipt in DB (turns green)
        const token = store.kassirSession?.token || store.deviceSession?.token;
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        fetch("/api/ubt/tables", {
            method: "PUT", headers: hdrs,
            body: JSON.stringify({
                id: selTable.id,
                status: "receipt",
                amount: total
            })
        }).then(() => store.fetchUbtTables()).catch(() => {});
        
        setShowPrinterPick(false);
    };
    // Build zones list
    const zones = useMemo(() => Array.from(new Set(tables.map(t => t.zone).filter(Boolean))), [tables]);

    // Tables filtered by zone
    const visibleByZone = useMemo(() => {
        if (zone === "all") {
            // Group by zone
            const map: Record<string, UbtTable[]> = {};
            tables.forEach(t => {
                const z = t.zone || "Umumiy";
                if (!map[z]) map[z] = [];
                map[z].push(t);
            });
            return map;
        }
        return { [zone]: tables.filter(t => t.zone === zone) };
    }, [tables, zone]);

    const activeCnt = useMemo(() => tables.filter(t => t.status !== "free").length, [tables]);
    const zoneCnts = useMemo(() => {
        const c: Record<string, number> = {};
        tables.forEach(t => { const z = t.zone || "Umumiy"; c[z] = (c[z] || 0) + (t.status !== "free" ? 1 : 0); });
        return c;
    }, [tables]);

    const TABS = [
        { id: "tables",      icon: UtensilsCrossed, label: t("tablesLabel", lang),    count: activeCnt, color: "bg-sky-500" },
        { id: "takeaway",    icon: Package,          label: t("takeawayLabel", lang), count: twOrders.filter(o => o.status === "pending").length, color: "bg-blue-500" },
        { id: "delivery",    icon: Bike,             label: t("deliveryLabel", lang), count: dlOrders.filter(o => o.status === "pending").length, color: "bg-purple-500" },

    ] as const;

    return (
    <PosCtx.Provider value={{ lang, dark }}>
        <div className={`h-screen flex flex-col overflow-hidden select-none ${dark ? "dark" : ""} ${th.bg(dark)}`}>
            {cancelPrompt && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-[320px] max-w-full text-center animate-fade-in translate-y-0 relative">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">Bekor qilish paroli</h3>
                        <p className="text-xs text-slate-500 mb-4">Ushbu amalni bajarish uchun administrator parolini kiriting.</p>
                        
                        <input 
                            type="password" autoFocus placeholder="****"
                            className="w-full text-center text-xl font-bold tracking-widest py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-red-500 transition mb-2 bg-slate-50"
                            value={cancelInput}
                            onChange={e => setCancelInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    if (cancelInput === _menuCache?.cancelCode) { setCancelPrompt(null); cancelPrompt.action(); } 
                                    else { setCancelError("Parol noto'g'ri!"); }
                                }
                            }}
                        />
                        {cancelError && <p className="text-xs font-bold text-red-500 mb-4">{cancelError}</p>}
                        
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setCancelPrompt(null)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition">O&apos;tkazish</button>
                            <button 
                                onClick={() => {
                                    if (cancelInput === _menuCache?.cancelCode) { setCancelPrompt(null); cancelPrompt.action(); } 
                                    else { setCancelError("Parol noto'g'ri!"); }
                                }}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition"
                            >Tasdiqlash</button>
                        </div>
                    </div>
                </div>
            )}
            {showReservation && (
                <ReservationModal 
                    tables={tables} 
                    onConfirm={handleReservation} 
                    onClose={() => setShowReservation(false)} 
                />
            )}
            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <header className={`h-[56px] border-b flex items-center gap-3 px-4 shrink-0 shadow-sm z-30 ${th.header(dark)}`}>
                {/* Brand */}
                <div className="flex items-center shrink-0 mr-4 border-r border-slate-300/20 pr-5">
                    <span className="font-black text-[24px] tracking-tight text-slate-800">
                        Chaqqon<span className="text-blue-500">Pro</span>
                    </span>
                </div>

                {/* CENTER: Beautiful Digital Clock */}
                <div className="flex-1 flex items-center justify-center pointer-events-none">
                    <ClockWidget dark={dark} />
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={toggleLang} className={`px-2.5 py-1 rounded-full text-xs font-black border-2 transition-all ${lang === "uz" ? "bg-sky-500 text-white border-sky-500" : "bg-purple-600 text-white border-purple-600"}`}>
                        {lang === "uz" ? "OʻZ" : "RU"}
                    </button>
                    <button onClick={toggleDark} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${dark ? "bg-yellow-400 text-gray-900" : "bg-gray-700 text-white"}`}>
                        {dark ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <button onClick={() => window.location.reload()} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${dark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`} title="Tizimni yangilash"><RefreshCw size={15} /></button>
                    <button onClick={logout} className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: "#0ea5e9" }}><Lock size={15} /></button>
                    <div className="relative group z-50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer border ${dark ? "bg-gray-600 text-gray-200 border-gray-500" : "bg-gray-200 text-gray-700 border-gray-300"}`}>
                            {waiterName.charAt(0)}
                        </div>
                        {/* Wrapper for continuous hover hit-area (fixes the empty gap closing issue) */}
                        <div className="absolute top-full right-0 pt-2 w-80 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all origin-top-right transform scale-95 group-hover:scale-100 z-[110]">
                            <div className={`rounded-xl shadow-2xl border overflow-hidden ${dark ? "bg-gray-800 border-gray-700 shadow-black/50" : "bg-white border-gray-200 shadow-gray-200/50"}`}>
                                <div className="p-3">
                                    {/* Attendance Widget */}
                                    <div className="mb-3">
                                        <AttendanceWidget
                                            token={store.kassirSession?.token || null}
                                            staffId={store.kassirSession?.id}
                                            staffName={waiterName}
                                            lang={lang}
                                            dark={dark}
                                        />
                                    </div>

                                    {/* Menu Items */}
                                    <div className={`pt-3 border-t ${dark ? "border-gray-700" : "border-gray-200"}`}>
                                        {(((store.kassirSession as any)?.role === "Kassir" || store.kassirSession?.permissions?.includes("Kassir")) || store.kassirSession?.id === "admin") && (
                                            <button onClick={handleOpenOtchot} className={`w-full text-left px-4 py-3 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${dark ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}>
                                                <span>📊</span> KUNLIK OTCHOT
                                            </button>
                                        )}
                                        {(((store.kassirSession as any)?.role === "Ofitsiant" || store.kassirSession?.permissions?.includes("Ofitsiant")) || store.kassirSession?.id === "admin") && (
                                            <button onClick={handleOpenZakaz} className={`w-full text-left px-4 py-3 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${dark ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}>
                                                <span>🍽️</span> MENING ZAKAZLARIM
                                            </button>
                                        )}
                                        <button onClick={() => router.push("/ubt-pos/support")} className={`w-full text-left px-4 py-3 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${dark ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}>
                                            <span>🎧</span> TEX YORDAM
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={toggleFullscreen} className={`w-8 h-8 rounded-full flex items-center justify-center ${th.tabInact(dark)}`}>
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            </header>

            {/* ── BODY ────────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* ── LEFT SIDEBAR — Flat Corporate ── */}
                <aside className={`w-[84px] shrink-0 flex flex-col items-center gap-4 py-6 z-20 transition-colors duration-500 ${dark ? "bg-[#0a101d] border-r border-white/5" : "bg-white border-r border-slate-200"}`}>
                    {([
                        { id: "tables" as const,   icon: UtensilsCrossed, label: t("tablesLabel", lang),   bg: "text-[#0078d7]", count: activeCnt, badge: "bg-orange-500" },
                        { id: "takeaway" as const, icon: Package,          label: t("takeawayLabel", lang), bg: "text-[#0078d7]", count: twOrders.filter(o => o.status === "pending").length, badge: "bg-pink-500" },
                        { id: "delivery" as const, icon: Bike,             label: t("deliveryLabel", lang), bg: "text-[#0078d7]", count: dlOrders.filter(o => o.status === "pending").length, badge: "bg-red-500" },
                    ] as const).filter(item => {
                        const isOfitsiant = ((store.kassirSession as any)?.role === "Ofitsiant" || store.kassirSession?.permissions?.includes("Ofitsiant")) && store.kassirSession?.id !== "admin";
                        if (isOfitsiant) return item.id === "tables";
                        return true;
                    }).map(item => {
                        const active = tab === item.id;
                        return (
                            <button key={item.id} onClick={() => { setTab(item.id); setSelTable(null); setSelOrder(null); }}
                                title={item.label}
                                className={`relative flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl w-[64px] h-[64px] transition-all group shadow-sm
                                    ${active ? `bg-sky-500/10 backdrop-blur-md text-[#0078d7] dark:text-sky-400 ring-1 ring-sky-500/30` : `${dark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-400 hover:bg-slate-100/50 hover:text-slate-700"}`}`}>
                                <item.icon size={22} strokeWidth={active ? 3 : 2.5} className="transition-transform group-hover:scale-110" />
                                <span className="text-[10px] uppercase font-black leading-tight text-center tracking-widest">{item.label}</span>
                                {item.count > 0 && (
                                    <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${dark ? "ring-2 ring-slate-900" : "ring-2 ring-white"} ${item.badge}`}>
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </aside>


                {/* TABLE TAB — full-width grid, menu opens as overlay modal */}
                {tab === "tables" && (
                    <div className="relative flex-1 overflow-hidden">
                        {/* Tables grid — full width */}
                        <main className="h-full overflow-y-auto p-5">
                            {tables.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                                    <UtensilsCrossed size={48} className="text-gray-300" />
                                    <p className="font-bold text-gray-500">Stollar topilmadi</p>
                                    <p className="text-sm">Admin panelda stol va joy qo&apos;shing</p>
                                    <button onClick={() => store.fetchUbtTables()} className="mt-2 px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-sm flex items-center gap-2"><RefreshCw size={14} /> Yangilash</button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-end mb-6">
                                        <button onClick={() => setShowReservation(true)} className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center gap-2 transition-all">
                                            <Calendar size={18} /> Bron qo'shish
                                        </button>
                                    </div>
                                    {Object.entries(visibleByZone).map(([zoneName, zoneTables]) => (
                                    <div key={zoneName} className="mb-8">
                                        <h2 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${th.sub(dark)}`}>
                                            <span className={th.sub(dark)}>#</span> {zoneName}
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${th.tabInact(dark)}`}>{zoneTables.length} stol</span>
                                        </h2>
                                        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                                            {zoneTables.map(t => {
                                                const uRes = reservations.find(r => r.tableId === t.id && r.status === "confirmed");
                                                return (
                                                <TableCard key={t.id} table={t} isSelected={selTable?.id === t.id} upcomingRes={uRes} onCancelRes={handleCancelRes}
                                                    onClick={() => {
                                                        if (uRes) {
                                                            const resTime = new Date(uRes.reservationTime).getTime();
                                                            const diffMins = (resTime - Date.now()) / 60000;
                                                            if (diffMins <= 20) {
                                                                if (t.status === "free") {
                                                                    const timeStr = new Date(uRes.reservationTime).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
                                                                    const isOwner = window.confirm(`Bu stol bugun ${timeStr} da ${uRes.customerName} uchun band qilingan.\n\nFaqat haqiqiy buyurtma egalarigina o'tira oladi. Xoziroq mehmonga joy ko'rsatasizmi? (Tasdiqlasangiz stol band etiladi)`);
                                                                    if (!isOwner) return;
                                                                } else if (t.status === "occupied" || t.status === "receipt") {
                                                                    alert(`Diqqat! Ushbu stol ${new Date(uRes.reservationTime).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} da mijozga band qilingan.\n\nYangi qo'shimcha zakaz urish taqiqlanadi! Iltimos, hozirgi mehmonlarni tezda hisob-kitob qilib stolni kutayotgan mijozga bo'shatib bering.`);
                                                                    // Do NOT return here! The cashier MUST be able to open the table to checkout the guests!
                                                                    // Allowing them to proceed to the cart:
                                                                }
                                                            }
                                                        }

                                                        if (t.status === "reserved") {
                                                            setActionTable(t);
                                                        } else {
                                                            setSelTable(t); setActiveShot(1);
                                                            setTableView(t.status === "free" ? "menu" : "order"); 
                                                            fetchTableOrdersFromDB(t.id);
                                                        }
                                                    }} />
                                                )
                                            })}
                                        </div>
                                    </div>
                                    ))}
                                </>
                            )}
                        </main>

                        {/* FULLSCREEN MENU MODAL — opens when table clicked */}
                        {/* FULLSCREEN MODAL — split: left=menu, right=receipt+actions */}

                        {selTable && (
                            <div className={`absolute inset-0 z-50 flex flex-col ${th.panel(dark)}`}>
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b bg-sky-600">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                                            <UtensilsCrossed size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-xl text-white leading-none">{selTable.name}</p>
                                            <p className="text-[11px] text-sky-100 mt-1 font-bold uppercase tracking-widest leading-none opacity-90">{selTable.zone}</p>
                                        </div>
                                        {selTable.amount > 0 && (
                                            <span className="ml-5 px-3 py-1.5 rounded bg-amber-400 text-amber-950 text-sm font-bold border border-amber-300">
                                                {fmt(selTable.amount)} <span className="text-[10px] uppercase font-semibold">UZS</span>
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => setSelTable(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-transparent hover:border-white/30">
                                        <X size={22} className="text-white" />
                                    </button>
                                </div>



                                {/* Body: left=MenuPanel, right=receipt+actions */}

                                <div className="flex flex-1 overflow-hidden">



                                    {/* LEFT: MenuPanel (always visible) */}

                                    <div className="flex-1 overflow-hidden border-r border-gray-200">

                                        <MenuPanel

                                            onConfirm={async (cart) => {
                                                const token = store.kassirSession?.token || store.deviceSession?.token;
                                                const hdrs: Record<string, string> = { "Content-Type": "application/json" };
                                                if (token) hdrs["Authorization"] = `Bearer ${token}`;
                                                
                                                const modCart = isSaboyMode ? cart.map(c => ({...c, isSaboy: true, shotId: activeShot})) : cart.map(c => ({...c, shotId: activeShot}));

                                                // Persist cart to DB (marks table occupied)
                                                await fetch("/api/ubt/orders-db", {
                                                    method: "POST", headers: hdrs,
                                                    body: JSON.stringify({
                                                        tableId: selTable.id,
                                                        items: modCart,
                                                        waiterName: store.kassirSession?.name,
                                                        replace: false,
                                                    }),
                                                }).catch(() => {});
                                                // Update local state
                                                const prev = tableOrders[selTable.id] || [];
                                                const merged = [...prev];
                                                modCart.forEach(c => { const ex = merged.find((m: any) => m.item.id === c.item.id && !!m.isSaboy === !!c.isSaboy && (m.shotId || 1) === activeShot); if (ex) ex.qty += c.qty; else merged.push({ ...c }); });
                                                setTableOrders({ ...tableOrders, [selTable.id]: merged });
                                                store.fetchUbtTables();
                                            }}

                                            onPay={async (cart, method, customerId) => {
                                                const token = store.kassirSession?.token || store.deviceSession?.token;
                                                const hdrs: Record<string, string> = { "Content-Type": "application/json" };
                                                if (token) hdrs["Authorization"] = `Bearer ${token}`;
                                                await fetch("/api/ubt/pay", {
                                                    method: "POST", headers: hdrs,
                                                    body: JSON.stringify({
                                                        tableId: selTable.id,
                                                        items: cart.filter((c: any) => c?.item).map((c: any) => ({ menuItemId: c.item.id, name: c.item.name, qty: c.qty, price: c.item.price })),
                                                        paymentMethod: method,
                                                        customerId,
                                                        total: Math.round(cart.reduce((s, c) => s + c.item.price * c.qty, 0)),
                                                        waiterName: store.kassirSession?.name,
                                                        serviceFee: (selTable.serviceFee ?? 0) / 100,
                                                    }),
                                                });
                                                // Delete DB cart orders
                                                fetch(`/api/ubt/orders-db?tableId=${selTable.id}`, { method: "DELETE", headers: hdrs }).catch(() => {});
                                                const updated = { ...tableOrders }; delete updated[selTable.id];
                                                setTableOrders(updated);
                                                setSelTable(null);
                                                store.fetchUbtTables();
                                            }}

                                            kassirPrinterIp={store.kassirSession?.printerIp || ""}
                                            instantAdd
                                            servicePct={selTable.serviceFee ?? 0}
                                            tableName={selTable.name}
                                        />

                                    </div>



                                    {/* RIGHT: Receipt + action buttons */}
                                    <div className={`w-[340px] shrink-0 flex flex-col border-l z-20 transition-all duration-300 ${dark ? "bg-[#0a101d] border-white/5" : "bg-sky-50 border-sky-100"}`}>

                                        {/* Table info */}
                                        <div className={`px-5 py-4 border-b shrink-0 flex items-center justify-between ${dark ? "border-white/5" : "border-slate-200"}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 border bg-sky-600 border-sky-700 text-white">
                                                    <Receipt size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-black text-lg leading-none tracking-tight ${dark ? "text-slate-100" : "text-slate-800"}`}>{selTable.name}</p>
                                                    <p className={`text-[11px] mt-1 font-bold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>{selTable.zone}</p>
                                                </div>
                                            </div>
                                            {selTable.amount > 0 && (
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest leading-none mb-1 ${dark ? "text-emerald-500/80" : "text-emerald-600/80"}`}>Stol Jami</span>
                                                    <span className={`text-sm font-black tracking-tight ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(selTable.amount)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Multi-Shot Tabs */}
                                        {(() => {
                                            const tableOps = tableOrders[selTable.id] || [];
                                            const distinctShots = Array.from(new Set(tableOps.map((o: any) => o.shotId || 1))).sort((a: any, b: any) => a - b);
                                            return (
                                                <div className={`px-3 py-2.5 flex items-center gap-2 overflow-x-auto border-b shrink-0 custom-scrollbar ${dark ? "border-white/5 bg-black/20" : "border-slate-200 bg-sky-100/30"}`}>
                                                    {distinctShots.map(shot => (
                                                        <button key={shot as number} onClick={() => setActiveShot(shot as number)}
                                                            className={`px-3 px-3.5 py-1.5 rounded-full text-xs font-black transition-all whitespace-nowrap flex-shrink-0 ${activeShot === shot ? (dark ? "bg-sky-500 text-white shadow-md shadow-black/50" : "bg-sky-500 text-white shadow-md shadow-sky-500/20") : (dark ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200")}`}>
                                                            {shot}-Chek
                                                        </button>
                                                    ))}
                                                    {(!distinctShots.includes(activeShot)) && (
                                                        <button className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all whitespace-nowrap flex-shrink-0 ${dark ? "bg-sky-500 text-white shadow-md shadow-black/50" : "bg-sky-500 text-white shadow-md shadow-sky-500/20"}`}>
                                                            {activeShot}-Chek
                                                        </button>
                                                    )}
                                                    <button onClick={() => setActiveShot(Math.max(...(distinctShots.length ? distinctShots as number[] : [1]), activeShot) + 1)}
                                                        className={`px-2 py-1.5 rounded-full text-xs font-black transition-all flex items-center justify-center shrink-0 ${dark ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/60" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 tooltip-trigger"}`} title="Yangi chek qo'shish">
                                                        <Plus size={14} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            );
                                        })()}

                                        {/* Buyurtma tarkibi */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                            {(() => {
                                                const activeOrders = (tableOrders[selTable.id] || []).filter((c: any) => (c.shotId || 1) === activeShot);
                                                if (activeOrders.length === 0) {
                                                    return (
                                                        <div className="flex flex-col items-center justify-center h-full gap-4 py-12 opacity-80">
                                                            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center border-2 border-dashed ${dark ? "bg-slate-800/50 border-slate-700 text-slate-600" : "bg-slate-100 border-slate-300 text-slate-400"}`}>
                                                                <ShoppingBag size={32} />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className={`text-base font-bold mb-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>{activeShot}-Chek hali bo'sh</p>
                                                                <p className={`text-xs font-semibold ${dark ? "text-slate-500" : "text-slate-400"}`}>Chapdan taom tanlang</p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="px-3 pt-4 pb-2">
                                                        <p className={`text-[10px] font-black uppercase tracking-widest text-center mb-3 opacity-60 ${dark ? "text-slate-400" : "text-slate-500"}`}>— Buyurtma Tarkibi —</p>
                                                        <div className="flex flex-col gap-2.5">
                                                            {activeOrders.map((c: any, i: number) => c?.item && (
                                                                <div key={i} className={`flex flex-col gap-1.5 p-2.5 rounded-2xl border transition-all hover:scale-[1.02] ${dark ? "bg-[#111827] border-white/5 shadow-lg shadow-black/30" : "bg-white border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"}`}>
                                                                    <div className="flex items-start gap-2.5">
                                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-black/5 ${dark ? "bg-[#1e293b]" : "bg-orange-50"}`}>
                                                                            {c.item.imageUrl ? <img src={c.item.imageUrl} alt="" className="w-full h-full object-cover" /> : <UtensilsCrossed size={16} className="text-orange-400" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0 pt-0.5">
                                                                            <p className={`text-sm font-black leading-snug truncate ${dark ? "text-emerald-400" : "text-emerald-600"}`}>
                                                                                {c.isSaboy && <span className="mr-1 inline-flex transform -translate-y-0.5">📦</span>}
                                                                                {c.item.name}
                                                                                {c.isSaboy && <span className="ml-1.5 text-[9px] text-amber-500 font-bold uppercase border border-amber-500/30 px-1 rounded bg-amber-500/10">Saboy</span>}
                                                                            </p>
                                                                            <p className={`text-[11px] font-bold mt-0.5 ${dark ? "text-emerald-500" : "text-emerald-700"}`}>
                                                                                {c.qty} {c.item.unit || "ta"} <span className="opacity-50 mx-1">×</span> {fmt(c.item.price)}
                                                                            </p>
                                                                        </div>
                                                                        <p className={`text-sm font-black shrink-0 tabular-nums pt-0.5 ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(c.item.price * c.qty)}</p>
                                                                    </div>
                                                                    {/* Compact Quantity Controls */}
                                                                    <div className={`mt-1.5 flex items-center justify-between pt-1.5 border-t px-1 ${dark ? "border-white/5" : "border-slate-100"}`}>
                                                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${dark ? "text-emerald-500/80" : "text-emerald-600"}`}>Miqdor</span>
                                                                        <div className="flex items-center gap-1.5 bg-slate-100/50 px-1 py-0.5 rounded-xl dark:bg-emerald-900/40 border dark:border-emerald-800/50">
                                                                            <button onClick={() => handleUpdateTableItem(c, isWeightUnit(c.item?.unit) ? -0.1 : -1)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${dark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-white text-red-500 hover:bg-red-50 shadow-sm"}`}>
                                                                                <Minus size={14} strokeWidth={3} />
                                                                            </button>
                                                                            <span className={`text-[13px] w-7 text-center font-black tabular-nums ${dark ? "text-emerald-400" : "text-emerald-700"}`}>{c.qty}</span>
                                                                            <button onClick={() => handleUpdateTableItem(c, isWeightUnit(c.item?.unit) ? 0.1 : 1)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${dark ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20" : "bg-white text-sky-600 hover:bg-sky-50 shadow-sm"}`}>
                                                                                <Plus size={14} strokeWidth={3} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                                    </div>

                                                    {/* Total Area */}
                                                    <div className={`mt-4 mb-4 mx-3 p-4 rounded-xl flex flex-col items-center justify-center text-center border ${dark ? "bg-[#111827] border-white/5" : "bg-slate-50 border-slate-200"}`}>
                                                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 z-10">Stol bo'yicha Umumiy Jami</span>
                                                        <span className={`text-2xl font-bold tabular-nums tracking-tighter z-10 ${dark ? "text-emerald-400" : "text-emerald-600"}`}>
                                                            {fmt((tableOrders[selTable.id] || []).reduce((s: number, c: any) => s + c.item.price * c.qty, 0))} <span className="text-[14px] text-emerald-600/70 uppercase font-semibold tracking-widest ml-1">UZS</span>
                                                        </span>
                                                    </div>

                                        {/* Action buttons footer */}
                                        <div className={`shrink-0 border-t p-4 flex flex-col gap-3 ${dark ? "border-white/5 bg-[#0F172A]" : "border-slate-200 bg-white"}`}>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <button
                                                    onClick={async () => { await loadAvailablePrinters(); await handlePrintReceipt(); }}
                                                    className={`flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-lg transition-all border hover:shadow-sm active:scale-[0.98] ${dark ? "bg-white/5 border-transparent hover:bg-white/10" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
                                                    <Receipt size={18} className={dark ? "text-slate-300" : "text-slate-600"} strokeWidth={2.5} />
                                                    <p className={`text-[9.5px] uppercase font-bold tracking-widest leading-none ${dark ? "text-slate-400" : "text-slate-500"}`}>Chek</p>
                                                </button>

                                                <button
                                                    disabled={tableConfirming}
                                                    onClick={async () => {
                                                        if (!selTable) return;
                                                        const allOrders = tableOrders[selTable.id] || [];
                                                        const activeOrders = allOrders.filter((c: any) => (c.shotId || 1) === activeShot);
                                                        if (activeOrders.length === 0) return;
                                                        setTableConfirming(true);
                                                        try {
                                                            const groups: Record<string, typeof activeOrders> = {};
                                                            let hasNewItems = false;
                                                            activeOrders.forEach((c: any) => {
                                                                const unprinted = c.qty - (c.printedQty || 0);
                                                                if (unprinted > 0) {
                                                                    const ip = c.item?.printerIp;
                                                                    if (ip) { 
                                                                        if (!groups[ip]) groups[ip] = []; 
                                                                        groups[ip].push({ ...c, qty: unprinted }); 
                                                                    }
                                                                    hasNewItems = true;
                                                                }
                                                            });

                                                            if (hasNewItems) {
                                                                const now = new Date();
                                                                const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                                                                for (const [printerIp, items] of Object.entries(groups)) {
                                                                    fetch("/api/ubt/print", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ printerIp, port: 9100, receiptType: "kitchen", tableName: selTable.name, time: timeStr, items: items.filter((c: any) => c?.item).map((c: any) => ({ name: c.isSaboy ? `📦 ${c.item.name} (- Saboy -)` : c.item.name, qty: c.qty, price: c.item.price, unit: c.item.unit })), total: items.reduce((s: number, c: any) => s + c.item.price * c.qty, 0) }) }).catch(() => {});
                                                                }

                                                                const updatedOrders = allOrders.map((o:any) => (o.shotId || 1) === activeShot ? { ...o, printedQty: o.qty } : o);
                                                                const token = store.kassirSession?.token || store.deviceSession?.token;
                                                                const hdrs: Record<string, string> = { "Content-Type": "application/json" };
                                                                if (token) hdrs["Authorization"] = `Bearer ${token}`;
                                                                await fetch("/api/ubt/orders-db", {
                                                                    method: "PUT", headers: hdrs,
                                                                    body: JSON.stringify({ tableId: selTable.id, items: updatedOrders, waiterName: store.kassirSession?.name })
                                                                }).catch(() => {});
                                                                setTableOrders(prev => ({ ...prev, [selTable.id]: updatedOrders }));
                                                            }
                                                            setTableConfirmed(true);
                                                            setTimeout(() => setTableConfirmed(false), 3000);
                                                            setSelTable(null);
                                                        } finally { setTableConfirming(false); }
                                                    }}
                                                    className={`flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-lg transition-all border hover:shadow-sm active:scale-[0.98] ${tableConfirmed ? "bg-emerald-600 border-emerald-700 text-white" : dark ? "bg-blue-600 border-blue-700 text-white hover:bg-blue-500" : "bg-blue-600 border-blue-700 text-white hover:bg-blue-700"}`}>
                                                    <Check size={18} strokeWidth={2.5} />
                                                    <p className="text-[9.5px] uppercase font-bold tracking-widest leading-none text-white">{tableConfirmed ? "Yuborildi" : "Tasdiqlash"}</p>
                                                </button>

                                                <button className={`flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-lg transition-all border hover:shadow-sm active:scale-[0.98] ${dark ? "bg-white/5 border-transparent hover:bg-white/10" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                                                    <Clock size={18} className={dark ? "text-amber-400" : "text-amber-600"} strokeWidth={2.5} />
                                                    <p className={`text-[9.5px] uppercase font-black tracking-widest leading-none ${dark ? "text-amber-500" : "text-amber-700"}`}>
                                                        {selTable.since ? new Date(selTable.since).toLocaleTimeString("uz-UZ",{hour:"2-digit",minute:"2-digit"}) : "Vaqt"}
                                                    </p>
                                                </button>
                                            </div>

                                            <div className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${isSaboyMode ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30" : (dark ? "bg-white/5 border-white/10 text-slate-300" : "bg-white border-slate-200 text-slate-600")}`}>
                                                <div className="flex items-center gap-2">
                                                    <Package size={18} className={isSaboyMode ? "text-white" : (dark ? "text-slate-400" : "text-slate-500")} />
                                                    <span className={`text-sm font-bold ${isSaboyMode ? "text-white" : ""}`}>SABOY (Olib ketish)</span>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={isSaboyMode} onChange={e => setIsSaboyMode(e.target.checked)} />
                                                    <div className={`w-11 h-6 outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isSaboyMode ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                </label>
                                            </div>

                                            {/* Stol Almashtirish tugmasi */}
                                            <button
                                                onClick={() => {
                                                    setTransferPwInput("");
                                                    setTransferPwError("");
                                                    setTransferStep("auth");
                                                    setShowTransferModal(true);
                                                }}
                                                className={`w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all border active:scale-[0.99] ${
                                                    dark
                                                        ? "bg-indigo-900/40 text-indigo-300 border-indigo-800/60 hover:bg-indigo-800/60"
                                                        : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                                                }`}
                                            >
                                                ↔ Stol Almashtirish
                                            </button>

                                            {hasPaymentPerm && (
                                                <button
                                                    onClick={() => setShowTablePay(true)}
                                                    className="w-full py-3.5 rounded-lg font-bold text-sm uppercase tracking-wider text-white flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-all border border-transparent shadow-sm active:scale-[0.99]"
                                                    >
                                                    <CreditCard size={20} /> Kassaga To'lov
                                                </button>
                                            )}

                                            {/* ─── Stol Almashtirish Modal ─── */}
                                            {showTransferModal && (
                                                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowTransferModal(false)}>
                                                    <div
                                                        className={`w-full max-w-sm rounded-3xl shadow-2xl border overflow-hidden ${
                                                            dark ? "bg-[#0F172A] border-white/10" : "bg-white border-slate-100"
                                                        }`}
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {/* Modal header */}
                                                        <div className="bg-indigo-600 px-6 py-5 flex items-center justify-between">
                                                            <div>
                                                                <p className="text-white font-black text-lg leading-none">↔ Stol Almashtirish</p>
                                                                <p className="text-indigo-200 text-xs mt-1 font-semibold">{selTable?.name} — {activeShot}-Chek</p>
                                                            </div>
                                                            <button onClick={() => setShowTransferModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                                                                <X size={16} />
                                                            </button>
                                                        </div>

                                                        {transferStep === "auth" ? (
                                                            /* Step 1: Kassir parolini tekshirish */
                                                            <div className="p-6">
                                                                <p className={`text-sm font-bold mb-4 ${
                                                                    dark ? "text-slate-300" : "text-slate-600"
                                                                }`}>
                                                                    🔐 Davom etish uchun kassir maxfiy kodini kiriting:
                                                                </p>
                                                                <input
                                                                    type="password"
                                                                    value={transferPwInput}
                                                                    onChange={e => { setTransferPwInput(e.target.value); setTransferPwError(""); }}
                                                                    onKeyDown={e => {
                                                                        if (e.key === "Enter") {
                                                                            const code = _menuCache?.cancelCode;
                                                                            if (!code || transferPwInput === code) {
                                                                                setTransferStep("pick");
                                                                            } else {
                                                                                setTransferPwError("Noto'g'ri kod! Qaytadan urinib ko'ring.");
                                                                            }
                                                                        }
                                                                    }}
                                                                    placeholder="Maxfiy kod..."
                                                                    autoFocus
                                                                    className={`w-full border rounded-xl px-4 py-3 text-base font-bold tracking-widest outline-none transition-all ${
                                                                        transferPwError
                                                                            ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20"
                                                                            : dark
                                                                                ? "border-white/10 bg-white/5 text-slate-200 focus:border-indigo-500"
                                                                                : "border-slate-200 bg-slate-50 text-slate-800 focus:border-indigo-400"
                                                                    }`}
                                                                />
                                                                {transferPwError && (
                                                                    <p className="mt-2 text-xs text-red-500 font-bold">{transferPwError}</p>
                                                                )}
                                                                <div className="flex gap-3 mt-5">
                                                                    <button
                                                                        onClick={() => setShowTransferModal(false)}
                                                                        className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${
                                                                            dark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                        }`}
                                                                    >
                                                                        Bekor qilish
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const code = _menuCache?.cancelCode;
                                                                            if (!code || transferPwInput === code) {
                                                                                setTransferStep("pick");
                                                                            } else {
                                                                                setTransferPwError("Noto'g'ri kod! Qaytadan urinib ko'ring.");
                                                                            }
                                                                        }}
                                                                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                                                                    >
                                                                        Tasdiqlash →
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            /* Step 2: Stol tanlash */
                                                            <div className="p-4">
                                                                <p className={`text-xs font-bold uppercase tracking-widest mb-3 opacity-60 ${
                                                                    dark ? "text-slate-400" : "text-slate-500"
                                                                }`}>
                                                                    Qaysi stolga ko'chirmoqchisiz?
                                                                </p>
                                                                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                                                                    {tables
                                                                        .filter(t => t.id !== selTable?.id)
                                                                        .map(t => (
                                                                            <button
                                                                                key={t.id}
                                                                                disabled={transferLoading}
                                                                                onClick={() => handleTransferShot(t)}
                                                                                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 text-center transition-all active:scale-[0.97] ${
                                                                                    t.status === "occupied" || t.status === "receipt"
                                                                                        ? dark
                                                                                            ? "border-amber-700/60 bg-amber-900/20 text-amber-300"
                                                                                            : "border-amber-200 bg-amber-50 text-amber-700"
                                                                                        : dark
                                                                                            ? "border-white/10 bg-white/5 text-slate-200 hover:bg-indigo-900/30 hover:border-indigo-600/60"
                                                                                            : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200"
                                                                                }`}
                                                                            >
                                                                                <span className="text-lg">{t.status === "occupied" || t.status === "receipt" ? "🟡" : "🟢"}</span>
                                                                                <span className="font-black text-xs leading-tight">{t.name}</span>
                                                                                <span className={`text-[9px] font-semibold uppercase ${
                                                                                    t.status === "occupied" || t.status === "receipt"
                                                                                        ? "text-amber-500"
                                                                                        : dark ? "text-emerald-500" : "text-emerald-600"
                                                                                }`}>
                                                                                    {t.status === "occupied" || t.status === "receipt" ? "Band" : "Bo'sh"}
                                                                                </span>
                                                                            </button>
                                                                        ))
                                                                    }
                                                                </div>
                                                                {transferLoading && (
                                                                    <p className="text-center text-xs text-indigo-500 font-bold mt-3 animate-pulse">Ko'chirilmoqda...</p>
                                                                )}
                                                                <button
                                                                    onClick={() => setTransferStep("auth")}
                                                                    className={`w-full mt-3 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                                                                        dark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                    }`}
                                                                >
                                                                    ← Orqaga
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {showTablePay && (
                                                <PayModal
                                                    total={(tableOrders[selTable.id] || []).filter((c: any) => (c.shotId || 1) === activeShot).reduce((s: number, c: any) => s + c.item.price * c.qty, 0)}
                                                    onPay={handleTablePayDirect}
                                                    onClose={() => setShowTablePay(false)}
                                                    loading={tablePayLoading}
                                                />
                                            )}

                                            {/* Printer Tanlash Modal */}
                                            {showPrinterPick && (
                                                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPrinterPick(false)}>
                                                    <div className={`w-full max-w-sm rounded-t-3xl shadow-2xl p-5 pb-8 border-t ${dark ? "bg-slate-900 border-slate-700" : "bg-white border-transparent"}`} onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <p className={`font-black text-base ${dark ? "text-slate-200" : "text-gray-800"}`}>🖨️ Printer tanlang</p>
                                                            <button onClick={() => setShowPrinterPick(false)} className={`w-7 h-7 rounded-full flex items-center justify-center text-lg leading-none transition-colors ${dark ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>&times;</button>
                                                        </div>
                                                        {availablePrinters.length === 0 ? (
                                                            <div className={`text-center py-6 ${dark ? "text-slate-500" : "text-gray-400"}`}>
                                                                <p className="font-bold">Printer topilmadi</p>
                                                                <p className="text-xs mt-1">Sozlamalar &rarr; Printerlar bo&apos;limida printer qo&apos;shing</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {availablePrinters.map(p => (
                                                                    <button key={p.id}
                                                                        onClick={() => handlePrintReceipt(p.ipAddress)}
                                                                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${dark ? "border-slate-800 hover:border-orange-500/50 hover:bg-orange-900/20" : "border-gray-100 hover:border-orange-300 hover:bg-orange-50"}`}>
                                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${dark ? "bg-orange-900/40" : "bg-orange-100"}`}>
                                                                            <span className="text-orange-500 text-lg">🖨️</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className={`font-black text-sm ${dark ? "text-slate-200" : "text-gray-800"}`}>{p.name}</p>
                                                                            <p className={`text-xs font-mono ${dark ? "text-slate-500" : "text-gray-400"}`}>{p.ipAddress.replace("usb://", "USB: ")}</p>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        </div>



                                    </div>

                                </div>

                            </div>

                        )}


                    </div>
                )}

                {/* TAKEAWAY TAB */}
                {tab === "takeaway" && (
                    <div className={`flex-1 overflow-hidden flex flex-col ${th.bg(dark)}`} >
                        {/* Header bar */}
                        <div className={`shrink-0 px-5 py-3 border-b flex items-center gap-3 ${th.header(dark)}`}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                                <Package size={17} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-gray-900 text-base leading-none">Olib ketish</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{twOrders.filter(o => o.status === "pending").length} ta kutilmoqda</p>
                            </div>
                            <button
                                onClick={() => { setNewOrderCart([]); setShowTwMenu(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-black text-sm shadow-lg active:scale-[0.97] transition-all"
                                style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow: "0 4px 14px #3b82f655" }}>
                                <Plus size={16} /> Yangi zakaz
                            </button>
                        </div>
                        {/* Orders grid */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {twOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${dark ? "bg-blue-900/40" : "bg-blue-50"}`}>
                                        <ShoppingBag size={40} className="text-blue-200" />
                                    </div>
                                    <p className={`text-base font-bold ${th.sub(dark)}`}>Hali zakaz qilinmagan</p>
                                    <button onClick={() => { setNewOrderCart([]); setShowTwMenu(true); }}
                                        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-sm shadow-lg"
                                        style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                                        <Plus size={16} /> Yangi zakaz qo&apos;shish
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                                    {twOrders.map(o => (
                                        <button key={o.id} onClick={() => setSelOrder(o)}
                                            className={`p-3 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm
                                                ${o.status === "done" ? (dark ? "bg-gray-800 border-emerald-900 shadow-none" : "bg-white border-emerald-200") : (dark ? "bg-gray-800 border-amber-900 shadow-none" : "bg-white border-amber-200")}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`font-black text-lg ${th.label(dark)}`}>#{o.num}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === "done" ? (dark ? "bg-emerald-900 text-emerald-300" : "bg-emerald-100 text-emerald-700") : (dark ? "bg-amber-900 text-amber-300" : "bg-amber-100 text-amber-800")}`}>
                                                    {o.status === "done" ? "Tayyor" : "Kutilmoqda"}
                                                </span>
                                            </div>
                                            <p className={`text-xs flex items-center gap-1 mb-0.5 ${th.label(dark)}`}><User size={10}/> {o.name || "Mijoz"}</p>
                                            <p className={`text-xs flex items-center gap-1 mb-2 ${th.sub(dark)}`}><Clock size={10}/> {o.time}</p>
                                            <p className="font-black text-blue-600 text-sm">{fmt(o.total)} <span className="text-[10px] font-semibold text-gray-400">so&apos;m</span></p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* New order overlay — split layout */}
                        {showTwMenu && (
                            <div className={`absolute inset-0 z-[50] flex flex-col ${th.panel(dark)}`}>
                                {/* Header */}
                                <div className="shrink-0 flex items-center gap-3 px-4 py-3 text-white shadow" style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                                    <button onClick={() => { setShowTwMenu(false); setCustName(""); setCustPhone(""); setNewOrderCart([]); }} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <Package size={18} />
                                    <p className="font-black text-base flex-1">Yangi olib ketish zakazi</p>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <User size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
                                            <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Mijoz ismi"
                                                className="pl-7 pr-3 py-1.5 rounded-xl bg-white/20 text-white placeholder-white/50 text-xs font-semibold focus:outline-none focus:bg-white/30 w-32" />
                                        </div>
                                        <div className="relative">
                                            <Phone size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
                                            <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="Telefon"
                                                className="pl-7 pr-3 py-1.5 rounded-xl bg-white/20 text-white placeholder-white/50 text-xs font-semibold focus:outline-none focus:bg-white/30 w-28" />
                                        </div>
                                    </div>
                                </div>
                                {/* Body: split */}
                                <div className="flex-1 overflow-hidden flex">
                                    {/* LEFT: food menu */}
                                    <div className="flex-1 overflow-hidden border-r border-gray-100">
                                        <MenuPanel
                                            onConfirm={async (added) => {
                                                setNewOrderCart(prev => {
                                                    const result = prev.map(e => ({ ...e }));
                                                    for (const a of added) {
                                                        const idx = result.findIndex(r => r.item.id === a.item.id);
                                                        if (idx >= 0) result[idx].qty += a.qty;
                                                        else result.push({ ...a });
                                                    }
                                                    return result;
                                                });
                                            }}
                                            onPay={async () => {}}
                                            kassirPrinterIp={store.kassirSession?.printerIp || ""}
                                            instantAdd
                                        />
                                    </div>
                                    {/* RIGHT: receipt + actions */}
                                    <div className={`w-[300px] shrink-0 flex flex-col border-l ${th.border(dark)} ${th.panel(dark)}`}>
                                        <div className="flex-1 overflow-y-auto">
                                            <div className="px-3 pt-3">
                                                <p className={`text-[9px] font-black uppercase tracking-widest text-center mb-2 ${th.sub(dark)}`}>· · · BUYURTMA TARKIBI · · ·</p>
                                                {newOrderCart.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                                                        <ShoppingBag size={32} className="text-gray-200" />
                                                        <p className="text-xs text-gray-300 font-semibold">Taom tanlang</p>
                                                    </div>
                                                ) : newOrderCart.map((c, i) => c?.item && (
                                                    <div key={i} className="flex items-center gap-2.5 py-2 border-b border-dashed border-gray-100 last:border-0">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                                                            {c.item.image
                                                                ? <img src={c.item.image} alt={c.item.name} className="w-8 h-8 object-cover"/>
                                                                : <span className="text-sky-400 font-black text-xs">{c.item.name.charAt(0)}</span>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-[13px] font-bold truncate ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{c.item.name}</p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <button onClick={() => setNewOrderCart(prev => prev.map(x => x.item.id === c.item.id ? { ...x, qty: Math.max(0, parseFloat((x.qty - (isWeightUnit(x.item.unit) ? 0.1 : 1)).toFixed(3))) } : x).filter(x => x.qty > 0))} className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${dark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>
                                                                    <Minus size={12} strokeWidth={3} />
                                                                </button>
                                                                <span className={`text-[12px] font-black tabular-nums w-6 text-center ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{c.qty}</span>
                                                                <button onClick={() => setNewOrderCart(prev => prev.map(x => x.item.id === c.item.id ? { ...x, qty: parseFloat((x.qty + (isWeightUnit(x.item.unit) ? 0.1 : 1)).toFixed(3)) } : x))} className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${dark ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20" : "bg-sky-50 text-sky-600 hover:bg-sky-100"}`}>
                                                                    <Plus size={12} strokeWidth={3} />
                                                                </button>
                                                                <span className={`text-[11px] font-bold ml-1 ${dark ? "text-emerald-500" : "text-emerald-700"}`}>× {fmt(c.item.price)}</span>
                                                            </div>
                                                        </div>
                                                        <p className={`text-[13px] font-black shrink-0 tabular-nums ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(c.item.price * c.qty)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {newOrderCart.length > 0 && (
                                                <div className={`mx-3 mt-2 mb-3 rounded-xl px-3 py-2.5 flex justify-between items-baseline ${th.row(dark)}`}>
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Jami</span>
                                                    <span className={`text-base font-black tabular-nums ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(newOrderCart.reduce((s, c) => s + c.item.price * c.qty, 0))} <span className="text-xs text-emerald-600/70 font-semibold">so&apos;m</span></span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Action buttons */}
                                        <div className={`shrink-0 border-t px-3 py-3 flex flex-col gap-2 ${th.border(dark)}`}>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-emerald-900/30 border-emerald-800/50 hover:bg-emerald-800/50" : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}>
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm"><Receipt size={15} className="text-white"/></div>
                                                    <p className={`text-[10px] font-black ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Chek</p>
                                                </button>
                                                <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-purple-900/30 border-purple-800/50 hover:bg-purple-800/50" : "bg-purple-50 border-purple-200 hover:bg-purple-100"}`}>
                                                    <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center shadow-sm"><Users size={15} className="text-white"/></div>
                                                    <p className={`text-[10px] font-black ${dark ? "text-purple-400" : "text-purple-700"}`}>Tip</p>
                                                </button>
                                                <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-amber-900/30 border-amber-800/50 hover:bg-amber-800/50" : "bg-amber-50 border-amber-200 hover:bg-amber-100"}`}>
                                                    <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm"><Clock size={15} className="text-white"/></div>
                                                    <p className={`text-[10px] font-black ${dark ? "text-amber-400" : "text-amber-700"}`}>{fmtSec().slice(0,5)}</p>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    disabled={newOrderCart.length === 0}
                                                    onClick={async () => {
                                                        if (newOrderCart.length === 0) return;
                                                        await printKitchenReceipt(newOrderCart, `Olib ketish${custName ? ' (' + custName + ')' : ''}`);
                                                        // Add to local pending list (NO Transaction yet — payment happens separately)
                                                        const _now = new Date();
                                                        const _time = `${String(_now.getHours()).padStart(2,"0")}:${String(_now.getMinutes()).padStart(2,"0")}`;
                                                        setTwOrders(prev => [{
                                                            id: Date.now(), num: prev.length + 1,
                                                            total: Math.round(newOrderCart.reduce((s, c) => s + c.item.price * c.qty, 0)),
                                                            name: custName, phone: custPhone,
                                                            time: _time, status: "pending" as const,
                                                            items: newOrderCart,
                                                        }, ...prev]);
                                                        setNewOrderCart([]); setCustName(""); setCustPhone("");
                                                        setShowTwMenu(false);
                                                    }}
                                                    className="py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow active:scale-[0.98] transition disabled:opacity-40"
                                                    style={{ background: "linear-gradient(135deg,#f97316,#dc2626)" }}>
                                                    <Check size={18}/> Tasdiqlash
                                                </button>
                                                <button
                                                    disabled={newOrderCart.length === 0}
                                                    onClick={() => setNewOrderPaying(true)}
                                                    className="py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-xl shadow-green-200 active:scale-[0.98] transition disabled:opacity-40"
                                                    style={{ background: "linear-gradient(135deg,#22c55e,#15803d)" }}>
                                                    <CreditCard size={18}/> To&apos;lov
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Pay modal */}
                                {newOrderPaying && (
                                    <PayModal
                                        total={newOrderCart.reduce((s, c) => s + c.item.price * c.qty, 0)}
                                        loading={false}
                                        onClose={() => setNewOrderPaying(false)}
                                        onPay={async (method, customerId) => {
                                            // Create Transaction in DB (records the payment)
                                            await saveTwOrders(newOrderCart, custName, custPhone, method, customerId);
                                            setNewOrderCart([]); setCustName(""); setCustPhone("");
                                            setNewOrderPaying(false); setShowTwMenu(false);
                                            // NOTE: No pending list entry was added (user went straight to payment),
                                            // so nothing to remove from twOrders here.
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* DELIVERY TAB */}
                {tab === "delivery" && (
                    <div className={`flex-1 overflow-hidden flex flex-col ${th.bg(dark)}`} >
                        {/* Header bar */}
                        <div className={`shrink-0 px-5 py-3 border-b flex items-center gap-3 ${th.header(dark)}`}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
                                <Bike size={17} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-gray-900 text-base leading-none">Yetkazib berish</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{dlOrders.filter(o => o.status === "pending").length} ta kutilmoqda</p>
                            </div>
                            <button
                                onClick={() => { setNewOrderCart([]); setShowDlMenu(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-black text-sm shadow-lg active:scale-[0.97] transition-all"
                                style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 4px 14px #a855f755" }}>
                                <Plus size={16} /> Yangi zakaz
                            </button>
                        </div>
                        {/* Orders grid */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Faqat pending (yetkazilmagan) orderlarni ko'rsatamiz */}
                            {dlOrders.filter(o => o.status === "pending").length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${dark ? "bg-purple-900/40" : "bg-purple-50"}`}>
                                        <Bike size={40} className="text-purple-200" />
                                    </div>
                                    <p className={`text-base font-bold ${th.sub(dark)}`}>Hali zakaz qilinmagan</p>
                                    <button onClick={() => { setNewOrderCart([]); setShowDlMenu(true); }}
                                        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-sm shadow-lg"
                                        style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
                                        <Plus size={16} /> Yangi zakaz qo&apos;shish
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                                    {dlOrders.filter(o => o.status === "pending").map(o => (
                                        <button key={o.id} onClick={() => setSelOrder(o)}
                                            className={`p-3 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm
                                                ${o.status === "done" ? (dark ? "bg-gray-800 border-emerald-900 shadow-none" : "bg-white border-emerald-200") : (dark ? "bg-gray-800 border-amber-900 shadow-none" : "bg-white border-amber-200")}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`font-black text-lg ${th.label(dark)}`}>#{o.num}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === "done" ? (dark ? "bg-emerald-900 text-emerald-300" : "bg-emerald-100 text-emerald-700") : (dark ? "bg-amber-900 text-amber-300" : "bg-amber-100 text-amber-800")}`}>
                                                    {o.status === "done" ? "Yetkazildi" : "Yetkazilmoqda"}
                                                </span>
                                            </div>
                                            <p className={`text-xs flex items-center gap-1 mb-0.5 ${th.label(dark)}`}><User size={10}/> {o.name || "Mijoz"}</p>
                                            {o.addr && <p className={`text-xs flex items-center gap-1 mb-0.5 ${th.sub(dark)}`}><MapPin size={10}/> {o.addr}</p>}
                                            <p className={`text-xs flex items-center gap-1 mb-2 ${th.sub(dark)}`}><Clock size={10}/> {o.time}</p>
                                            <p className="font-black text-purple-600 text-sm">{fmt(o.total)} <span className="text-[10px] font-semibold text-gray-400">so&apos;m</span></p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* New order overlay — split layout */}
                        {showDlMenu && (
                            <div className={`absolute inset-0 z-[50] flex flex-col ${th.panel(dark)}`}>
                                {/* Header */}
                                <div className="shrink-0 flex items-center gap-3 px-4 py-3 text-white shadow" style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
                                    <button onClick={() => { setShowDlMenu(false); setCustName(""); setCustPhone(""); setCustAddr(""); setNewOrderCart([]); }} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <Bike size={18} />
                                    <p className="font-black text-base flex-1">Yangi yetkazib berish zakazi</p>
                                    </div>
                                {/* Body: split */}
                                <div className="flex-1 overflow-hidden flex">
                                    {/* LEFT: food menu */}
                                    <div className="flex-1 overflow-hidden border-r border-gray-100">
                                        <MenuPanel
                                            onConfirm={async (added) => {
                                                setNewOrderCart(prev => {
                                                    const result = prev.map(e => ({ ...e }));
                                                    for (const a of added) {
                                                        const idx = result.findIndex(r => r.item.id === a.item.id);
                                                        if (idx >= 0) result[idx].qty += a.qty;
                                                        else result.push({ ...a });
                                                    }
                                                    return result;
                                                });
                                            }}
                                            onPay={async () => {}}
                                            kassirPrinterIp={store.kassirSession?.printerIp || ""}
                                            instantAdd
                                        />
                                    </div>
                                    {/* RIGHT: receipt + actions */}
                                    <div className={`w-[300px] shrink-0 flex flex-col border-l ${th.border(dark)} ${th.panel(dark)}`}>
                                        <div className="flex-1 overflow-y-auto">
                                            <div className="px-3 pt-3">
                                                <p className={`text-[9px] font-black uppercase tracking-widest text-center mb-2 ${th.sub(dark)}`}>· · · BUYURTMA TARKIBI · · ·</p>
                                                {newOrderCart.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                                                        <Bike size={32} className="text-gray-200" />
                                                        <p className="text-xs text-gray-300 font-semibold">Taom tanlang</p>
                                                    </div>
                                                ) : newOrderCart.map((c, i) => c?.item && (
                                                    <div key={i} className="flex items-center gap-2.5 py-2 border-b border-dashed border-gray-100 last:border-0">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                                                            {c.item.image
                                                                ? <img src={c.item.image} alt={c.item.name} className="w-8 h-8 object-cover"/>
                                                                : <span className="text-purple-400 font-black text-xs">{c.item.name.charAt(0)}</span>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-[13px] font-bold truncate ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{c.item.name}</p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <button onClick={() => setNewOrderCart(prev => prev.map(x => x.item.id === c.item.id ? { ...x, qty: Math.max(0, parseFloat((x.qty - (isWeightUnit(x.item.unit) ? 0.1 : 1)).toFixed(3))) } : x).filter(x => x.qty > 0))} className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${dark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>
                                                                    <Minus size={12} strokeWidth={3} />
                                                                </button>
                                                                <span className={`text-[12px] font-black tabular-nums w-6 text-center ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{c.qty}</span>
                                                                <button onClick={() => setNewOrderCart(prev => prev.map(x => x.item.id === c.item.id ? { ...x, qty: parseFloat((x.qty + (isWeightUnit(x.item.unit) ? 0.1 : 1)).toFixed(3)) } : x))} className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${dark ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20" : "bg-sky-50 text-sky-600 hover:bg-sky-100"}`}>
                                                                    <Plus size={12} strokeWidth={3} />
                                                                </button>
                                                                <span className={`text-[11px] font-bold ml-1 ${dark ? "text-emerald-500" : "text-emerald-700"}`}>× {fmt(c.item.price)}</span>
                                                            </div>
                                                        </div>
                                                        <p className={`text-[13px] font-black shrink-0 tabular-nums ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(c.item.price * c.qty)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {newOrderCart.length > 0 && (
                                                <div className={`mx-3 mt-2 mb-3 rounded-xl px-3 py-2.5 flex justify-between items-baseline ${th.row(dark)}`}>
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Jami</span>
                                                    <span className={`text-base font-black tabular-nums ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(newOrderCart.reduce((s, c) => s + c.item.price * c.qty, 0))} <span className="text-xs text-emerald-600/70 font-semibold">so&apos;m</span></span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Action buttons */}
                                        <div className={`shrink-0 border-t px-3 py-3 flex flex-col gap-2 ${th.border(dark)}`}>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-emerald-900/30 border-emerald-800/50 hover:bg-emerald-800/50" : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}>
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm"><Receipt size={15} className="text-white"/></div>
                                                    <p className={`text-[10px] font-black ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Chek</p>
                                                </button>
                                                <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-purple-900/30 border-purple-800/50 hover:bg-purple-800/50" : "bg-purple-50 border-purple-200 hover:bg-purple-100"}`}>
                                                    <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center shadow-sm"><Users size={15} className="text-white"/></div>
                                                    <p className={`text-[10px] font-black ${dark ? "text-purple-400" : "text-purple-700"}`}>Tip</p>
                                                </button>
                                                <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-amber-900/30 border-amber-800/50 hover:bg-amber-800/50" : "bg-amber-50 border-amber-200 hover:bg-amber-100"}`}>
                                                    <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm"><Clock size={15} className="text-white"/></div>
                                                    <p className={`text-[10px] font-black ${dark ? "text-amber-400" : "text-amber-700"}`}>{fmtSec().slice(0,5)}</p>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    disabled={newOrderCart.length === 0}
                                                     onClick={() => setShowDlClientModal(true)}
                                                    className="py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow active:scale-[0.98] transition disabled:opacity-40"
                                                    style={{ background: "linear-gradient(135deg,#f97316,#dc2626)" }}>
                                                    <Check size={18}/> Tasdiqlash
                                                </button>
                                                {hasPaymentPerm && (
                                                    <button
                                                        disabled={newOrderCart.length === 0}
                                                        onClick={() => setNewOrderPaying(true)}
                                                        className="py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-xl shadow-green-200 active:scale-[0.98] transition disabled:opacity-40"
                                                        style={{ background: "linear-gradient(135deg,#22c55e,#15803d)" }}>
                                                        <CreditCard size={18}/> To&apos;lov
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Pay modal */}
                                {newOrderPaying && (
                                    <PayModal
                                        total={newOrderCart.reduce((s, c) => s + c.item.price * c.qty, 0)}
                                        loading={false}
                                        onClose={() => setNewOrderPaying(false)}
                                        onPay={async (method, customerId) => {
                                            const total = Math.round(newOrderCart.reduce((s, c) => s + c.item.price * c.qty, 0));
                                            await saveDlOrders(newOrderCart, custName, custPhone, custAddr, method, customerId);
                                            setNewOrderCart([]); setCustName(""); setCustPhone(""); setCustAddr("");
                                            setNewOrderPaying(false); setShowDlMenu(false);
                                        }}
                                    />
                                )}
                                {/* 📋 Mijoz ma'lumotlari modal */}
                                {showDlClientModal && (
                                    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                                            <div className="px-6 py-5 text-white" style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Bike size={20} />
                                                        <h3 className="font-black text-lg">Mijoz ma&apos;lumotlari</h3>
                                                    </div>
                                                    <button onClick={() => setShowDlClientModal(false)} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={16} /></button>
                                                </div>
                                                <p className="text-white/70 text-xs mt-1">Zakazni tasdiqlash uchun quyidagilarni to&apos;ldiring</p>
                                            </div>
                                            <div className="px-6 py-5 space-y-4">
                                                <div>
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><User size={12} className="text-purple-500" /> Mijoz ismi</label>
                                                    <input type="text" placeholder="Akbar Karimov..." value={custName} onChange={e => setCustName(e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 transition placeholder:text-slate-300" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><Phone size={12} className="text-purple-500" /> Telefon raqami *</label>
                                                    <PhoneInput value={custPhone} onChange={val => setCustPhone(val)}
                                                        className="w-full border-2 border-slate-200 rounded-2xl text-sm font-semibold focus-within:border-purple-500 transition" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><MapPin size={12} className="text-purple-500" /> Yetkazish manzili *</label>
                                                    <input type="text" placeholder="Shahar, ko'cha, uy raqami..." value={custAddr} onChange={e => setCustAddr(e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 transition placeholder:text-slate-300" />
                                                </div>
                                                <div className="bg-purple-50 rounded-2xl px-4 py-3 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-purple-600">{newOrderCart.length} ta taom</span>
                                                    <span className="text-base font-black text-purple-700">{fmt(newOrderCart.reduce((s,c) => s+c.item.price*c.qty,0))} so&apos;m</span>
                                                </div>
                                            </div>
                                            <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                                                <button onClick={() => setShowDlClientModal(false)}
                                                    className="py-3.5 rounded-2xl font-black text-sm border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition">Bekor</button>
                                                <button
                                                    disabled={!custPhone || !custAddr}
                                                    onClick={async () => {
                                                        if (!custPhone || !custAddr) return;
                                                        await printKitchenReceipt(newOrderCart, `Yetkazish${custName ? ' (' + custName + ')' : ''}`);
                                                        const total = Math.round(newOrderCart.reduce((s,c) => s+c.item.price*c.qty, 0));
                                                        await fetch("/api/ubt/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tableId: null, items: newOrderCart.filter((c: any) => c?.item).map((c: any) => ({ menuItemId: c.item.id, name: c.item.name, qty: c.qty, price: c.item.price })), paymentMethod: "pending", total, orderType: "delivery", customerName: custName, customerPhone: custPhone, deliveryAddress: custAddr }) });
                                                        await saveDlOrders(newOrderCart, custName, custPhone, custAddr, "pending");
                                                        setNewOrderCart([]); setCustName(""); setCustPhone(""); setCustAddr("");
                                                        setShowDlClientModal(false); setShowDlMenu(false);
                                                    }}
                                                    className="py-3.5 rounded-2xl font-black text-sm text-white disabled:opacity-40 transition active:scale-[0.97]"
                                                    style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
                                                    <Check size={16} className="inline mr-1" />Tasdiqlash
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ORDER DETAIL MODAL — split: left=menu, right=receipt ── */}
                {selOrder && (
                    <div className={`absolute inset-0 z-[60] flex flex-col ${th.panel(dark)}`}>
                        {/* Header */}
                        <div className={`flex items-center gap-3 px-4 py-3 text-white shrink-0 shadow ${selOrder.addr ? "bg-purple-500" : "bg-blue-500"}`}>
                            <button onClick={() => setSelOrder(null)} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0">
                                <ChevronLeft size={18}/>
                            </button>
                            {selOrder.addr ? <Bike size={18}/> : <Package size={18}/>}
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-base leading-none">{selOrder.addr ? "Yetkazib berish" : "Olib ketish"} — #{selOrder.num}</p>
                                <p className="text-xs text-white/70">{selOrder.name || "Mijoz"} • {selOrder.time}</p>
                            </div>
                        </div>

                        {/* Body: left=menu, right=receipt */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* LEFT: MenuPanel to add items */}
                            <div className="flex-1 overflow-hidden border-r border-gray-100">
                                <MenuPanel
                                    onConfirm={async (newCart) => {
                                        const addedTotal = Math.round(newCart.reduce((s, c) => s + c.item.price * c.qty, 0));
                                        const mergeItems = (existing: CartItem[], added: CartItem[]) => {
                                            const result = existing.map(e => ({ ...e }));
                                            for (const a of added) {
                                                const idx = result.findIndex(r => r.item.id === a.item.id);
                                                if (idx >= 0) result[idx].qty += a.qty;
                                                else result.push(a);
                                            }
                                            return result;
                                        };
                                        const isTw = twOrders.some(o => o.id === selOrder.id);
                                        if (isTw) setTwOrders((prev: any[]) => prev.map((x: any) => x.id === selOrder.id
                                            ? { ...x, items: mergeItems(x.items, newCart), total: x.total + addedTotal }
                                            : x));
                                        else setDlOrders((prev: any[]) => prev.map((x: any) => x.id === selOrder.id
                                            ? { ...x, items: mergeItems(x.items, newCart), total: x.total + addedTotal }
                                            : x));
                                        setSelOrder((prev: any) => prev ? { ...prev, items: mergeItems(prev.items, newCart), total: prev.total + addedTotal } : prev);
                                    }}
                                    onPay={async () => {}}
                                    kassirPrinterIp={store.kassirSession?.printerIp || ""}
                                    instantAdd
                                />
                            </div>

                            {/* RIGHT: Receipt + action buttons */}
                            <div className={`w-[300px] shrink-0 flex flex-col border-l ${th.border(dark)} ${th.panel(dark)}`}>
                                {/* Items list */}
                                <div className="flex-1 overflow-y-auto">
                                    <div className="px-3 pt-3">
                                        <p className={`text-[9px] font-black uppercase tracking-widest text-center mb-2 ${th.sub(dark)}`}>· · · BUYURTMA TARKIBI · · ·</p>
                                        {selOrder.items.map((c: any, i: number) => c?.item && (
                                            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-dashed border-gray-100 last:border-0">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                                                    {c.item.image
                                                        ? <img src={c.item.image} alt={c.item.name} className="w-8 h-8 object-cover"/>
                                                        : <span className="text-sky-400 font-black text-xs">{c.item.name.charAt(0)}</span>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-[13px] font-bold truncate ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{c.item.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <button onClick={() => {
                                                            const updateSel = (prev: any) => {
                                                                const n = prev.items.map((x: any) => x.item.id === c.item.id ? { ...x, qty: Math.max(0, parseFloat((x.qty - (isWeightUnit(x.item.unit) ? 0.1 : 1)).toFixed(3))) } : x).filter((x: any) => x.qty > 0);
                                                                return { ...prev, items: n, total: n.reduce((s:number, x:any) => s + x.item.price * x.qty, 0) };
                                                            };
                                                            setSelOrder(updateSel);
                                                            const isTw = twOrders.some(o => o.id === selOrder.id);
                                                            if (isTw) setTwOrders(p => p.map(x => x.id === selOrder.id ? updateSel(x) : x));
                                                            else setDlOrders(p => p.map(x => x.id === selOrder.id ? updateSel(x) : x));
                                                            
                                                            // Async DB save for persisting deleted/updated items in existing orders
                                                            const token = (store.kassirSession as any)?.token || (store.deviceSession as any)?.token;
                                                            const hdrs: Record<string, string> = { "Content-Type": "application/json" };
                                                            if (token) hdrs["Authorization"] = `Bearer ${token}`;
                                                            setSelOrder((updatedData: any) => {
                                                                if (!isTw) {
                                                                    fetch("/api/ubt/yetkazish", { method: "PUT", headers: hdrs, body: JSON.stringify({ id: String(selOrder.id), items: updatedData.items }) }).catch(()=>null);
                                                                }
                                                                return updatedData;
                                                            });
                                                        }} className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${dark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>
                                                            <Minus size={12} strokeWidth={3} />
                                                        </button>
                                                        <span className={`text-[12px] font-black tabular-nums w-6 text-center ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{c.qty}</span>
                                                        <button onClick={() => {
                                                            const updateSel = (prev: any) => {
                                                                const n = prev.items.map((x: any) => x.item.id === c.item.id ? { ...x, qty: parseFloat((x.qty + (isWeightUnit(x.item.unit) ? 0.1 : 1)).toFixed(3)) } : x);
                                                                return { ...prev, items: n, total: n.reduce((s:number, x:any) => s + x.item.price * x.qty, 0) };
                                                            };
                                                            setSelOrder(updateSel);
                                                            const isTw = twOrders.some(o => o.id === selOrder.id);
                                                            if (isTw) setTwOrders(p => p.map(x => x.id === selOrder.id ? updateSel(x) : x));
                                                            else setDlOrders(p => p.map(x => x.id === selOrder.id ? updateSel(x) : x));
                                                            
                                                            // Async DB save
                                                            const token = (store.kassirSession as any)?.token || (store.deviceSession as any)?.token;
                                                            const hdrs: Record<string, string> = { "Content-Type": "application/json" };
                                                            if (token) hdrs["Authorization"] = `Bearer ${token}`;
                                                            setSelOrder((updatedData: any) => {
                                                                if (!isTw) {
                                                                    fetch("/api/ubt/yetkazish", { method: "PUT", headers: hdrs, body: JSON.stringify({ id: String(selOrder.id), items: updatedData.items }) }).catch(()=>null);
                                                                }
                                                                return updatedData;
                                                            });
                                                        }} className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${dark ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20" : "bg-sky-50 text-sky-600 hover:bg-sky-100"}`}>
                                                            <Plus size={12} strokeWidth={3} />
                                                        </button>
                                                        <span className={`text-[11px] font-bold ml-1 ${dark ? "text-emerald-500" : "text-emerald-700"}`}>× {fmt(c.item.price)}</span>
                                                    </div>
                                                </div>
                                                <p className={`text-[13px] font-black shrink-0 tabular-nums ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(c.item.price * c.qty)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Total */}
                                    <div className={`mx-3 mt-2 mb-3 rounded-xl px-3 py-2.5 flex justify-between items-baseline ${th.row(dark)}`}>
                                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Jami</span>
                                        <span className={`text-base font-black tabular-nums ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{fmt(selOrder.total)} <span className="text-xs text-emerald-600/70 font-semibold">so&apos;m</span></span>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className={`shrink-0 border-t px-3 py-3 flex flex-col gap-2 ${th.border(dark)}`}>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-emerald-900/30 border-emerald-800/50 hover:bg-emerald-800/50" : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}>
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm"><Receipt size={15} className="text-white"/></div>
                                            <p className={`text-[10px] font-black ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Chek</p>
                                        </button>
                                        <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-purple-900/30 border-purple-800/50 hover:bg-purple-800/50" : "bg-purple-50 border-purple-200 hover:bg-purple-100"}`}>
                                            <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center shadow-sm"><Users size={15} className="text-white"/></div>
                                            <p className={`text-[10px] font-black ${dark ? "text-purple-400" : "text-purple-700"}`}>Tip</p>
                                        </button>
                                        <button className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${dark ? "bg-amber-900/30 border-amber-800/50 hover:bg-amber-800/50" : "bg-amber-50 border-amber-200 hover:bg-amber-100"}`}>
                                            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm"><Clock size={15} className="text-white"/></div>
                                            <p className={`text-[10px] font-black ${dark ? "text-amber-400" : "text-amber-700"}`}>{selOrder.time}</p>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                const isTw = twOrders.some(o => o.id === selOrder.id);
                                                if (isTw) {
                                                    setTwOrders((prev: any[]) => prev.filter((x: any) => x.id !== selOrder.id));
                                                } else {
                                                    // Darhol local state'dan o'chirish (UI darhol yopilsin)
                                                    setDlOrders((prev: any[]) => prev.filter((x: any) => x.id !== selOrder.id));
                                                    // DB'da "delivered" ga yangilash (id string bo'lsa = DB orderi)
                                                    const token = (store.kassirSession as any)?.token || (store.deviceSession as any)?.token;
                                                    const hdrs: Record<string, string> = { "Content-Type": "application/json" };
                                                    if (token) hdrs["Authorization"] = `Bearer ${token}`;
                                                    fetch("/api/ubt/yetkazish", {
                                                        method: "PATCH", headers: hdrs,
                                                        body: JSON.stringify({ id: String(selOrder.id), status: "delivered" }),
                                                    }).catch(() => {});
                                                }
                                                setSelOrder(null);
                                            }}
                                            className="py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow active:scale-[0.98] transition"
                                            style={{ background: "linear-gradient(135deg,#f97316,#dc2626)" }}>
                                            <Check size={18}/> Tayyor
                                        </button>
                                        {hasPaymentPerm && (
                                            <button
                                                onClick={() => setPayingOrder(true)}
                                                className="py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-xl shadow-green-200 active:scale-[0.98] transition"
                                                style={{ background: "linear-gradient(135deg,#22c55e,#15803d)" }}>
                                                <CreditCard size={18}/> To&apos;lov
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pay modal */}
                        {payingOrder && selOrder && (
                            <PayModal
                                total={selOrder.total}
                                loading={false}
                                onClose={() => setPayingOrder(false)}
                                onPay={async (method, customerId) => {
                                    const isTw = twOrders.some(o => o.id === selOrder.id);
                                    const token = store.kassirSession?.token || store.deviceSession?.token;
                                    const hdrs: Record<string, string> = { "Content-Type": "application/json" };
                                    if (token) hdrs["Authorization"] = `Bearer ${token}`;
                                    try {
                                        if (isTw) {
                                            // Takeaway pending order: create Transaction via takeaway API
                                            await saveTwOrders(selOrder.items, selOrder.name, selOrder.phone, method, customerId);
                                        } else {
                                            // Delivery order: pay via pay API + update delivery status
                                            const payRes = await fetch("/api/ubt/pay", {
                                                method: "POST", headers: hdrs,
                                                body: JSON.stringify({
                                                    tableId: null,
                                                    items: selOrder.items.filter((c: any) => c?.item).map((c: any) => ({ menuItemId: c.item.id, name: c.item.name, qty: c.qty, price: c.item.price })),
                                                    paymentMethod: method,
                                                    customerId,
                                                    total: Math.round(selOrder.total),
                                                    orderType: "delivery",
                                                    customerName: selOrder.name,
                                                    customerPhone: selOrder.phone,
                                                    deliveryAddress: selOrder.addr,
                                                }),
                                            });
                                            if (!payRes.ok) {
                                                const e = await payRes.json().catch(() => ({}));
                                                alert(e.error || "To'lov amalga oshmadi");
                                                return;
                                            }
                                            // Mark delivery order as delivered in DB (always attempt)
                                            fetch("/api/ubt/yetkazish", {
                                                method: "PATCH", headers: hdrs,
                                                body: JSON.stringify({ id: String(selOrder.id), status: "delivered", isPaid: true }),
                                            }).catch(() => {});
                                        }
                                    } catch {
                                        alert("Server bilan bog'lanishda xatolik");
                                        return;
                                    }
                                    // Remove from local state immediately
                                    if (isTw) setTwOrders((prev: any[]) => prev.filter((x: any) => x.id !== selOrder.id));
                                    else setDlOrders((prev: any[]) => prev.filter((x: any) => x.id !== selOrder.id));
                                    setPayingOrder(false);
                                    setSelOrder(null);
                                }}
                            />
                        )}
                    </div>
                )}


                {/* RESERVATION TAB — removed */}

            </div>

            {/* ── STATUS BAR ──────────────────────────────────────────────── */}
            {/* --- ROLE REPORTS MODALS --- */}
            {showOtchotModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex py-10 justify-center overflow-y-auto">
                    <div className={`w-[800px] max-w-[95vw] h-max min-h-[50vh] rounded-2xl shadow-2xl p-6 border ${dark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-800 border-transparent"}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black">📊 Kassir: Kunlik Otchot</h2>
                            {/* Close & Print buttons */}
                            <div className="flex gap-2">
                                <button onClick={handlePrintOtchot} className="px-4 py-2 rounded-full font-bold text-sm bg-sky-500 text-white hover:bg-sky-600 flex items-center gap-2 transition-all shadow-lg active:scale-95">
                                    🖨️ Chek chiqarish
                                </button>
                                <button onClick={() => setShowOtchotModal(false)} className={`p-2 rounded-full transition-colors ${dark ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-gray-100 hover:bg-gray-200"}`}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        {reportLoading ? (
                            <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-sky-500" size={30} /></div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30">
                                        <div className="text-xs font-bold text-sky-600 dark:text-sky-400">JAMI TUSHUM</div>
                                        <div className="text-2xl font-black text-sky-700 dark:text-sky-300">{fmt(reportData.reduce((s:any, t:any) => s + (t.totalAmount||0), 0))}</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">NAQD</div>
                                        <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">{fmt(reportData.filter((t:any) => t.paymentMethod==="Naqd pul").reduce((s:any, t:any) => s + (t.totalAmount||0), 0))}</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400">PLASTIK</div>
                                        <div className="text-xl font-black text-purple-700 dark:text-purple-300">{fmt(reportData.filter((t:any) => t.paymentMethod==="Plastik karta").reduce((s:any, t:any) => s + (t.totalAmount||0), 0))}</div>
                                    </div>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm">
                                        <thead className={`sticky top-0 ${dark ? "bg-slate-800" : "bg-gray-50"}`}>
                                            <tr>
                                                <th className="py-2 px-3">Vaqti</th>
                                                <th className="py-2 px-3">Ofitsiant</th>
                                                <th className="py-2 px-3">Stol</th>
                                                <th className="py-2 px-3">Summa</th>
                                                <th className="py-2 px-3">Tolov turi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.map((t: any) => (
                                                <tr key={t.id} className={`border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
                                                    <td className="py-2 px-3">{new Date(t.createdAt).toLocaleTimeString("uz-UZ", {hour:'2-digit', minute:'2-digit'})}</td>
                                                    <td className="py-2 px-3">{t.waiter || "-"}</td>
                                                    <td className="py-2 px-3">{t.tableLabel || "Olib ketish"}</td>
                                                    <td className="py-2 px-3 font-bold">{fmt(t.totalAmount)}</td>
                                                    <td className="py-2 px-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${t.paymentMethod === "Naqd pul" ? "bg-emerald-500/20 text-emerald-600" : "bg-purple-500/20 text-purple-600"}`}>{t.paymentMethod}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {reportData.length === 0 && <tr><td colSpan={5} className={`text-center py-4 ${dark ? "text-slate-500" : "text-gray-400"}`}>Bugun hech qanday tranzaksiya yo'q</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showZakazModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex py-10 justify-center overflow-y-auto">
                    <div className={`w-[800px] max-w-[95vw] h-max min-h-[50vh] rounded-2xl shadow-2xl p-6 border ${dark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-800 border-transparent"}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black flex items-center gap-2">🍽️ Mening Zakazlarim <span className="text-sm font-normal text-slate-500">({waiterName})</span></h2>
                            <button onClick={() => setShowZakazModal(false)} className={`p-2 rounded-full transition-colors ${dark ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-gray-100 hover:bg-gray-200"}`}><X size={20} /></button>
                        </div>
                        {reportLoading ? (
                            <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-sky-500" size={30} /></div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                                        <div className="text-xs font-bold text-orange-600 dark:text-orange-400">MENING JAMI SAVDOM</div>
                                        <div className="text-3xl font-black text-orange-700 dark:text-orange-300">
                                            {fmt(reportData.filter((t:any) => t.waiter === waiterName).reduce((s:any, t:any) => s + (t.totalAmount||0), 0))} UZS
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30">
                                        <div className="text-xs font-bold text-sky-600 dark:text-sky-400">XIZMAT HAQQI DOLYASI ({(store.kassirSession as any)?.serviceFeePct ?? 10}%)</div>
                                        <div className="text-3xl font-black text-sky-700 dark:text-sky-300">
                                            {fmt(reportData.filter((t:any) => t.waiter === waiterName).reduce((s:any, t:any) => {
                                                const feePct = ((store.kassirSession as any)?.serviceFeePct ?? 10) / 100;
                                                // calculate how much service fee was inside the totalAmount (totalAmount = amount + fee)
                                                // formula: feeComponent = totalAmount - (totalAmount / (1 + feePct))
                                                return s + (t.totalAmount - (t.totalAmount / (1 + feePct)));
                                            }, 0))} UZS
                                        </div>
                                    </div>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm">
                                        <thead className={`sticky top-0 ${dark ? "bg-slate-800" : "bg-gray-50"}`}>
                                            <tr>
                                                <th className="py-2 px-3">Vaqti</th>
                                                <th className="py-2 px-3">Stol</th>
                                                <th className="py-2 px-3">Chek No</th>
                                                <th className="py-2 px-3">Summa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.filter((t:any) => t.waiter === waiterName).map((t: any) => (
                                                <tr key={t.id} className={`border-b ${dark ? "border-slate-800" : "border-gray-100"}`}>
                                                    <td className="py-2 px-3">{new Date(t.createdAt).toLocaleTimeString("uz-UZ", {hour:'2-digit', minute:'2-digit'})}</td>
                                                    <td className="py-2 px-3">{t.tableLabel || "Olib ketish"}</td>
                                                    <td className="py-2 px-3 font-mono text-xs">{t.receiptNumber}</td>
                                                    <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">{fmt(t.totalAmount)}</td>
                                                </tr>
                                            ))}
                                            {reportData.filter((t:any) => t.waiter === waiterName).length === 0 && <tr><td colSpan={4} className={`text-center py-4 ${dark ? "text-slate-500" : "text-gray-400"}`}>Bugun hali savdo qilmadingiz</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={`h-8 flex items-center justify-between px-4 shrink-0 shadow-lg ${th.header(dark)}`}>
                <div className={`flex items-center gap-3 text-[11px] font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    {/* Static: Internet + Server */}
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500"></span>
                        Internet
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500"></span>
                        Server
                    </span>
                    {/* Divider */}
                    {printerStatus.length > 0 && <span className={`w-px h-3 ${dark ? "bg-white/20" : "bg-slate-300"}`}></span>}
                    {/* Dynamic: printers */}
                    {printerStatus.map(p => (
                        <span key={p.id} className="flex items-center gap-1" title={p.online ? "Ulangan" : "Ulanmagan"}>
                            <span className={`w-2 h-2 rounded-full ${p.online
                                ? "bg-emerald-400 shadow-sm shadow-emerald-500"
                                : "bg-red-400 shadow-sm shadow-red-500"}`}
                            ></span>
                            <span className={p.online ? (dark ? "text-slate-400" : "text-slate-500") : "text-red-400"}>{p.name}</span>
                        </span>
                    ))}
                    {printerStatus.length === 0 && (
                        <span className="italic text-[10px] opacity-70">Printerlar yuklanmoqda…</span>
                    )}
                </div>
                <div className={`flex items-center gap-3 text-[11px] font-mono ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    <span>v1.0.0</span>
                    <span>{fmtDate()}</span>
                    <LiveClock className={`font-black text-sm ${dark ? "text-white" : "text-slate-800"}`} />
                </div>
            </div>
        </div>
    </PosCtx.Provider>
    );
}
