"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Zap, BarChart3, Users, Package, Phone, UtensilsCrossed, X, CheckCircle2, User, Sparkles, Layers, Laptop, Database } from "lucide-react";
import { useFrontendStore } from "@/lib/frontend/store";
import { useStore } from "@/lib/store";
import { useSuperAdminStore } from "@/lib/superAdminStore";
import { ForgotPasswordModal } from "@/components/auth/ForgotPassword";

type ShopType = "smart";

const UBT_TYPE = {
    value: "smart" as ShopType,
    label: "SMART",
    icon: UtensilsCrossed,
    color: "text-blue-600",
    activeColor: "bg-blue-600",
    borderColor: "border-blue-600",
    description: "Restoran / Mehmonxona / Kafe",
};

const gradient = "from-blue-600 via-indigo-600 to-indigo-900";
const accent = "from-blue-500 via-indigo-500 to-indigo-800";
const btnClass = "bg-blue-600 hover:bg-blue-700 shadow-blue-200";
const focusClass = "focus:border-blue-500 focus:ring-blue-500/10";

const PHONE_PREFIX = "+998 ";

// ── OFERTA MODAL ────────────────────────────────────────────────────────────

function OfertaModal({ onAccept, onClose }: { onAccept: () => void; onClose?: () => void }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
        if (atBottom) setScrolledToBottom(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Foydalanish Shartlari (Oferta)</h2>
                        <p className="text-xs text-slate-500 mt-0.5">SMART tizimidan foydalanish uchun quyidagi shartlarni o&#39;qing</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Scrollable body */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-6 py-4 text-sm text-slate-700 space-y-4 leading-relaxed"
                >
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium">
                        Ushbu oferta SMART dasturiy ta&#39;minotidan foydalanuvchi bilan tuzilgan ommaviy shartnoma hisoblanadi.
                        Tizimga kirib, siz quyidagi barcha shartlarga rozilik bildirasiz.
                    </div>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">1. Umumiy qoidalar</h3>
                        <p>SMART — bu &quot;e-code technology&quot; tomonidan ishlab chiqilgan savdo, ombor va moliyaviy hisobotlarni boshqarish uchun mo&#39;ljallangan bulut asosidagi dasturiy tizimdir. Ushbu oferta foydalanuvchi (Administrator, Kassir yoki boshqa rol egasi) bilan &quot;e-code technology&quot; o&#39;rtasidagi huquqiy munosabatlarni tartibga soladi.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">2. Tizimga kirish va foydalanish huquqi</h3>
                        <p>2.1. Foydalanuvchi tizimga faqat egasining ruxsati bilan kirish huquqiga ega.<br />
                            2.2. Har bir kirish uchun shaxsiy login va parol ishlatiladi. Ularni uchinchi shaxslarga berish taqiqlanadi.<br />
                            2.3. Administrator o&#39;z mas&#39;uliyatidagi xodimlar (kassirlar) uchun alohida hisob yaratishga majbur.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">3. Ma&#39;lumotlarni muhofaza qilish</h3>
                        <p>3.1. Tizimga kiritilgan barcha ma&#39;lumotlar (mahsulotlar, mijozlar, tranzaksiyalar) faqat tizim egasiga tegishli bo&#39;lib, uchinchi shaxslarga berilmaydi.<br />
                            3.2. "SMART" serverlarida saqlangan ma&#39;lumotlar shifrlangan holda saqlanadi.<br />
                            3.3. Ma&#39;lumotlar faqat O&#39;zbekiston Respublikasi qonunchiligiga asosan so&#39;rov bo&#39;lsa, tegishli organlarga taqdim etilishi mumkin.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">4. Shaxsiy ma&#39;lumotlarni qayta ishlash</h3>
                        <p>4.1. Tizim quyidagi shaxsiy ma&#39;lumotlarni to&#39;playdi: ism, telefon raqami, tashkilot nomi, manzil.<br />
                            4.2. Ushbu ma&#39;lumotlar foydalanuvchi profilini yaratish, hisob-kitob va texnik yordam ko&#39;rsatish uchun ishlatiladi.<br />
                            4.3. Foydalanuvchi o&#39;z ma&#39;lumotlarini o&#39;chirish yoki o&#39;zgartirish huquqini saqlaydi.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">5. Taqiqlangan harakatlar</h3>
                        <p>5.1. Tizimga ruxsatsiz kirish yoki kirishga urinish.<br />
                            5.2. Tizim kodini o&#39;zgartirish, ko&#39;chirish yoki tarqatish.<br />
                            5.3. Boshqa foydalanuvchilarning ma&#39;lumotlarini o&#39;g&#39;irlash yoki o&#39;zgartirish.<br />
                            5.4. Tizim yordamida qonunga xilof moliyaviy operatsiyalar amalga oshirish.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">6. To&#39;lov va tariflar</h3>
                        <p>6.1. SMART tizimidan foydalanish obuna asosida amalga oshiriladi.<br />
                            6.2. Tariflar alohida shartnomada yoki tizim boshqaruv panelida ko&#39;rsatiladi.<br />
                            6.3. To&#39;lov muddati o&#39;tganda tizimga kirish cheklanishi mumkin.<br />
                            6.4. Hisob-faktura oyning 1-kuniga qadar taqdim etiladi.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">7. Mas&#39;uliyat chegarasi</h3>
                        <p>7.1. "SMART" foydalanuvchi tomonidan noto&#39;g&#39;ri kiritilgan ma&#39;lumotlar uchun mas&#39;uliyat olmaydi.<br />
                            7.2. Internet uzilib qolishi yoki kuch ta&#39;minotidagi uzilishlar sababli yuzaga kelgan yo&#39;qotishlar uchun mas&#39;uliyat yuklatilmaydi.<br />
                            7.3. Tizim texnik xizmatlari vaqtida (maintenance) ma&#39;lumotlarga kirish muvaqqat cheklanishi mumkin.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">8. Texnik yordam</h3>
                        <p>8.1. Texnik yordam 24/7 rejimida ko&#39;rsatiladi.<br />
                            8.2. Murojaat uchun: <span className="font-semibold text-slate-900">+998 77 293 10 14</span> yoki <span className="font-semibold text-slate-900">support@smart.uz</span><br />
                            8.3. Barcha muammolar tezkor va sifatli hal etiladi.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">9. Shartnomani bekor qilish</h3>
                        <p>9.1. Foydalanuvchi istalgan vaqtda tizimdan chiqish va ma&#39;lumotlarini o&#39;chirish talebini yuborishi mumkin.<br />
                            9.2. &quot;SMART&quot; oferta shartlari buzilganda foydalanuvchi hisobini bloklash huquqini saqlaydi.<br />
                            9.3. Obuna bekor qilinganda ma&#39;lumotlar 30 kun davomida arxivda saqlanadi.<br />
                            9.4. Shartnoma bir tomonlama bekor qilinganda tizim uchun qilingan xarajatlar qaytarib berilmaydi.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">10. Yakuniy qoidalar</h3>
                        <p>10.1. Ushbu oferta O&#39;zbekiston Respublikasi qonunchiligiga asosida tuzilgan.<br />
                            10.2. Nizolar da&#39;vo tartibida hal etiladi.<br />
                            10.3. "SMART" oferta shartlarini oldindan xabardor qilgan holda o&#39;zgartirish huquqini saqlaydi.<br />
                            10.4. Oferta ro&#39;yxatdan o&#39;tilgan kundan boshlab kuchga kiradi.</p>
                        <p className="mt-2 text-xs text-slate-400">So&#39;nggi yangilanish: 2025-yil, 1-mart. "SMART" &copy; 2025.</p>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                    {!scrolledToBottom && (
                        <p className="text-xs text-slate-500 text-center mb-3">
                            Qabul qilish uchun shartlarni oxirigacha o&#39;qing ↓
                        </p>
                    )}
                    <button
                        onClick={onAccept}
                        disabled={!scrolledToBottom}
                        className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={16} />
                        Shartlarni qabul qilaman
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── MAIN LOGIN FORM ──────────────────────────────────────────────────────────
function FeaturesModal({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState(0);

    const modules = [
        {
            id: "pos",
            title: "Super Tezkor Kassa (POS)",
            icon: Zap,
            gradient: "from-blue-500 to-indigo-600",
            features: [
                "1 soniyadagi tezkor savdo oynasi",
                "Oflayn ishlash qobiliyati",
                "Murakkab chegirmalar va keshbeklar",
                "Oshxona uchun to'g'ridan-to'g'ri chek chiqarish"
            ],
            mockup: (
                <div className="w-full h-full bg-slate-100 flex flex-col p-4 relative overflow-hidden font-sans">
                    {/* Header */}
                    <div className="h-14 bg-white rounded-xl flex items-center px-6 justify-between shrink-0 mb-4 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className="text-blue-600 font-black text-xl tracking-tighter">SMART<span className="text-slate-800">POS</span></div>
                            <div className="h-6 w-px bg-slate-200"></div>
                            <div className="text-slate-500 font-medium text-sm">Asosiy Kassa</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-700">Dilshod K.</div>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="flex gap-4 flex-1">
                        {/* Products */}
                        <div className="flex-[2] flex flex-col gap-4">
                            <div className="flex gap-2">
                                {['Barchasi', 'Milliy Taomlar', 'Fast Food', 'Ichimliklar'].map((cat, i) => (
                                    <div key={i} className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${i===0?'bg-blue-600 text-white shadow-md shadow-blue-200':'bg-white text-slate-600 border border-slate-200'}`}>
                                        {cat}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-2 pb-2">
                                {[
                                    {name: "Palov (Porsiya)", price: "25 000 UZS", emoji: "🍛"},
                                    {name: "Shashlik (Qiyma)", price: "12 000 UZS", emoji: "🍢"},
                                    {name: "Manti (1 dona)", price: "4 000 UZS", emoji: "🥟"},
                                    {name: "Kola 1L", price: "10 000 UZS", emoji: "🥤"},
                                    {name: "Choy (Qora)", price: "3 000 UZS", emoji: "☕"},
                                    {name: "Non", price: "4 000 UZS", emoji: "🍞"},
                                ].map((prod, i) => (
                                    <div key={i} className="bg-white rounded-xl p-3 flex flex-col items-center text-center justify-between shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
                                        <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-3xl mb-2 group-hover:scale-110 transition-transform">{prod.emoji}</div>
                                        <div className="text-slate-800 text-sm font-bold leading-tight mb-1">{prod.name}</div>
                                        <div className="text-blue-600 text-xs font-black">{prod.price}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Cart */}
                        <div className="flex-1 bg-white rounded-2xl p-5 flex flex-col shadow-lg border border-slate-200">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                <div className="text-slate-800 font-bold text-lg">Joriy Buyurtma</div>
                                <div className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold">Naqd xarid</div>
                            </div>
                            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                                {[
                                    {name: "Palov", qty: 2, price: "50 000"},
                                    {name: "Non", qty: 2, price: "8 000"},
                                    {name: "Choy (Qora)", qty: 1, price: "3 000"},
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                        <div>
                                            <div className="text-slate-800 text-sm font-bold">{item.name}</div>
                                            <div className="text-slate-400 text-xs">{item.qty} x</div>
                                        </div>
                                        <div className="text-slate-800 text-sm font-bold">{item.price}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-slate-500 font-bold">JAMI TO'LOV:</div>
                                    <div className="text-blue-600 font-black text-2xl">61 000 <span className="text-sm">UZS</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold border border-emerald-200 cursor-pointer hover:bg-emerald-100">Naqd pul</div>
                                    <div className="h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold border border-blue-200 cursor-pointer hover:bg-blue-100">Karta</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            description: "Tezkor va qulay POS oynasi yordamida buyurtmalarni bir zumda qabul qiling. Rasmlar va aniq yozuvlar yordamida xatolar nolga tushadi."
        },
        {
            id: "waiter",
            title: "Ofitsiantlar Mobil Ilovasi",
            icon: Phone,
            gradient: "from-amber-500 to-orange-600",
            features: [
                "Telefondan turib buyurtma urish",
                "Stollarni band qilish va nazorat qilish",
                "Oshxonaga avtomatik xabar yuborish",
                "Mijoz hisobini telefondan chiqarish"
            ],
            mockup: (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
                    <div className="w-[300px] h-[600px] bg-slate-50 rounded-[3rem] border-[10px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
                        
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 pt-10 pb-4 shadow-md z-10 text-white">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div className="text-white/80 text-xs font-medium">Namunaviy Buyurtma</div>
                                    <div className="font-black text-xl">Demo Stol</div>
                                </div>
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">👨‍🍳</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                            <div className="flex gap-2 mb-4 bg-slate-200 p-1 rounded-xl">
                                <div className="flex-1 bg-white shadow-sm rounded-lg py-2 text-center text-xs font-bold text-slate-800">Menu</div>
                                <div className="flex-1 py-2 text-center text-xs font-bold text-slate-500">Buyurtma (3)</div>
                            </div>
                            
                            <div className="space-y-3">
                                {[
                                    {name: "Qozon Kabob", price: "45 000", emoji: "🍖"},
                                    {name: "Meva Assorti", price: "30 000", emoji: "🍎"},
                                    {name: "Choy", price: "5 000", emoji: "🍵"},
                                ].map((item, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex gap-3 items-center">
                                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl">{item.emoji}</div>
                                        <div className="flex-1">
                                            <div className="text-slate-800 font-bold text-sm leading-tight">{item.name}</div>
                                            <div className="text-amber-600 font-black text-xs">{item.price} UZS</div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                            <div className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center font-bold text-slate-400">-</div>
                                            <div className="text-xs font-bold text-slate-800 w-3 text-center">1</div>
                                            <div className="w-6 h-6 bg-amber-500 rounded shadow-sm flex items-center justify-center font-bold text-white">+</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between items-center mb-3">
                                <div className="text-slate-500 font-bold text-sm">Jami summa:</div>
                                <div className="text-slate-900 font-black text-lg">80 000 UZS</div>
                            </div>
                            <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-200 transition-colors">
                                Oshxonaga Yuborish
                            </button>
                        </div>
                    </div>
                </div>
            ),
            description: "Ofitsiantlar telefonidan turib to'g'ridan-to'g'ri buyurtma qabul qiladi. Qog'oz va ruchkadan voz kechib xizmat sifatini oshiring."
        },
        {
            id: "admin",
            title: "Rahbar Mobil Nazorati",
            icon: BarChart3,
            gradient: "from-emerald-500 to-teal-600",
            features: [
                "Dunyoning istalgan joyidan biznesni kuzatish",
                "Jonli holatda kassa tushumlari",
                "Xodimlar ish vaqtini nazorat qilish",
                "Muhim operatsiyalar bo'yicha bildirishnomalar"
            ],
            mockup: (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
                    <div className="w-[300px] h-[600px] bg-slate-50 rounded-[3rem] border-[10px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
                        
                        <div className="bg-slate-900 px-5 pt-12 pb-6 text-white relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl"></div>
                            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Bugungi Tushum</div>
                            <div className="text-3xl font-black mb-1">12,450<span className="text-lg text-emerald-400">.000</span></div>
                            <div className="flex gap-2 items-center">
                                <div className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">▲ +15%</div>
                                <div className="text-slate-400 text-[10px]">Keagiga nisbatan</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                <div className="text-slate-800 font-bold text-sm mb-4">Haftalik Savdo</div>
                                <div className="flex items-end justify-between h-24 gap-1">
                                    {[
                                        { day: "Du", h: "40%", val: "4m" },
                                        { day: "Se", h: "60%", val: "6m" },
                                        { day: "Ch", h: "45%", val: "4.5m" },
                                        { day: "Pa", h: "80%", val: "8m" },
                                        { day: "Ju", h: "100%", val: "12m", active: true },
                                        { day: "Sh", h: "70%", val: "7m" },
                                        { day: "Ya", h: "90%", val: "9m" }
                                    ].map((col, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1 w-full group cursor-pointer">
                                            <div className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{col.val}</div>
                                            <div className={`w-full rounded-sm transition-colors ${col.active ? 'bg-emerald-500 shadow-md shadow-emerald-200' : 'bg-slate-200 group-hover:bg-emerald-300'}`} style={{height: col.h}}></div>
                                            <div className={`text-[9px] font-bold ${col.active ? 'text-emerald-600' : 'text-slate-400'}`}>{col.day}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                                    <div className="text-red-500 font-bold text-lg mb-1">2,100k</div>
                                    <div className="text-slate-500 text-[10px] font-semibold">Xarajatlar</div>
                                </div>
                                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                                    <div className="text-blue-500 font-bold text-lg mb-1">145 ta</div>
                                    <div className="text-slate-500 text-[10px] font-semibold">Berilgan Cheklar</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                <div className="text-slate-800 font-bold text-sm mb-3">Top Tovarlar</div>
                                <div className="space-y-3">
                                    {[
                                        {name: "Palov", qty: "45 ta", per: "100%"},
                                        {name: "Shashlik", qty: "32 ta", per: "75%"},
                                        {name: "Choy", qty: "80 ta", per: "60%"}
                                    ].map((t, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                                <span>{t.name}</span>
                                                <span>{t.qty}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full rounded-full" style={{width: t.per}}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            description: "Biznesingiz har doim cho'ntagingizda. Qayerda bo'lishingizdan qat'iy nazar kassadagi pullarni jonli nazorat qiling."
        },
        {
            id: "inventory",
            title: "Mukammal Ombor Nazorati",
            icon: Package,
            gradient: "from-purple-500 to-fuchsia-600",
            features: [
                "Tovarlar kirimi, chiqimi va brak",
                "Kalkulyatsiya va yarim-tayyor mahsulotlar",
                "Qoldiqlar normasida ogohlantirish",
                "Tezkor inventorizatsiya"
            ],
            mockup: (
                <div className="w-full h-full bg-slate-50 flex flex-col p-6 relative overflow-hidden font-sans border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="text-slate-800 font-black text-2xl">Ombor Qoldiqlari</div>
                            <div className="text-slate-500 text-sm">Barcha xom-ashyo va tovarlar nazorati</div>
                        </div>
                        <div className="bg-purple-600 hover:bg-purple-700 cursor-pointer shadow-lg shadow-purple-200 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
                            <span>+</span> Kirim Qilish
                        </div>
                    </div>
                    
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
                            <div className="text-slate-500 text-sm font-bold mb-1">Ombordagi Umumiy Qiymat</div>
                            <div className="text-slate-900 font-black text-2xl">45,200,000 <span className="text-sm font-bold text-slate-400">UZS</span></div>
                        </div>
                        <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
                            <div className="text-slate-500 text-sm font-bold mb-1">Tugayotgan Mahsulotlar</div>
                            <div className="text-red-500 font-black text-2xl">12 <span className="text-sm font-bold">ta nomda</span></div>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="flex bg-slate-100 border-b border-slate-200 p-4 text-slate-600 text-xs font-bold uppercase tracking-wider">
                            <div className="flex-[2]">Maxsulot Nomi</div>
                            <div className="flex-1">Kategoriya</div>
                            <div className="flex-1 text-right">Qoldiq</div>
                            <div className="flex-1 text-right">O'rtacha Narx</div>
                            <div className="flex-1 text-center">Holat</div>
                        </div>
                        <div className="overflow-y-auto">
                            {[
                                {name: "Mol Go'shti (Laxm)", cat: "Go'sht mahsulotlari", q: "45.5 kg", p: "85,000", st: "Yaxshi", col: "text-green-600 bg-green-50"},
                                {name: "Kartoshka", cat: "Sabzavotlar", q: "5.2 kg", p: "4,500", st: "Tugamoqda", col: "text-red-600 bg-red-50"},
                                {name: "Un (Oliy Nav)", cat: "Baqqollik", q: "120 kg", p: "6,000", st: "Yaxshi", col: "text-green-600 bg-green-50"},
                                {name: "Qo'y Go'shti", cat: "Go'sht mahsulotlari", q: "12 kg", p: "90,000", st: "Yaxshi", col: "text-green-600 bg-green-50"},
                                {name: "Piyoz", cat: "Sabzavotlar", q: "0 kg", p: "3,000", st: "Tugagan", col: "text-red-600 bg-red-100 border border-red-200"},
                            ].map((item, i) => (
                                <div key={i} className="flex items-center border-b border-slate-100 p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex-[2] font-bold text-slate-800 text-sm">{item.name}</div>
                                    <div className="flex-1 text-slate-500 text-sm">{item.cat}</div>
                                    <div className="flex-1 text-right font-black text-slate-700 text-sm">{item.q}</div>
                                    <div className="flex-1 text-right text-slate-500 text-sm">{item.p}</div>
                                    <div className="flex-1 flex justify-center">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.col}`}>{item.st}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
            description: "Ombordagi har bir gramm mahsulot qat'iy nazorat ostida. Kamchiliklar va o'g'riliklarning oldini oling."
        },
        {
            id: "crm",
            title: "Xodimlar va CRM",
            icon: Users,
            gradient: "from-sky-500 to-blue-600",
            features: [
                "Ishga kelish-ketish (Tabel)",
                "Oylik va bonuslar (KPI)",
                "Mijozlar bazasi va sodiqlik",
                "Nasiyalar daftari"
            ],
            mockup: (
                <div className="w-full h-full bg-slate-50 flex flex-col p-6 relative overflow-hidden font-sans border border-slate-200">
                    <div className="flex gap-6 h-full">
                        <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="text-slate-800 font-black text-lg">Xodimlar Davomati (Tabel)</div>
                                <div className="text-slate-500 text-sm font-bold">Bugun: {new Date().toLocaleDateString('uz-UZ')}</div>
                            </div>
                            <div className="p-0 overflow-y-auto">
                                {[
                                    {name: "Aliyev Valijon", role: "Kassir", time: "08:00", st: "Ishda", col: "text-green-600 bg-green-100"},
                                    {name: "Qodirova Malika", role: "Ofitsiant", time: "08:15", st: "Ishda", col: "text-green-600 bg-green-100"},
                                    {name: "Toshmatov Jasur", role: "Omborchi", time: "-", st: "Kelmagan", col: "text-red-600 bg-red-100"},
                                    {name: "Rustamov Bek", role: "Ofitsiant", time: "09:00", st: "Kechikkan", col: "text-amber-600 bg-amber-100"},
                                ].map((xodim, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 border-b border-slate-100 hover:bg-slate-50">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                                                {xodim.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{xodim.name}</div>
                                                <div className="text-slate-500 text-xs font-medium">{xodim.role}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-slate-800 font-black text-sm mb-1">{xodim.time}</div>
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${xodim.col}`}>{xodim.st}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-6">
                            <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 shadow-lg shadow-blue-200 text-white flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute -right-5 -bottom-5 text-8xl opacity-10">👥</div>
                                <div className="text-blue-100 font-bold text-sm mb-1">Faol Mijozlar Bazasi</div>
                                <div className="font-black text-4xl mb-2">1,240 <span className="text-lg font-medium">ta</span></div>
                                <div className="text-sm bg-black/10 w-fit px-3 py-1 rounded-lg">+45 ta bu oy</div>
                            </div>
                            
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <div className="text-slate-500 font-bold text-sm">Umumiy Nasiyalar</div>
                                </div>
                                <div className="text-red-500 font-black text-3xl mb-3">24,500,000</div>
                                <div className="text-xs text-slate-400 font-medium">12 ta mijozdan qarz olinishi kutilmoqda.</div>
                                <button className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-sm transition-colors">
                                    Qarzdorlarni Ko'rish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            description: "Xodimlar unumdorligini oshiring, oyliklarni adolatli hisoblang va sodiq mijozlar tarmog'ini yarating."
        }
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#f8fafc] rounded-[2rem] shadow-2xl w-full max-w-[1250px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-white border-b border-slate-200/60 px-6 py-6 flex items-center justify-between relative overflow-hidden shrink-0">
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-60"></div>
                    <div className="relative z-10 flex gap-4 items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Layers className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-0.5">SMART Tizim Imkoniyatlari</h2>
                            <p className="text-slate-500 text-xs font-medium">Barcha jarayonlarni bitta dastur orqali boshqaring</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors z-20">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50">
                    {/* Left: Modules List Tabs */}
                    <div className="lg:w-[40%] bg-white border-r border-slate-200/60 p-4 lg:p-6 overflow-y-auto space-y-3">
                        {modules.map((mod, index) => {
                            const isActive = activeTab === index;
                            return (
                                <div 
                                    key={mod.id} 
                                    onClick={() => setActiveTab(index)}
                                    className={`cursor-pointer rounded-2xl p-4 transition-all duration-300 border-2 ${isActive ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${isActive ? `bg-gradient-to-br ${mod.gradient} text-white shadow-lg` : 'bg-slate-100 text-slate-500'}`}>
                                            <mod.icon size={22} />
                                        </div>
                                        <div>
                                            <h3 className={`text-sm font-bold mb-1 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>{mod.title}</h3>
                                            {isActive ? (
                                                <div className="text-xs text-slate-500 font-medium animate-in slide-in-from-top-1 duration-300">
                                                    {mod.description}
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-slate-400 font-medium">Batafsil ko'rish &rarr;</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Features list (only visible when active) */}
                                    {isActive && (
                                        <div className="mt-4 pt-4 border-t border-blue-100/50">
                                            <ul className="space-y-2">
                                                {mod.features.map((feat, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-semibold animate-in slide-in-from-left-2" style={{animationDelay: `${i*50}ms`}}>
                                                        <CheckCircle2 size={14} className={`${isActive ? 'text-blue-500' : 'text-slate-300'} shrink-0 mt-0.5`} />
                                                        <span>{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Dynamic Image / Mockup Guide */}
                    <div className="lg:w-[60%] p-4 lg:p-8 flex items-center justify-center bg-slate-900 relative overflow-hidden">
                        {/* Background glowing effects */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full blur-[120px] opacity-20 bg-gradient-to-r ${modules[activeTab].gradient} transition-colors duration-700`} />
                        
                        <div className="w-full h-full max-h-[600px] bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500 flex items-center justify-center">
                            {modules[activeTab].mockup}
                            
                            {/* Overlay Tag */}
                            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-white/90 text-xs font-bold tracking-wide shadow-xl">
                                {modules[activeTab].title} Ko'rinishi
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function LoginForm() {
    const shopType: ShopType = "smart";

    const [phone, setPhone] = useState(PHONE_PREFIX);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [requireShopCode, setRequireShopCode] = useState(false);
    const [shopCode, setShopCode] = useState("");
    const [mounted, setMounted] = useState(false);
    const [showOferta, setShowOferta] = useState(false);
    const [showFeatures, setShowFeatures] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginModeState, setLoginModeState] = useState<"admin" | "staff">("admin");
    const [staffUsername, setStaffUsername] = useState("");
    const router = useRouter();
    const { isAuthenticated, setUser, user, _hasHydrated } = useFrontendStore();

    const searchParams = useSearchParams();
    const isAdminMode = searchParams.get("mode") === "admin";

    useEffect(() => {
        setMounted(true);
        // Wait until Zustand has loaded persisted state from localStorage.
        // Without this guard the effect can fire with isAuthenticated=false
        // (the default) before hydration, showing the oferta or setting up
        // the agreement state prematurely, then firing again once the real
        // value is loaded — causing redirect conflicts and visual flicker.
        if (!_hasHydrated) return;

        if (isAuthenticated) {
            router.replace("/smart");
            return;
        }
        // ?mode=admin parametri bo'lsa kassir sessionni e'tiborsiz qoldirish
        // (Admin bat fayli ochganda kassir sessiyasi interferensiya qilmasin)
        if (!isAdminMode) {
            const session = useStore.getState().kassirSession;
            if (session) {
                // Rolga qarab to'g'ri sahifaga yo'naltirish
                const role = (session as any).role;
                if (role === "Ofitsiant") { router.replace("/mobile/waiter"); return; }
                if (role === "Kuryer") { router.replace("/mobile/courier"); return; }
                if (role === "Zavsklad" || role === "Omborchi") { router.replace("/mobile/inventory"); return; }
                router.replace("/smart-pos");
                return;
            }
        }
        // Show oferta on first visit
        const ofertaAgreed = localStorage.getItem("ubt_oferta_agreed");
        if (!ofertaAgreed) {
            setShowOferta(true);
        } else {
            setAgreed(true);
        }
    }, [isAuthenticated, user, router, _hasHydrated, isAdminMode]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!val.startsWith(PHONE_PREFIX)) {
            setPhone(PHONE_PREFIX);
        } else {
            setPhone(val);
        }
    };

    const handleOfertaAccept = () => {
        localStorage.setItem("ubt_oferta_agreed", "1");
        setAgreed(true);
        setShowOferta(false);
    };

    if (!mounted || !_hasHydrated || isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Xodimlar uchun oferta tekshiruvi shart emas
        if (!agreed && loginModeState !== "staff") {
            setError("Iltimos, oferta shartlarini qabul qiling");
            setShowOferta(true);
            return;
        }

        if (loginModeState === "staff") {
            const val = staffUsername.trim();
            if (!val || !password) {
                setError("Iltimos, Xodim Logini va parolni kiriting");
                return;
            }
            setIsLoading(true);
            try {
                const res = await fetch("/api/kassir/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: val, password }),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error || "Login yoki parol xato"); return; }
                const staffData = { ...data.session.user, token: data.session.token, shopCode: data.shopCode, shopType: data.shopType };
                useStore.getState().setDeviceSession(staffData);

                // Agar Manablog (Kassa apparati) kiritilgan bo'lsa, xodim tanlash pini so'raladi
                if (staffData.role === "Manablog" || staffData.role === "Apparat" || staffData.name?.toLowerCase().includes("apparat")) {
                    router.push("/kassa/login");
                } else {
                    // Shaxsiy xodim login bo'lsa, to'g'ridan-to'g'ri o'z ish stoliga kiradi
                    useStore.getState().setKassirSession(staffData);

                    if (staffData.role === "Ofitsiant") {
                        router.push("/mobile/waiter");
                    } else if (staffData.role === "Kuryer") {
                        router.push("/mobile/courier");
                    } else if (staffData.role === "Zavsklad" || staffData.role === "Omborchi") {
                        router.push("/mobile/inventory");
                    } else {
                        router.push("/smart-pos"); // Default kassir
                    }
                }
            } catch {
                setError("Tizimga ulanishda xatolik yuz berdi");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Admin login
        const phoneVal = phone.trim();
        if (!phoneVal || phoneVal === PHONE_PREFIX.trim() || !password) {
            setError("Iltimos, telefon raqam va parolni kiriting");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: phoneVal, password, shopCode: shopCode.trim() }),
            });

            const data = await res.json();

            if (data.requireShopCode) {
                setRequireShopCode(true);
                setError(data.error);
                return;
            }

            if (res.ok && data.success) {
                if (data.isSuperAdmin) {
                    useSuperAdminStore.getState().login(data.user);
                    if (data.user?.role === "Agent") router.push("/agent-portal");
                    else if (data.user?.role === "Texnik Yordam") router.push("/support-portal");
                    else if (data.user?.role === "Moliyachi") router.push("/finance-portal");
                    else router.push("/super-admin");
                    return;
                }
                localStorage.setItem("smart-active-shop", data.tenant?.id || phoneVal);
                useStore.getState().clearTenantData();
                setUser({ id: data.tenant?.id || phoneVal, name: data.tenant?.shopName || phoneVal, role: "ADMIN", tenant: data.tenant, expiresAt: data.expiresAt });
                router.push("/smart");
            } else {
                setError(data.error || "Login yoki parol noto'g'ri");
            }
        } catch {
            setError("Tizimga ulanishda xatolik yuz berdi");
        } finally {
            setIsLoading(false);
        }
    };

    const currentType = UBT_TYPE;

    const features = [
        { icon: BarChart3, label: "Moliyaviy hisobotlar", desc: "Real vaqtda tahlil va statistika" },
        { icon: Package, label: "Ombor nazorati", desc: "Mahsulot va zaxira boshqaruvi" },
        { icon: Users, label: "CRM tizimi", desc: "Mijozlar bazasini boshqaring" },
        { icon: Zap, label: "Kassa tizimi", desc: "Tezkor va qulay savdo uchun" },
    ];

    return (
        <>
            {showOferta && (
                <OfertaModal
                    onAccept={handleOfertaAccept}
                    onClose={agreed ? () => setShowOferta(false) : undefined}
                />
            )}
            {showFeatures && <FeaturesModal onClose={() => setShowFeatures(false)} />}
            {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}

            <div className="h-screen flex bg-slate-50 overflow-hidden relative">

                {/* ── LEFT PANEL – Branding ── */}
                <div className={`hidden lg:flex flex-col justify-between w-[52%] bg-gradient-to-br ${gradient} px-12 py-8 relative overflow-hidden transition-all duration-500`}>

                    {/* Background pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.08]"
                        style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                            backgroundSize: "32px 32px",
                        }}
                    />
                    <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-60px] left-[-60px] w-[350px] h-[350px] bg-white/10 rounded-full blur-[80px]" />

                    {/* Logo */}
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="h-12 bg-white rounded-xl shadow-xl px-4 py-2 flex items-center justify-center">
                            <img src="/smart-logo.svg" alt="SMART" className="h-full w-auto object-contain" />
                        </div>
                        <div>
                            <p className="text-white/80 text-[11px] font-bold tracking-widest uppercase leading-none mt-1">Enterprise Point of Sale</p>
                        </div>
                    </div>

                    {/* Center content */}
                    <div className="flex-1 flex flex-col justify-center relative z-10 max-w-lg">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-6 shadow-2xl">
                            <currentType.icon size={32} className="text-white" />
                        </div>
                        
                        <h2 className="text-5xl font-black text-white leading-[1.1] mb-6" style={{ letterSpacing: "-0.02em" }}>
                            Kelajak<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
                                Biznesi Uchun
                            </span>
                        </h2>

                        <p className="text-blue-100/80 text-lg leading-relaxed font-medium mb-10">
                            Savdo, ombor va xodimlarni boshqarish uchun zamonaviy, tezkor va ishonchli yagona platforma.
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowFeatures(true)}
                            className="group flex items-center justify-between w-fit gap-6 bg-white hover:bg-blue-50 transition-all duration-300 text-blue-900 px-6 py-4 rounded-2xl font-bold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-1"
                        >
                            <span className="flex items-center gap-3">
                                <Sparkles size={20} className="text-blue-600 group-hover:animate-pulse" />
                                Tizim Imkoniyatlari bilan Tanishing
                            </span>
                            <ArrowRight size={18} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Bottom stats */}
                    <div className="flex items-end justify-start gap-12 relative z-10 w-full mt-auto pt-6 border-t border-white/10">
                        {[
                            { value: "500+", label: "Faol do'konlar" },
                            { value: "99.9%", label: "Uptime" },
                            { value: "24/7", label: "Qo'llab-quvvatlash" },
                        ].map((s) => (
                            <div key={s.label}>
                                <p className="text-2xl font-black text-white mb-1">{s.value}</p>
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-200/70">{s.label}</p>
                            </div>
                        ))}
                    </div>

                </div>

                {/* ── RIGHT PANEL – Login Form ── */}
                <div className="flex-1 flex items-center justify-center px-5 py-4 bg-slate-50 overflow-y-auto">
                    <div className="w-full max-w-[400px] my-auto">

                        {/* Mobile logo */}
                        <div className="flex justify-center mb-6 lg:hidden">
                            <div className="bg-white rounded-xl shadow-lg px-4 py-2">
                                <img src="/smart-logo.svg" alt="SMART" className="h-8 w-auto object-contain" />
                            </div>
                        </div>

                        {/* Card */}
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-100 overflow-hidden">

                            {/* Top accent bar */}
                            <div className={`h-1 bg-gradient-to-r ${accent} transition-all duration-500`} />

                            <div className="p-5">
                                {/* Header */}
                                <div className="mb-6 text-center">
                                    <img src="/smart-logo.svg" alt="SMART" className="h-8 w-auto mx-auto mb-4 drop-shadow-sm" />
                                    <h1 className="text-lg font-bold text-slate-900" style={{ letterSpacing: "-0.01em" }}>
                                        Xush kelibsiz
                                    </h1>
                                    <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-[280px] mx-auto hidden sm:block">
                                        Savdo, ombor va moliyaviy hisobotlarni yuritish uchun eng qulay va xavfsiz tizim.
                                    </p>
                                    <div className="flex items-center justify-center gap-1.5 mt-3 bg-emerald-50 text-emerald-600 rounded-lg py-1.5 px-3 mx-auto w-fit border border-emerald-100">
                                        <ShieldCheck size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">SSL bilan himoyalangan</span>
                                    </div>
                                </div>

                                {/* ── UBT badge ── */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border-2 border-blue-500 bg-blue-50">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-600 text-white">
                                            <UtensilsCrossed size={14} />
                                        </div>
                                        <span className="text-sm font-bold text-blue-700">SMART — Restoran / Mehmonxona / Kafe</span>
                                    </div>
                                </div>

                                {/* ── TABS ── */}
                                <div className="mb-5 flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                                    <button type="button" onClick={() => setLoginModeState("admin")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${loginModeState === "admin" ? "bg-white text-blue-700 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}>
                                        <ShieldCheck size={14} /> Admin Panel
                                    </button>
                                    <button type="button" onClick={() => setLoginModeState("staff")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${loginModeState === "staff" ? "bg-white text-blue-700 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}>
                                        <Users size={14} /> Xodimlar
                                    </button>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                                        <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-red-500 text-[10px] font-bold">!</span>
                                        </div>
                                        <p className="text-red-600 text-xs">{error}</p>
                                    </div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleLogin} className="space-y-3">
                                    {/* ── ADMIN: phone field ── */}
                                    {loginModeState === "admin" && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                Telefon raqam (Login)
                                            </label>
                                            <div className="relative">
                                                <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    id="login-phone"
                                                    type="text"
                                                    value={phone}
                                                    onChange={handlePhoneChange}
                                                    onFocus={(e) => {
                                                        if (!e.target.value.startsWith(PHONE_PREFIX)) {
                                                            setPhone(PHONE_PREFIX);
                                                        }
                                                    }}
                                                    autoComplete="tel"
                                                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 placeholder-slate-400 transition-all duration-200 outline-none hover:border-slate-300 focus:ring-2 ${focusClass}`}
                                                    placeholder="+998 90 123 45 67"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── STAFF: username field ── */}
                                    {loginModeState === "staff" && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                Xodim Logini <span className="lowercase text-[10px] normal-case">(Ism, raqam yoki @login)</span>
                                            </label>
                                            <div className="relative">
                                                <User size={14} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    id="staff-username"
                                                    type="text"
                                                    value={staffUsername}
                                                    onChange={(e) => setStaffUsername(e.target.value)}
                                                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 placeholder-slate-400 transition-all duration-200 outline-none hover:border-slate-300 focus:ring-2 ${focusClass}`}
                                                    placeholder="Masalan: eldorbek yoki 901234567"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Password */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            Parol
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="login-password"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                autoComplete="current-password"
                                                className={`w-full px-3 py-2.5 pr-10 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 placeholder-slate-400 transition-all duration-200 outline-none hover:border-slate-300 focus:ring-2 ${focusClass}`}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        <div className="mt-1.5 flex justify-end">
                                            {loginModeState === "admin" && (
                                            <button
                                                type="button"
                                                onClick={() => setShowForgotPassword(true)}
                                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                Parolni unutdingizmi?
                                            </button>
                                            )}
                                        </div>
                                    </div>

                                    {requireShopCode && (
                                        <div className="mb-3">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                Filial Kodi (Shop Code)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="shop-code"
                                                    type="text"
                                                    value={shopCode}
                                                    onChange={(e) => setShopCode(e.target.value)}
                                                    className={`w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200 placeholder-slate-400 transition-all duration-200 outline-none hover:border-slate-300 focus:ring-2 ${focusClass}`}
                                                    placeholder="Masalan: SHOP123"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit */}
                                    <button
                                        id="login-submit-btn"
                                        type="submit"
                                        disabled={isLoading || (loginModeState === "admin" && !agreed)}
                                        className={`w-full relative overflow-hidden rounded-xl py-3 text-sm font-bold text-white active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg group ${btnClass}`}
                                    >
                                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12" />
                                        {isLoading ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                <span>Kirilmoqda...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2">
                                                {loginModeState === "admin" ? <currentType.icon size={15} /> : <Users size={15} />}
                                                <span>{loginModeState === "admin" ? `${currentType.label} Admin sifatida kirish` : "Xodim sifatida kirish"}</span>
                                                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                                            </div>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Oferta shartlari */}
                        <div className="mt-3">

                            <div
                                onClick={() => {
                                    if (!agreed) {
                                        setShowOferta(true);
                                    } else {
                                        setShowOferta(true);
                                    }
                                }}
                                className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl border transition-all duration-200 select-none
                                    ${agreed
                                        ? "bg-green-50 border-green-200"
                                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                                    }`}
                            >
                                {/* Custom checkbox */}
                                <div className="flex-shrink-0 mt-0.5">
                                    <div
                                        className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all duration-200
                                            ${agreed
                                                ? "bg-green-500 border-green-500"
                                                : "border-slate-300 bg-white"
                                            }`}
                                    >
                                        {agreed && (
                                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                </div>

                                <p className={`text-xs leading-relaxed ${agreed ? "text-green-800" : "text-slate-600"}`}>
                                    Men{" "}
                                    <span className="font-semibold underline hover:text-slate-900 transition-colors">
                                        Oferta shartlariga
                                    </span>{" "}
                                    roziman. Shartlarda ma&#39;lumotlarim qayta ishlanishiga ruxsat beraman.
                                    {!agreed && (
                                        <span className="text-blue-600 font-semibold"> (O&apos;qish uchun bosing)</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-slate-400 text-[11px] mt-4">
                            &copy; {new Date().getFullYear()} SMART. Barcha huquqlar himoyalangan.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
