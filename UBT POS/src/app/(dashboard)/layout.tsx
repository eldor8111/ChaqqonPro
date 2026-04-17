"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFrontendStore } from "@/lib/frontend/store";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, _hasHydrated, subscriptionExpired } = useFrontendStore();
    const router = useRouter();
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

    return (
        <div className="flex h-screen overflow-hidden bg-surface">
            <Sidebar />
            <div className="flex flex-col flex-1 min-h-0">
                {subscriptionExpired && (
                    <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
                        <AlertTriangle size={16} />
                        <span>Obuna muddati tugagan! Iltimos, to'lov qiling.</span>
                        <Link href="/billing" className="underline hover:text-red-100">
                            Obuna va Tariflar
                        </Link>
                    </div>
                )}
                <Header />
                <main className="flex-1 min-h-0 overflow-y-auto p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}
