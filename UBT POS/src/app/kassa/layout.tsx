"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export default function KassaLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [hydrated, setHydrated] = useState(false);
    const redirected = useRef(false);

    useEffect(() => {
        const session = useStore.getState().kassirSession;
        const isLoginPage = pathname.startsWith("/kassa/login");

        // Login sahifasi — har doim hydrate qilinadi (redirect kerak emas)
        if (isLoginPage) {
            setHydrated(true);
            return;
        }

        // Redirect bir marta bajariladi — lekin login sahifasidan KEYIN tekshiriladi
        if (redirected.current) {
            return;
        }

        if (!session) {
            redirected.current = true;
            const type = pathname.startsWith("/kassa/dorixona") ? "pharmacy" : "shop";
            router.replace(`/kassa/login?type=${type}`);
            return;
        }

        if (session) {
            redirected.current = true;
            router.replace("/ubt-pos");
            return;
        }

        setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    if (!hydrated) {
        return <div style={{ minHeight: "100vh", background: "#0d1117" }} />;
    }

    return <>{children}</>;
}
