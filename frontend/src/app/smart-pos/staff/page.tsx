"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UbtPosStaffRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/smart-pos/start");
    }, [router]);
    return null;
}
