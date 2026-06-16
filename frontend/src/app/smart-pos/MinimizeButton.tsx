"use client";
/**
 * MinimizeButton — POS oynasini panel zadachiga (taskbar) tushiruvchi tugma.
 * Yuqori header boshqaruv qatorida (refresh/lock yonida) turadi. Faqat EXE
 * (Electron) ichida ko'rinadi — brauzerda oynani kichraytirib bo'lmaydi.
 */
import { useEffect, useState } from "react";
import { Minus } from "lucide-react";

export default function MinimizeButton({ dark = false }: { dark?: boolean }) {
    const [isElectron, setIsElectron] = useState(false);

    useEffect(() => {
        setIsElectron(typeof window !== "undefined" && !!(window as any).ipcAPI?.minimizeApp);
    }, []);

    if (!isElectron) return null;

    return (
        <button
            onClick={() => (window as any).ipcAPI?.minimizeApp?.()}
            title="Kichraytirish (panelga tushirish)"
            aria-label="Kichraytirish"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 ${dark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}
        >
            <Minus size={16} strokeWidth={3} />
        </button>
    );
}
