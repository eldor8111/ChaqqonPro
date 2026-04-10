"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headset, Send, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { PhoneInput } from "@/components/ui/PhoneInput";

export default function PosSupportPage() {
    const router = useRouter();
    const { kassirSession } = useStore();
    const [clientPhone, setClientPhone] = useState("");
    const [messageBody, setMessageBody] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errMsg, setErrMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientPhone || !messageBody) {
            setErrMsg("Iltimos barcha maydonlarni to'ldiring.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        try {
            const res = await fetch("/api/ubt/support", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(kassirSession?.token ? { "Authorization": `Bearer ${kassirSession.token}` } : {}),
                },
                body: JSON.stringify({ clientPhone, messageBody }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Noma'lum xatolik yuz berdi");
            }

            setStatus("success");
            setClientPhone("");
            setMessageBody("");
            setTimeout(() => setStatus("idle"), 3000);
        } catch (e: any) {
            setStatus("error");
            setErrMsg(e.message);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col p-6 lg:p-10"
            style={{ background: "linear-gradient(160deg, #0f172a 0%, #1a2744 50%, #1e293b 100%)" }}
        >
            {/* Ambient glow */}
            <div className="fixed -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 70%)", filter: "blur(40px)" }} />
            <div className="fixed -bottom-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />

            {/* Back button */}
            <div className="mb-6 relative z-10">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm font-semibold transition-all px-3 py-2 rounded-xl"
                    style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                >
                    <ArrowLeft size={16} />
                    Orqaga
                </button>
            </div>

            {/* Header */}
            <header className="mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(14,165,233,0.15)", border: "1.5px solid rgba(14,165,233,0.35)", boxShadow: "0 0 24px rgba(14,165,233,0.2)" }}
                    >
                        <Headset size={26} className="text-sky-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white" style={{ letterSpacing: "-0.02em" }}>Texnik Yordam</h1>
                        <p className="text-sm font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            Dasturda muammo yoki takliflar ustida maxsus jamoaga murojaat qiling
                        </p>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="flex-1 max-w-2xl w-full relative z-10">
                <form
                    onSubmit={handleSubmit}
                    className="rounded-3xl p-6 lg:p-8 space-y-6"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        backdropFilter: "blur(16px)",
                        boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                    }}
                >
                    {/* Info banner */}
                    <div
                        className="p-4 rounded-2xl flex gap-3"
                        style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
                    >
                        <AlertCircle className="flex-shrink-0 mt-0.5 text-amber-400" size={18} />
                        <p className="text-sm font-medium text-amber-300">
                            Barcha xabarlar o'chirib yuborilmaydi va tizim administratorlariga (Dasturchilarga) bevosita yuboriladi. Iltimos muammoni batafsil ta'riflab bering.
                        </p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                                Siz bilan bog'lanish uchun raqam
                            </label>
                            <PhoneInput
                                value={clientPhone}
                                onChange={setClientPhone}
                                className="w-full rounded-xl transition-all text-white"
                                style={{
                                    background: "rgba(255,255,255,0.07)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                                Xabar matni
                            </label>
                            <textarea
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                className="w-full rounded-xl p-4 text-white resize-none h-40 focus:outline-none transition-all"
                                placeholder="Muammo nima haqida ekanligini yozing..."
                                style={{
                                    background: "rgba(255,255,255,0.07)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    caretColor: "white",
                                }}
                                onFocus={e => (e.currentTarget as HTMLElement).style.border = "1px solid rgba(14,165,233,0.5)"}
                                onBlur={e => (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.12)"}
                            />
                        </div>
                    </div>

                    {/* Status messages */}
                    {status === "error" && (
                        <div
                            className="flex p-3 rounded-xl text-sm font-medium gap-2 items-center"
                            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "rgba(252,165,165,1)" }}
                        >
                            <AlertCircle size={16} className="flex-shrink-0" />
                            {errMsg}
                        </div>
                    )}

                    {status === "success" && (
                        <div
                            className="flex p-3 rounded-xl text-sm font-medium gap-2 items-center"
                            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "rgba(134,239,172,1)" }}
                        >
                            <CheckCircle2 size={16} className="flex-shrink-0" />
                            Murojaatingiz muvaffaqiyatli qabul qilindi, mutaxassis tez orada siz bilan bog'lanadi!
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-1">
                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="w-full flex justify-center items-center gap-2 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden group"
                            style={{
                                background: "linear-gradient(135deg, rgba(14,165,233,0.9) 0%, rgba(99,102,241,0.85) 100%)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                boxShadow: "0 8px 24px rgba(14,165,233,0.25)",
                                color: "white",
                            }}
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
                            {status === "loading" ? "Yuborilmoqda..." : (
                                <>
                                    <Send size={18} />
                                    Murojaatni Jo'natish
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
