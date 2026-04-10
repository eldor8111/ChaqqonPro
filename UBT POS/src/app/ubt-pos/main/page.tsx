"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UbtPosMainPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/ubt-pos");
    }, [router]);

    return null;
}
