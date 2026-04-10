"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export default function UbtPosLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [hydrated, setHydrated] = useState(false);
    const redirected = useRef(false);

    useEffect(() => {
        const session = useStore.getState().kassirSession;
        const isLoginPage = pathname.startsWith("/ubt-pos/login");

        // Login sahifasi — har doim ko'rsatiladi
        if (isLoginPage) {
            setHydrated(true);
            return;
        }

        // Redirect faqat bir marta
        if (redirected.current) {
            return;
        }

        if (!session) {
            redirected.current = true;
            router.replace("/ubt-pos/login");
            return;
        }

        setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    if (!hydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="w-10 h-10 border-[3px] border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
