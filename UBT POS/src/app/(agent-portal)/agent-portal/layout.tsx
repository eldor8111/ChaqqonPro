"use client";

import Link from "next/link";
import { Users, Building, LogOut, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdminStore } from "@/lib/superAdminStore";

export default function AgentPortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, currentUser, logout } = useSuperAdminStore();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated || currentUser?.role !== "Agent") {
            router.replace("/super-admin/staff-login");
        }
    }, [mounted, isAuthenticated, currentUser, router]);

    if (!mounted || !isAuthenticated || currentUser?.role !== "Agent") {
        return null;
    }

    const handleLogout = () => {
        logout();
        router.push("/super-admin/staff-login");
    };

    return (
        <div className="agent-portal-dark min-h-screen flex" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
            {/* Sidebar */}
            <aside className="w-64 bg-slate-800 border-r border-slate-700 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-black text-sky-400">Agent Portal</h2>
                    <p className="text-xs text-slate-400">ChaqqonPro CRM</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/agent-portal" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sky-500/10 text-sky-400 font-medium">
                        <LayoutDashboard size={20} /> Asosiy
                    </Link>
                    <Link href="/agent-portal/leads" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors">
                        <Users size={20} /> Potensial Mijozlar
                    </Link>
                    <Link href="/agent-portal/tenants" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors">
                        <Building size={20} /> Do&apos;konlarim
                    </Link>
                </nav>
                <div className="p-4 border-t border-slate-700">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut size={20} /> Tizimdan chiqish
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-800 border-b border-slate-700 z-50 flex items-center justify-between px-4">
                <h2 className="text-lg font-black text-sky-400">Agent Portal</h2>
                <button onClick={handleLogout} className="text-red-400 text-sm font-semibold">Chiqish</button>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:pt-0 pt-16">
                {children}
            </main>
        </div>
    );
}
