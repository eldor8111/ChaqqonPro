"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore, UbtTable } from "@/lib/store";
import { UtensilsCrossed, LogOut, ChevronLeft, Plus, Minus, Send, BarChart2, RefreshCw, X, Search, Check, Clock, TrendingUp, ShoppingBag } from "lucide-react";

interface MenuItem { id: string; name: string; categoryId: string; price: number; image?: string; inStock: boolean; }
interface Category { id: string; name: string; }
interface CartItem { id: string; name: string; price: number; qty: number; }
interface MyStats { today: { total: number; count: number }; week: { total: number; count: number }; month: { total: number; count: number }; hourlyTimeline: { hour: string; total: number }[]; recentOrders: { amount: number; method: string; time: string }[]; }

function fmt(n: number) { return n.toLocaleString("uz-UZ") + " so'm"; }
type ViewType = "tables" | "menu" | "stats" | "cart";

export default function MobileWaiterPage() {
    const router = useRouter();
    const store = useStore();
    const [mounted, setMounted] = useState(false);
    const [view, setView] = useState<ViewType>("tables");
    const [selectedTable, setSelectedTable] = useState<UbtTable | null>(null);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [cats, setCats] = useState<Category[]>([]);
    const [activeCat, setActiveCat] = useState<string>("all");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [existingCart, setExistingCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [stats, setStats] = useState<MyStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const token = store.kassirSession?.token;

    const fetchMenu = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch("/api/ubt/menu", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { const d = await res.json(); setMenu(d.items ?? []); setCats(d.categories ?? []); }
        } catch {}
    }, [token]);

    const fetchStats = useCallback(async () => {
        if (!token) return;
        setStatsLoading(true);
        try {
            const res = await fetch("/api/mobile/my-stats", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setStats(await res.json());
        } finally { setStatsLoading(false); }
    }, [token]);

    useEffect(() => {
        setMounted(true);
        if (!store.kassirSession) { router.replace("/"); return; }
        store.fetchUbtTables();
        fetchMenu();
        const ti = setInterval(() => store.fetchUbtTables(), 15000);
        return () => clearInterval(ti);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.kassirSession, router]);

    useEffect(() => { if (view === "stats") fetchStats(); }, [view, fetchStats]);

    if (!mounted || !store.kassirSession) return null;
    const sess = store.kassirSession;
    const handleLogout = () => { store.kassirLogout(); router.push("/"); };

    const changeQty = (id: string, name: string, price: number, delta: number) => {
        setCart(prev => {
            const ex = prev.find(c => c.id === id);
            if (!ex) return delta > 0 ? [...prev, { id, name, price, qty: 1 }] : prev;
            const newQty = ex.qty + delta;
            if (newQty <= 0) return prev.filter(c => c.id !== id);
            return prev.map(c => c.id === id ? { ...c, qty: newQty } : c);
        });
    };

    const sendOrder = async () => {
        if (!selectedTable || cart.length === 0) return;
        setSending(true);
        try {
            // items formatini orders-db ga mos qilish
            const items = cart.map(c => ({
                item: { id: c.id, name: c.name, price: c.price },
                qty: c.qty,
                price: c.price,
                name: c.name,
            }));

            const res = await fetch("/api/ubt/orders-db", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    tableId: selectedTable.id,
                    items,
                    waiterName: sess.name,
                }),
            });

            if (res.ok) {
                setSent(true);
                setCart([]);
                setTimeout(() => { setSent(false); setSelectedTable(null); setView("tables"); store.fetchUbtTables(); }, 1800);
            } else {
                const err = await res.json();
                alert(err.error || "Zakaz yuborishda xatolik");
            }
        } catch { alert("Tizimga ulanishda xatolik"); }
        finally { setSending(false); }
    };

    const openTable = async (t: UbtTable) => {
        setSelectedTable(t);
        setCart([]);
        setExistingCart([]);

        // Agar stol band bo'lsa — bazadagi mavjud zakazlarni yuklash
        if (t.status === "occupied" || t.status === "receipt") {
            try {
                const res = await fetch(`/api/ubt/orders-db?tableId=${t.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    const existing: CartItem[] = (data.items || [])
                        .filter((ci: any) => ci.item?.id || ci.id)
                        .map((ci: any) => ({
                            id: ci.item?.id ?? ci.id,
                            name: ci.item?.name ?? ci.name,
                            price: ci.item?.price ?? ci.price ?? 0,
                            qty: ci.qty ?? 1,
                        }))
                        // merge duplicates
                        .reduce((acc: CartItem[], cur: CartItem) => {
                            const ex = acc.find(a => a.id === cur.id);
                            if (ex) { ex.qty += cur.qty; return acc; }
                            return [...acc, cur];
                        }, []);
                    if (existing.length > 0) {
                        setExistingCart(existing);
                        setView("cart");
                        return;
                    }
                }
            } catch {}
        }
        setView("menu");
    };

    const filteredMenu = menu.filter(i =>
        i.inStock &&
        (activeCat === "all" || i.categoryId === activeCat) &&
        i.name.toLowerCase().includes(search.toLowerCase())
    );
    const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const cartCount = cart.reduce((s, c) => s + c.qty, 0);
    const maxHour = stats ? Math.max(...(stats.hourlyTimeline || []).map(h => h.total), 1) : 1;

    // ─── HEADER shared ───────────────────────────────────────────────────────
    const Header = ({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) => (
        <header className="bg-white border-b border-slate-100 px-4 pt-4 pb-0 sticky top-0 z-20">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
                            <ChevronLeft size={18} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-base font-black text-slate-800 leading-tight">{title}</h1>
                        {sub && <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">{sub}</p>}
                    </div>
                </div>
                <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 active:scale-95 transition-all">
                    <LogOut size={15} />
                </button>
            </div>
            {!onBack && (
                <div className="flex border-b border-slate-100">
                    {([["tables", UtensilsCrossed, "Stollar"], ["stats", BarChart2, "Otchot"]] as const).map(([id, Icon, label]) => (
                        <button key={id} onClick={() => setView(id as ViewType)} className={`flex-1 py-2.5 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${view === id ? "text-blue-600 border-blue-500" : "text-slate-400 border-transparent"}`}>
                            <Icon size={12} /> {label}
                        </button>
                    ))}
                </div>
            )}
        </header>
    );

    // ─── STATS VIEW ──────────────────────────────────────────────────────────
    if (view === "stats") {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50">
                <Header title="Mening Otchotim" sub={`${sess.name} · Ofitsiant`} />
                <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-10">
                    {statsLoading && !stats ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                            <RefreshCw size={28} className="animate-spin text-blue-400" />
                            <p className="text-sm font-medium">Yuklanmoqda...</p>
                        </div>
                    ) : stats ? (
                        <>
                            <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-100">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-200 mb-1">Bugungi savdo</p>
                                <p className="text-3xl font-black mb-3">{fmt(stats.today.total)}</p>
                                <div className="flex gap-2">
                                    {[["Zakazlar", stats.today.count + " ta"], ["Hafta", fmt(stats.week.total)], ["Oy", fmt(stats.month.total)]].map(([l, v]) => (
                                        <div key={l} className="flex-1 bg-white/15 rounded-xl p-2 text-center">
                                            <p className="text-[9px] font-bold text-blue-100 uppercase mb-0.5">{l}</p>
                                            <p className="text-xs font-black truncate">{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {stats.hourlyTimeline.length > 0 && (
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Clock size={12} /> Soatlar bo'yicha</p>
                                    <div className="flex items-end gap-1 h-20">
                                        {stats.hourlyTimeline.map(h => (
                                            <div key={h.hour} className="flex flex-col items-center flex-1 gap-1">
                                                <div className="w-full bg-blue-500 rounded-t-sm transition-all" style={{ height: `${Math.max(4, Math.round((h.total / maxHour) * 64))}px` }} />
                                                <span className="text-[8px] font-bold text-slate-300 truncate w-full text-center">{h.hour.slice(0, 2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {stats.recentOrders.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide px-4 pt-4 pb-2 flex items-center gap-1.5"><ShoppingBag size={12} /> Oxirgi zakazlar</p>
                                    {stats.recentOrders.map((o, i) => (
                                        <div key={i} className="px-4 py-3 border-t border-slate-50 flex justify-between items-center">
                                            <p className="text-[11px] text-slate-400">{o.time} · {o.method}</p>
                                            <p className="text-sm font-black text-emerald-600">{fmt(o.amount)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <TrendingUp size={14} className="text-emerald-500 mb-2" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Haftalik</p>
                                    <p className="text-lg font-black text-slate-800">{fmt(stats.week.total)}</p>
                                    <p className="text-xs text-slate-400">{stats.week.count} ta zakaz</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <BarChart2 size={14} className="text-purple-500 mb-2" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Oylik</p>
                                    <p className="text-lg font-black text-slate-800">{fmt(stats.month.total)}</p>
                                    <p className="text-xs text-slate-400">{stats.month.count} ta zakaz</p>
                                </div>
                            </div>
                        </>
                    ) : <button onClick={fetchStats} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2"><RefreshCw size={15} /> Yuklash</button>}
                </main>
            </div>
        );
    }

    // ─── CART VIEW (Existing Orders) ─────────────────────────────────────────
    if (view === "cart" && selectedTable) {
        const existingTotal = existingCart.reduce((s, c) => s + c.price * c.qty, 0);
        return (
            <div className="flex flex-col h-screen bg-slate-50">
                <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button onClick={() => { setView("tables"); setSelectedTable(null); setCart([]); setExistingCart([]); }} className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center active:scale-95">
                            <ChevronLeft size={18} className="text-slate-600" />
                        </button>
                        <div className="text-center">
                            <h2 className="text-sm font-black text-slate-800">{selectedTable.name}</h2>
                            <p className="text-[10px] font-bold text-orange-500 uppercase">Stoldagi zakazlar</p>
                        </div>
                        <div className="w-9"></div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 pb-32">
                    {existingCart.length > 0 ? (
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <div className="space-y-4">
                                {existingCart.map(c => (
                                    <div key={c.id} className="flex justify-between items-center pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{c.name}</p>
                                            <p className="text-xs font-black text-slate-400">{fmt(c.price)} x {c.qty}</p>
                                        </div>
                                        <p className="text-sm font-black text-slate-800">{fmt(c.price * c.qty)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase">Jami summa</p>
                                <p className="text-lg font-black text-blue-600">{fmt(existingTotal)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-400 text-sm font-bold">Stolda zakaz yo'q</div>
                    )}
                </main>
                <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                    <button onClick={() => setView("menu")} className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200">
                        <Plus size={16} /> Yangi taom qo'shish
                    </button>
                </div>
            </div>
        );
    }

    // ─── MENU VIEW ───────────────────────────────────────────────────────────
    if (view === "menu" && selectedTable) {
        if (sent) return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Check size={36} className="text-emerald-500" />
                </div>
                <p className="text-xl font-black text-slate-800">Yuborildi!</p>
                <p className="text-sm text-slate-500">Oshxona buyurtmani qabul qildi</p>
            </div>
        );
        return (
            <div className="flex flex-col h-screen bg-slate-50">
                <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button onClick={() => { setView("tables"); setSelectedTable(null); setCart([]); setExistingCart([]); }} className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center active:scale-95">
                            <ChevronLeft size={18} className="text-slate-600" />
                        </button>
                        <div className="text-center">
                            <p className="text-sm font-black text-slate-800">{selectedTable.name}</p>
                            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">{selectedTable.zone}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400">Jami</p>
                            <p className="text-sm font-black text-blue-600">{fmt(cartTotal)}</p>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="px-4 pb-2">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Taom qidirish..." className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-300" />
                            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={12} className="text-slate-400" /></button>}
                        </div>
                    </div>
                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
                        <button onClick={() => setActiveCat("all")} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${activeCat === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>Barchasi</button>
                        {cats.map(c => (
                            <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${activeCat === c.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>{c.name}</button>
                        ))}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-4 py-3 pb-28">
                    <div className="grid grid-cols-2 gap-3">
                        {filteredMenu.map(item => {
                            const inCart = cart.find(c => c.id === item.id);
                            const inExisting = existingCart.find(c => c.id === item.id);
                            return (
                                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-28 object-cover shrink-0" />
                                    ) : (
                                        <div className="w-full h-20 bg-slate-50 flex items-center justify-center shrink-0">
                                            <UtensilsCrossed size={24} className="text-slate-200" />
                                        </div>
                                    )}
                                    <div className="p-3 flex flex-col flex-1">
                                        <div className="flex-1">
                                            <p className="text-[13px] font-bold text-slate-800 leading-tight mb-1 line-clamp-2">
                                                {item.name} {inExisting && <span className="text-[10px] text-orange-500 font-bold ml-1 whitespace-nowrap">(Stolda: {inExisting.qty})</span>}
                                            </p>
                                            <p className="text-xs font-black text-blue-600 mb-2">{fmt(item.price)}</p>
                                        </div>
                                        <div className="mt-auto">
                                        {inCart ? (
                                            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-2 py-1.5 mt-2">
                                                <button onClick={() => changeQty(item.id, item.name, item.price, -1)} className="w-7 h-7 rounded-full bg-white border border-blue-200 flex items-center justify-center active:scale-95 shadow-sm shrink-0"><Minus size={12} className="text-blue-600" /></button>
                                                <span className="text-sm font-black text-blue-700 mx-1">{inCart.qty}</span>
                                                <button onClick={() => changeQty(item.id, item.name, item.price, 1)} className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center active:scale-95 shadow-sm shrink-0"><Plus size={12} className="text-white" /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => changeQty(item.id, item.name, item.price, 1)} className="w-full py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1 active:scale-95 transition-all hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 mt-2">
                                                <Plus size={11} /> Qo'shish
                                            </button>
                                        )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredMenu.length === 0 && (
                            <div className="col-span-2 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                                <UtensilsCrossed size={32} className="text-slate-200" />
                                <p className="font-bold text-slate-500">{search ? "Topilmadi" : "Menyu bo'sh"}</p>
                            </div>
                        )}
                    </div>
                </main>

                {/* Cart bar */}
                {cart.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between mb-3">
                            {cart.map(c => (
                                <div key={c.id} className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-[11px] text-slate-500 truncate">{c.name}</span>
                                    <span className="text-[11px] font-black text-blue-600 shrink-0">×{c.qty}</span>
                                </div>
                            )).slice(0, 2)}
                            {cart.length > 2 && <span className="text-[11px] text-slate-400">+{cart.length - 2} ta</span>}
                        </div>
                        <button onClick={sendOrder} disabled={sending} className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 disabled:opacity-60">
                            {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                            {sending ? "Yuborilmoqda..." : `Buyurtma berish · ${cartCount} ta · ${fmt(cartTotal)}`}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ─── TABLES VIEW ─────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Header title="Chaqqon Mobile" sub={`${sess.name} · Ofitsiant`} />
            <main className="flex-1 overflow-y-auto p-4 pb-10">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <UtensilsCrossed size={12} /> Stollar ro'yxati
                </p>
                {store.ubtTables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                        <UtensilsCrossed size={36} className="text-slate-200" />
                        <p className="font-bold text-slate-500">Stollar topilmadi</p>
                        <button onClick={() => store.fetchUbtTables()} className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95"><RefreshCw size={13} /> Yangilash</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {store.ubtTables.map(t => {
                            const isBusy = t.status === "occupied";
                            const isReceipt = t.status === "receipt";
                            const isMine = isBusy && t.waiter === sess.name;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => openTable(t)}
                                    className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 active:scale-95 transition-all
                                        ${isReceipt ? "bg-amber-50 border-amber-300" :
                                          isMine ? "bg-blue-50 border-blue-400 shadow-[0_4px_16px_rgba(59,130,246,0.12)]" :
                                          isBusy ? "bg-orange-50 border-orange-300 opacity-70" :
                                          "bg-white border-slate-200 shadow-sm"}`}
                                >
                                    {isMine && <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">Sizniki</span>}
                                    {isReceipt && <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">Hisob</span>}
                                    <span className={`text-2xl font-black mb-1 ${isReceipt ? "text-amber-700" : isMine ? "text-blue-700" : isBusy ? "text-orange-600" : "text-slate-800"}`}>{t.name}</span>
                                    <span className={`text-[10px] font-bold uppercase ${isReceipt ? "text-amber-500" : isMine ? "text-blue-500" : isBusy ? "text-orange-400" : "text-emerald-500"}`}>
                                        {isReceipt ? "Hisob kutmoqda" : isBusy ? (isMine ? "Sizning stolingiz" : "Band") : "Bo'sh"}
                                    </span>
                                    <span className="text-[9px] text-slate-400 mt-1">{t.zone} · {t.seats} o'rin</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
