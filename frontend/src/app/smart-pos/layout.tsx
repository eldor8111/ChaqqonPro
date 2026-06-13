"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import MinimizeButton from "./MinimizeButton";

export default function UbtPosLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [hydrated, setHydrated] = useState(false);
    const redirected = useRef(false);

    // Wait for Zustand persist to finish rehydrating from localStorage
    // before doing any auth checks — without this the session appears null
    // on hard refresh/F5 even though the user is logged in.
    useEffect(() => {
        // Zustand persist middleware exposes `hasHydrated()` after the store
        // is fully loaded from localStorage. We poll every 50 ms for up to
        // 2 seconds to give it time to finish.
        let attempts = 0;
        const MAX = 40; // 40 × 50 ms = 2 s
        const id = setInterval(() => {
            attempts++;
            const storeState = useStore.getState();
            const isHydrated = (useStore as any).persist?.hasHydrated?.() ?? true;
            if (isHydrated || attempts >= MAX) {
                clearInterval(id);
                setHydrated(true);
            }
        }, 50);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        if (redirected.current) return;

        const session = useStore.getState().kassirSession;
        const deviceSession = useStore.getState().deviceSession;

        // Allow access if either kassir or device session is valid
        if (
            (session?.id && session?.shopCode) ||
            (deviceSession?.id && (deviceSession as any)?.shopCode)
        ) {
            return; // Valid session — stay on the page
        }

        // No valid session found after hydration → redirect to login
        redirected.current = true;
        router.replace("/kassa/login");
    }, [hydrated, pathname, router]);

    // Show a loading spinner while we wait for the store to hydrate
    if (!hydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-[3px] border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                    <p className="text-sky-400 text-xs font-bold tracking-widest uppercase animate-pulse">YUKLANMOQDA...</p>
                </div>
            </div>
        );
    }

    // After hydration, if we are redirecting, show spinner while navigating
    if (redirected.current) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="w-10 h-10 border-[3px] border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
            </div>
        );
    }

    return <>{children}<MinimizeButton /></>;
}
