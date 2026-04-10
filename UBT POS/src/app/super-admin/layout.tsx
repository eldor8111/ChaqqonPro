"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSuperAdminStore } from "@/lib/superAdminStore";

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [hydrated, setHydrated] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const isAuthenticated = useSuperAdminStore((state) => state.isAuthenticated);
    const redirected = useRef(false);

    // Login va O'rnatish (Setup) sahifalarida auth tekshiruvini o'tkazib yuboramiz
    const isLoginPage = pathname === "/super-admin/login" || pathname === "/super-admin/staff-login" || pathname === "/super-admin/setup";

    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (redirected.current) return;
        if (!isLoginPage && hydrated && !isAuthenticated) {
            redirected.current = true;
            router.replace("/super-admin/login");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, isAuthenticated, isLoginPage]);

    // Login sahifasi — har doim ko'rsatiladi
    if (isLoginPage) {
        return children;
    }

    // Boshqa sahifalar — faqat authenticated bo'lganda
    if (!hydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    return children;
}
