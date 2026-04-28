"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, UbtTable } from "@/lib/store";
import { UtensilsCrossed, LogOut, ChevronLeft, Plus, Trash2, Send } from "lucide-react";

export default function MobileWaiterPage() {
    const router = useRouter();
    const store = useStore();
    const [mounted, setMounted] = useState(false);
    const [selectedTable, setSelectedTable] = useState<UbtTable | null>(null);

    useEffect(() => {
        setMounted(true);
        if (!store.kassirSession) {
            router.replace("/");
            return;
        }
        store.fetchUbtTables();
        const ti = setInterval(() => store.fetchUbtTables(), 10000);
        return () => clearInterval(ti);
    }, [store.kassirSession, router]);

    if (!mounted || !store.kassirSession) return null;

    const handleLogout = () => {
        store.kassirLogout();
        router.push("/");
    };

    // Table view
    if (!selectedTable) {
        return (
            <div className="flex flex-col h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between z-10 sticky top-0">
                    <div>
                        <h1 className="text-lg font-black text-slate-800 leading-tight">Chaqqon Mobile</h1>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{store.kassirSession.name} • Ofitsiant</p>
                    </div>
                    <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all">
                        <LogOut size={18} />
                    </button>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UtensilsCrossed size={14} /> Stollar ro'yxati
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {store.ubtTables.map(t => {
                            const isBusy = t.status === "busy";
                            const isMyTable = isBusy && t.waiter === store.kassirSession?.name;
                            
                            return (
                                <button 
                                    key={t.id} 
                                    onClick={() => setSelectedTable(t)}
                                    className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 active:scale-95 transition-all
                                        ${isBusy ? 
                                            (isMyTable ? "bg-sky-50 border-sky-500 shadow-[0_8px_20px_rgba(14,165,233,0.15)]" : "bg-orange-50 border-orange-400 opacity-60") 
                                            : "bg-white border-slate-200 shadow-sm"}`}
                                >
                                    <span className={`text-xl font-black mb-1 ${isBusy ? (isMyTable ? "text-sky-700" : "text-orange-700") : "text-slate-800"}`}>
                                        {t.label}
                                    </span>
                                    {isBusy ? (
                                        <>
                                            <span className="text-[10px] font-bold uppercase text-slate-500">{t.order ? t.order.items?.length : 0} xil buyurtma</span>
                                            {isMyTable && <span className="absolute -top-2 -right-2 bg-sky-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Sizniki</span>}
                                        </>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase text-emerald-500">Bo'sh stol</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </main>
            </div>
        );
    }

    // Order View (Simplified)
    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-sky-600 text-white shadow-md px-4 py-4 flex items-center justify-between z-10 sticky top-0">
                <button onClick={() => setSelectedTable(null)} className="p-2 -ml-2 hover:bg-sky-700 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-black leading-tight">{selectedTable.label} - Stol</h1>
                    <p className="text-[10px] font-semibold text-sky-200 uppercase tracking-widest">Yangi buyurtma kiritish</p>
                </div>
                <div className="w-10"></div> {/* Placeholder for centering */}
            </header>

            {/* Menu List Placeholder */}
            <main className="flex-1 overflow-y-auto p-4">
                <div className="bg-sky-50 border border-sky-100 rounded-2xl p-6 text-center text-sky-800 mb-6">
                    <UtensilsCrossed size={32} className="mx-auto mb-3 text-sky-400" />
                    <h3 className="font-bold mb-1">Tez orada...</h3>
                    <p className="text-sm text-sky-600/80">Bu yerda ofitsiantlar uchun telefon ekraniga to'liq moslashtirilgan katta knopkali menyu bo'ladi.</p>
                </div>
            </main>
            
            {/* Bottom Cart Action */}
            <div className="bg-white border-t border-slate-200 p-4 pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <button className="w-full bg-slate-200 text-slate-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                    <Send size={18} /> Oshxonaga yuborish
                </button>
            </div>
        </div>
    );
}
