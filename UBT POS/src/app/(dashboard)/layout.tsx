"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFrontendStore } from "@/lib/frontend/store";
import { AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, _hasHydrated, subscriptionExpired } = useFrontendStore();
    const router = useRouter();
    const pathname = usePathname();
    const redirected = useRef(false);

    useEffect(() => {
        if (redirected.current) return;
        if (_hasHydrated && !isAuthenticated) {
            redirected.current = true;
            router.replace("/");
        }
    }, [_hasHydrated, isAuthenticated, router]);

    if (!_hasHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-glow animate-pulse bg-white">
                        <img src="/logo.jpg" alt="UBT" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-slate-400 text-sm animate-pulse">Yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    const isBillingPage = pathname?.startsWith("/billing");

    return (
        <div className="flex h-screen overflow-hidden bg-surface">
            <Sidebar />
            <div className="flex flex-col flex-1 min-h-0">
                {subscriptionExpired && (
                    <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-50 rounded-b-xl shadow-md mx-4">
                        <AlertTriangle size={16} />
                        <span>Obuna muddati tugagan! Iltimos, to'lov qiling.</span>
                        {!isBillingPage && (
                            <Link href="/billing" className="underline hover:text-red-100 ml-2 font-bold">
                                To'lovlar bo'limiga o'tish
                            </Link>
                        )}
                    </div>
                )}
                <Header />
                <main className="flex-1 min-h-0 overflow-y-auto p-4 w-full h-full">
                    {subscriptionExpired && !isBillingPage ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-surface-card rounded-2xl border border-surface-border animate-fade-in mx-auto max-w-2xl mt-12">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Lock size={40} className="text-red-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">Bo'lim bloklangan</h2>
                            <p className="text-slate-500 mb-8 max-w-md">
                                Obuna muddati tugagani sababli asosiy bo'limlarga kirish vaqtinchalik cheklangan. Barcha imkoniyatlardan foydalanish uchun obunani uzaytiring.
                            </p>
                            <Link 
                                href="/billing" 
                                className="bg-brand-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 w-full sm:w-auto text-lg"
                            >
                                Obuna va To'lovlar
                            </Link>
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    );
}
