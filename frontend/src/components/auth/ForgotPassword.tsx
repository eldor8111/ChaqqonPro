"use client";

import React, { useState, useEffect } from "react";
import { Phone, CheckCircle2, Lock, ArrowRight, ShieldCheck, X, AlertTriangle } from "lucide-react";

export function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [phone, setPhone] = useState("+998");
    const [code, setCode] = useState("");
    const [token, setToken] = useState(""); // Temporary token for resetting
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [timer, setTimer] = useState(60);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 2 && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (phone.length < 9) {
            setError("Telefon raqamni to'g'ri kiriting");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "send-code", phone }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setStep(2);
                setTimer(60);
            } else {
                setError(data.error || "Xatolik yuz berdi");
            }
        } catch {
            setError("Serverga ulanib bo'lmadi");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (code.length < 5) {
            setError("Kodni to'liq kiriting");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "verify-code", phone, code }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setToken(data.token);
                setStep(3);
            } else {
                setError(data.error || "Kod xato");
            }
        } catch {
            setError("Serverga ulanib bo'lmadi");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (newPassword.length < 4) {
            setError("Parol kamida 4 ta belgidan iborat bo'lishi kerak");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Parollar mos tushmadi");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset", phone, token, newPassword }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setStep(4);
            } else {
                setError(data.error || "Parolni o'zgartirib bo'lmadi");
            }
        } catch {
            setError("Serverga ulanib bo'lmadi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                            <ShieldCheck size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800">Parolni tiklash</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-slate-100 w-full flex">
                    <div className={`h-full bg-blue-500 transition-all duration-500`} style={{ width: `${(step / 3) * 100}%` }} />
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs">
                            <AlertTriangle size={14} className="flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Step 1: Phone */}
                    {step === 1 && (
                        <form onSubmit={handleSendCode}>
                            <div className="mb-5 text-center">
                                <h4 className="text-lg font-bold text-slate-800 mb-1">Telefon raqam</h4>
                                <p className="text-xs text-slate-500">Tizimga ulangan raqamingizni kiriting va biz SMS kod yuboramiz</p>
                            </div>
                            
                            <div className="mb-5">
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => {
                                            if (!e.target.value.startsWith("+998")) setPhone("+998");
                                            else setPhone(e.target.value);
                                            setError("");
                                        }}
                                        className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-70"
                            >
                                {loading ? "Yuborilmoqda..." : "SMS Kod olish"}
                                {!loading && <ArrowRight size={16} />}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Code */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyCode}>
                            <div className="mb-5 text-center">
                                <h4 className="text-lg font-bold text-slate-800 mb-1">Kodni kiriting</h4>
                                <p className="text-xs text-slate-500">{phone} raqamiga yuborilgan tasdiqlash kodini kiriting</p>
                            </div>
                            
                            <div className="mb-5">
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="• • • • • •"
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value.replace(/\D/g, ""));
                                        setError("");
                                    }}
                                    className="w-full text-center tracking-[0.5rem] font-mono text-2xl py-3 rounded-xl text-slate-800 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                />
                                
                                <div className="mt-3 flex justify-between items-center text-xs">
                                    <span className="text-slate-500">
                                        {timer > 0 ? `00:${timer.toString().padStart(2, '0')} qoldi` : "Kod kelmadimi?"}
                                    </span>
                                    <button 
                                        type="button" 
                                        disabled={timer > 0 || loading}
                                        onClick={handleSendCode}
                                        className={`font-semibold ${timer > 0 ? "text-slate-300" : "text-blue-600 hover:underline"}`}
                                    >
                                        Qayta yuborish
                                    </button>
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading || code.length < 5}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-70"
                            >
                                {loading ? "Tekshirilmoqda..." : "Kodni tasdiqlash"}
                            </button>
                        </form>
                    )}

                    {/* Step 3: New Password */}
                    {step === 3 && (
                        <form onSubmit={handleResetPassword}>
                            <div className="mb-5 text-center">
                                <h4 className="text-lg font-bold text-slate-800 mb-1">Yangi parol</h4>
                                <p className="text-xs text-slate-500">Tizimga kirish uchun yangi kuchli parol yarating</p>
                            </div>
                            
                            <div className="space-y-3 mb-5">
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input
                                        type="password"
                                        placeholder="Yangi parol"
                                        value={newPassword}
                                        onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                                        className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                    />
                                </div>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input
                                        type="password"
                                        placeholder="Parolni tasdiqlang"
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                        className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-70"
                            >
                                {loading ? "Saqlanmoqda..." : "Parolni Saqlash"}
                            </button>
                        </form>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-2">Parol yangilandi!</h4>
                            <p className="text-sm text-slate-500 mb-6">
                                Endi yangi parolingiz orqali admin paneliga kirishingiz mumkin.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all"
                            >
                                Kirish oynasiga qaytish
                            </button>
                        </div>
                    )}

                    {/* Support Fallback Instructions */}
                    {(step === 1 || step === 2) && (
                        <div className="mt-6 pt-5 border-t border-slate-100">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 leading-tight">
                                    SMS xizmati ishlamayaptimi yoki raqamingiz almashganmi?<br />
                                    Texnik yordamga murojaat qiling:<br />
                                    <span className="font-bold text-slate-700 mt-1 inline-block">+998 88 911 81 71</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
