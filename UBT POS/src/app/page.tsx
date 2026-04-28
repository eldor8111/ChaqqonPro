"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Zap, BarChart3, Users, Package, Phone, UtensilsCrossed, X, CheckCircle2, User, Sparkles, Layers, Laptop, Database } from "lucide-react";
import { useFrontendStore } from "@/lib/frontend/store";
import { useStore } from "@/lib/store";
import { ForgotPasswordModal } from "@/components/auth/ForgotPassword";

type ShopType = "ubt";

const UBT_TYPE = {
    value: "ubt" as ShopType,
    label: "ChaqqonPro",
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
                        <p className="text-xs text-slate-500 mt-0.5">ChaqqonPro tizimidan foydalanish uchun quyidagi shartlarni o&#39;qing</p>
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
                        Ushbu oferta ChaqqonPro dasturiy ta&#39;minotidan foydalanuvchi bilan tuzilgan ommaviy shartnoma hisoblanadi.
                        Tizimga kirib, siz quyidagi barcha shartlarga rozilik bildirasiz.
                    </div>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">1. Umumiy qoidalar</h3>
                        <p>ChaqqonPro — bu &quot;e-code technology&quot; tomonidan ishlab chiqilgan savdo, ombor va moliyaviy hisobotlarni boshqarish uchun mo&#39;ljallangan bulut asosidagi dasturiy tizimdir. Ushbu oferta foydalanuvchi (Administrator, Kassir yoki boshqa rol egasi) bilan &quot;e-code technology&quot; o&#39;rtasidagi huquqiy munosabatlarni tartibga soladi.</p>
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
                        3.2. "ChaqqonPro" serverlarida saqlangan ma&#39;lumotlar shifrlangan holda saqlanadi.<br />
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
                        <p>6.1. ChaqqonPro tizimidan foydalanish obuna asosida amalga oshiriladi.<br />
                        6.2. Tariflar alohida shartnomada yoki tizim boshqaruv panelida ko&#39;rsatiladi.<br />
                        6.3. To&#39;lov muddati o&#39;tganda tizimga kirish cheklanishi mumkin.<br />
                        6.4. Hisob-faktura oyning 1-kuniga qadar taqdim etiladi.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">7. Mas&#39;uliyat chegarasi</h3>
                        <p>7.1. "ChaqqonPro" foydalanuvchi tomonidan noto&#39;g&#39;ri kiritilgan ma&#39;lumotlar uchun mas&#39;uliyat olmaydi.<br />
                        7.2. Internet uzilib qolishi yoki kuch ta&#39;minotidagi uzilishlar sababli yuzaga kelgan yo&#39;qotishlar uchun mas&#39;uliyat yuklatilmaydi.<br />
                        7.3. Tizim texnik xizmatlari vaqtida (maintenance) ma&#39;lumotlarga kirish muvaqqat cheklanishi mumkin.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">8. Texnik yordam</h3>
                        <p>8.1. Texnik yordam 24/7 rejimida ko&#39;rsatiladi.<br />
                        8.2. Murojaat uchun: <span className="font-semibold text-slate-900">+998 77 293 10 14</span> yoki <span className="font-semibold text-slate-900">support@chaqqonpro.uz</span><br />
                        8.3. Barcha muammolar tezkor va sifatli hal etiladi.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">9. Shartnomani bekor qilish</h3>
                        <p>9.1. Foydalanuvchi istalgan vaqtda tizimdan chiqish va ma&#39;lumotlarini o&#39;chirish talebini yuborishi mumkin.<br />
                        9.2. &quot;ChaqqonPro&quot; oferta shartlari buzilganda foydalanuvchi hisobini bloklash huquqini saqlaydi.<br />
                        9.3. Obuna bekor qilinganda ma&#39;lumotlar 30 kun davomida arxivda saqlanadi.<br />
                        9.4. Shartnoma bir tomonlama bekor qilinganda tizim uchun qilingan xarajatlar qaytarib berilmaydi.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-1">10. Yakuniy qoidalar</h3>
                        <p>10.1. Ushbu oferta O&#39;zbekiston Respublikasi qonunchiligiga asosida tuzilgan.<br />
                        10.2. Nizolar da&#39;vo tartibida hal etiladi.<br />
                        10.3. "ChaqqonPro" oferta shartlarini oldindan xabardor qilgan holda o&#39;zgartirish huquqini saqlaydi.<br />
                        10.4. Oferta ro&#39;yxatdan o&#39;tilgan kundan boshlab kuchga kiradi.</p>
                        <p className="mt-2 text-xs text-slate-400">So&#39;nggi yangilanish: 2025-yil, 1-mart. "ChaqqonPro" &copy; 2025.</p>
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
    const modules = [
        {
            id: "pos",
            title: "Super Tezkor Kassa (POS)",
            icon: Zap,
            gradient: "from-blue-500 to-indigo-600",
            features: [
                "1 soniyadagi tezkor savdo oynasi",
                "Internet uzilganda ham oflayn ishlash qobiliyati",
                "Murakkab chegirmalar, sodiqlik va keshbeklar",
                "Oshxona/Bar uchun to'g'ridan-to'g'ri chek chiqarish",
                "Mijoz navbatlarini kutishni 3 barobar qisqartirish"
            ]
        },
        {
            id: "inventory",
            title: "Mukammal Ombor Nazorati",
            icon: Package,
            gradient: "from-amber-500 to-orange-600",
            features: [
                "Tovarlar kirimi, chiqimi va brak (spisaniya)",
                "Xom-ashyolar va yarim-tayyor mahsulotlar kalkulyatsiyasi",
                "Qoldiqlar kritik normaga tushganda avto-ogohlantirish",
                "Omborlar o'rtasida tovar ko'chirish tarixi",
                "Telefon orqali tezkor inventorizatsiya o'tkazish"
            ]
        },
        {
            id: "finance",
            title: "Aqlli Moliyaviy Tahlil",
            icon: BarChart3,
            gradient: "from-emerald-500 to-teal-600",
            features: [
                "Sof foyda va zararlar (P&L) ning aniq hisoboti",
                "Haqiqiy vaqt rejimida biznes rentabellik tahlili",
                "Statya bo'yicha barcha xarajatlarni tizimli nazorat qilish",
                "Kassaga pullar kelishi va ketishi (Cash Flow)",
                "Eng ko'p foyda keltirayotgan tovarlar statistikasi"
            ]
        },
        {
            id: "crm",
            title: "Xodimlar va CRM tizimi",
            icon: Users,
            gradient: "from-purple-500 to-fuchsia-600",
            features: [
                "Xodimlarning oylik, avans va KPI-bonuslarini avtomatik hisoblash",
                "Ishga kelish va ketishni nazorat qilish (Tabel)",
                "Mijozlarni VIP, Oltin yoki Qora ro'yxatlarga ajratish",
                "Mijozlarning xaridlar tarixi va qarz daftari (Nasiya)",
                "Xodimlarning tizimdagi huquq va ruxsatlarini chegaralash"
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#f8fafc] rounded-[2rem] shadow-2xl w-full max-w-[1250px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                
                {/* Header Qo'ismi */}
                <div className="bg-white border-b border-slate-200/60 px-8 py-8 md:py-10 flex items-center justify-between relative overflow-hidden shrink-0">
                    {/* Orqa fon effektlari */}
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-60"></div>
                    <div className="absolute top-10 left-10 w-20 h-20 bg-indigo-100 rounded-full blur-[40px] opacity-60"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                            <Layers className="text-white" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-2">
                                ChaqqonPro Tizim Imkoniyatlari
                            </h2>
                            <p className="text-slate-500 text-sm md:text-base max-w-3xl font-medium leading-relaxed">
                                Bitta tizimda birlashtirilgan kuchli modullar o'zaro avtomatik bog'langan holda, biznesingizdagi tayyor pul va mahsulotni yo'qotishlarsiz 100% nazorat qilishga yordam beradi.
                            </p>
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2.5 rounded-full transition-colors z-20">
                        <X size={24} />
                    </button>
                    <button onClick={onClose} className="md:hidden absolute top-4 right-4 bg-slate-100 text-slate-500 p-2 rounded-full z-20">
                        <X size={18} />
                    </button>
                </div>

                {/* Grid Qo'ismi */}
                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-12 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {modules.map((mod) => (
                            <div key={mod.id} className="group relative bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col h-full overflow-hidden">
                                
                                {/* Gradient Chiziq Tepada */}
                                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${mod.gradient}`}></div>
                                
                                {/* Ikonka va Sarlavha */}
                                <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center bg-gradient-to-br ${mod.gradient} text-white mb-6 shadow-lg shadow-slate-200 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                                    <mod.icon size={26} />
                                </div>
                                
                                <h3 className="text-lg font-extrabold text-slate-800 mb-4 leading-tight group-hover:text-slate-900">{mod.title}</h3>
                                
                                {/* Ro'yxat */}
                                <ul className="space-y-3.5 mt-2 flex-1 relative z-10">
                                    {mod.features.map((feat, i) => (
                                        <li key={i} className="flex items-start gap-2.5">
                                            <div className="mt-0.5 flex-shrink-0">
                                                <CheckCircle2 size={16} className={`text-slate-300 group-hover:text-slate-600 transition-colors duration-300`} />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-500 leading-snug group-hover:text-slate-700 transition-colors">{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                                
                                {/* Tag yozuvi */}
                                <div className="mt-8 pt-4 border-t border-slate-50 w-full relative z-10">
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-3 py-1.5 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors uppercase tracking-wider">
                                        Asosiy Modul
                                    </span>
                                </div>
                                
                                {/* Orqa fon suv osti logotip */}
                                <div className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] transform group-hover:scale-150 transition-transform duration-700 pointer-events-none">
                                    <mod.icon size={180} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border-t border-slate-200 px-8 py-5 shrink-0 flex justify-end md:hidden">
                    <button onClick={onClose} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">
                        Yopish
                    </button>
                </div>
            </div>
        </div>
    );
}

function LoginForm() {
    const shopType: ShopType = "ubt";

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
            router.replace("/ubt");
            return;
        }
        // ?mode=admin parametri bo'lsa kassir sessionni e'tiborsiz qoldirish
        // (Admin bat fayli ochganda kassir sessiyasi interferensiya qilmasin)
        if (!isAdminMode) {
            const session = useStore.getState().kassirSession;
            if (session) {
                router.replace("/ubt-pos");
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

        if (!agreed) {
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
                        router.push("/ubt-pos"); // Default kassir
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
                    router.push("/super-admin");
                    return;
                }
                localStorage.setItem("ubt-active-shop", data.tenant?.id || phoneVal);
                useStore.getState().clearTenantData();
                setUser({ id: data.tenant?.id || phoneVal, name: data.tenant?.shopName || phoneVal, role: "ADMIN", tenant: data.tenant, expiresAt: data.expiresAt });
                router.push("/ubt");
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
                            <img src="/chaqqon-logo-transparent.svg" alt="ChaqqonPro" className="h-full w-auto object-contain" />
                        </div>
                        <div>
                            <p className="text-white/80 text-[11px] font-bold tracking-widest uppercase leading-none mt-1">Enterprise Point of Sale</p>
                        </div>
                    </div>

                    {/* Center content */}
                    <div className="flex-1 flex flex-col justify-center relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 w-fit mb-4">
                            <ShieldCheck size={12} className="text-white/70" />
                            <span className="text-white/90 text-xs font-semibold tracking-wide">Professional Point Of Sale System</span>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <currentType.icon size={18} className="text-white" />
                            </div>
                            <span className="text-white/80 text-base font-bold">{currentType.label} Admin Paneli</span>
                        </div>

                        <h2 className="text-4xl font-black text-white leading-[1.12] mb-3" style={{ letterSpacing: "-0.02em" }}>
                            Biznesingizni<br />
                            <span className="text-white/70">yangi bosqichga</span><br />
                            olib chiqing
                        </h2>

                        <p className="text-white/70 text-sm leading-relaxed max-w-sm mb-6">
                            ChaqqonPro — savdo, ombor, moliya va xodimlarni boshqarish uchun yagona kuchli platforma.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                            {features.map((f) => (
                                <div key={f.label} className="flex items-start gap-2.5 bg-white/10 rounded-xl p-3 border border-white/15 backdrop-blur-sm">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <f.icon size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-xs leading-tight">{f.label}</p>
                                        <p className="text-white/60 text-[11px] mt-0.5 leading-tight">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom stats and Action */}
                    <div className="flex items-end justify-between relative z-10 w-full mt-auto pt-6">
                        <div className="flex gap-6">
                            {[
                                { value: "500+", label: "Faol do'konlar" },
                                { value: "99.9%", label: "Uptime" },
                                { value: "24/7", label: "Qo'llab-quvvatlash" },
                            ].map((s) => (
                                <div key={s.label}>
                                    <p className="text-xl font-black text-white">{s.value}</p>
                                    <p className="text-[11px] text-white/50 mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowFeatures(true)}
                            className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all duration-300 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg"
                        >
                            <Sparkles size={16} className="text-blue-300 group-hover:animate-pulse" />
                            Tizim Imkoniyatlari
                        </button>
                    </div>
                </div>

                {/* ── RIGHT PANEL – Login Form ── */}
                <div className="flex-1 flex items-center justify-center px-5 py-4 bg-slate-50 overflow-y-auto">
                    <div className="w-full max-w-[400px] my-auto">

                        {/* Mobile logo */}
                        <div className="flex justify-center mb-6 lg:hidden">
                            <div className="bg-white rounded-xl shadow-lg px-4 py-2">
                                <img src="/chaqqon-logo-transparent.svg" alt="ChaqqonPro" className="h-8 w-auto object-contain" />
                            </div>
                        </div>

                        {/* Card */}
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-100 overflow-hidden">

                            {/* Top accent bar */}
                            <div className={`h-1 bg-gradient-to-r ${accent} transition-all duration-500`} />

                            <div className="p-5">
                                {/* Header */}
                                <div className="mb-6 text-center">
                                    <img src="/chaqqon-logo-transparent.svg" alt="ChaqqonPro" className="h-8 w-auto mx-auto mb-4 drop-shadow-sm" />
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
                                        <span className="text-sm font-bold text-blue-700">ChaqqonPro — Restoran / Mehmonxona / Kafe</span>
                                    </div>
                                </div>

                                {/* ── TABS ── */}
                                <div className="mb-5 flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                                    <button type="button" onClick={() => setLoginModeState("admin")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${loginModeState === "admin" ? "bg-white text-blue-700 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}>
                                        <ShieldCheck size={14} /> Admin Panel
                                    </button>
                                    <button type="button" onClick={() => router.push("/login/staff")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-200/50`}>
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
                                            <button 
                                                type="button" 
                                                onClick={() => setShowForgotPassword(true)}
                                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                Parolni unutdingizmi?
                                            </button>
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
                                        disabled={isLoading || !agreed}
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
                            &copy; {new Date().getFullYear()} ChaqqonPro. Barcha huquqlar himoyalangan.
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
