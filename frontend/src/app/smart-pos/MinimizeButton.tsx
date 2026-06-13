"use client";
/**
 * MinimizeButton — POS oynasini panel zadachiga (taskbar) tushiruvchi suzuvchi tugma.
 * Barcha POS sahifalarida ko'rinadi (layout orqali). Faqat EXE (Electron) ichida
 * ishlaydi — brauzerda oynani kichraytirib bo'lmaydi, shuning uchun ko'rinmaydi.
 */
import { useEffect, useState } from "react";
import { Minus } from "lucide-react";

export default function MinimizeButton() {
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
            className="fixed bottom-10 right-5 z-[2500] w-12 h-12 rounded-full bg-slate-800/90 hover:bg-slate-900 text-white shadow-xl shadow-black/30 flex items-center justify-center transition-all active:scale-95 backdrop-blur-sm border border-white/10"
        >
            <Minus size={22} strokeWidth={3} />
        </button>
    );
}
