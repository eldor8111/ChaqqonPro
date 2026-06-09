"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdminStore } from "@/lib/superAdminStore";

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [hydrated, setHydrated] = useState(false);
    const router = useRouter();
    const isAuthenticated = useSuperAdminStore((state) => state.isAuthenticated);

    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        if (!isAuthenticated) {
            router.replace("/?mode=admin");
        }
    }, [hydrated, isAuthenticated, router]);

    if (!hydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
