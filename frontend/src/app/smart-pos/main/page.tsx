"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UbtPosMainPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/smart-pos");
    }, [router]);

    return null;
}
