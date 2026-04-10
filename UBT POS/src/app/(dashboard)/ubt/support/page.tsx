"use client";

import { useState } from "react";
import { Headset, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { PhoneInput } from "@/components/ui/PhoneInput";

export default function SupportPage() {
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientPhone, messageBody })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Noma'lum xatolik yuz berdi");
            }

            setStatus("success");
            setClientPhone("");
            setMessageBody("");
            
            // Auto hide success after 3 sec
            setTimeout(() => setStatus("idle"), 3000);
        } catch (e: any) {
            setStatus("error");
            setErrMsg(e.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-6 lg:p-10 animate-fade-in custom-scrollbar">
            <header className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-inner">
                        <Headset size={24} className="text-sky-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Texnik Yordam</h1>
                        <p className="text-sm font-medium text-slate-400 mt-1">Dasturda muammo yoki takliflar ustida maxsus jamoaga murojaat qiling</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-2xl w-full">
                <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
                    {/* User info note */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-600">
                        <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                        <p className="text-sm font-medium">Barcha xabarlar o'chirib yuborilmaydi va tizim administratorlariga (Dasturchilarga) bevosita yuboriladi. Iltimos muammoni batafsil ta'riflab bering.</p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Siz bilan bog'lanish uchun raqam</label>
                            <div className="relative">
                                <PhoneInput 
                                    value={clientPhone} 
                                    onChange={setClientPhone} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl focus-within:border-sky-500 focus-within:shadow-md transition-all text-slate-800"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Xabar matni</label>
                            <textarea 
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all resize-none h-40 shadow-sm"
                                placeholder="Muammo nima haqida ekanligini yozing..."
                            />
                        </div>
                    </div>

                    {/* Status notifications */}
                    {status === "error" && (
                        <div className="flex bg-red-50 text-red-500 p-3 rounded-xl border border-red-200 text-sm font-medium gap-2 items-center">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            {errMsg}
                        </div>
                    )}

                    {status === "success" && (
                        <div className="flex bg-green-50 text-green-600 p-3 rounded-xl border border-green-200 text-sm font-medium gap-2 items-center">
                            <CheckCircle2 size={16} className="flex-shrink-0" />
                            Murojaatingiz muvaffaqiyatli qabul qilindi, mutaxassis tez orada siz bilan bog'lanadi!
                        </div>
                    )}

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={status === "loading"}
                            className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            {status === "loading" ? "Yuborilmoqda..." : (
                                <>
                                    <Send size={18} /> Murojaatni Jo'natish
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
