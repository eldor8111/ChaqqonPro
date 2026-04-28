"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Bike, LogOut, Package } from "lucide-react";

export default function MobileCourierPage() {
    const router = useRouter();
    const store = useStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!store.kassirSession) {
            router.replace("/");
            return;
        }
    }, [store.kassirSession, router]);

    if (!mounted || !store.kassirSession) return null;

    const handleLogout = () => {
        store.kassirLogout();
        router.push("/");
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between z-10 sticky top-0">
                <div>
                    <h1 className="text-lg font-black text-slate-800 leading-tight">Chaqqon Mobile</h1>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-widest">{store.kassirSession.name} • Kuryer</p>
                </div>
                <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all">
                    <LogOut size={18} />
                </button>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Bike size={14} /> Yetkazib berish
                </h2>
                
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-red-800">
                    <Package size={32} className="mx-auto mb-3 text-red-400" />
                    <h3 className="font-bold mb-1">Tez orada...</h3>
                    <p className="text-sm text-red-600/80">Bu yerda kuryerga biriktirilgan tayyor zakazlar ro'yxati, manzili va "Yetkazib berildi" tugmalari bo'ladi.</p>
                </div>
            </main>
        </div>
    );
}
