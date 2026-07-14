"use client";
/**
 * LockScreensaver — qulf bosilganda chiqadigan reklama ekrani
 * Tizim imkoniyatlarini aylanma slaydlarda ko'rsatadi.
 * Ekranga 2 marta tegilganda (double-tap) onUnlock chaqiriladi.
 */
import { useEffect, useRef, useState } from "react";
import {
    UtensilsCrossed, Zap, BarChart3, Boxes, ShieldCheck, Printer, Hand, Image as ImageIcon, X
} from "lucide-react";

const BG_IMAGES = [
    { id: "default", url: "", name: "Qop-qora" },
    { id: "bg1", url: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1920&auto=format&fit=crop", name: "Restoran 1" },
    { id: "bg2", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1920&auto=format&fit=crop", name: "Restoran 2" },
    { id: "bg3", url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1920&auto=format&fit=crop", name: "Oshxona" },
    { id: "bg4", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1920&auto=format&fit=crop", name: "Taom" },
    { id: "bg5", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop", name: "Abstrakt" },
];

const SLIDES = [
    {
        icon: UtensilsCrossed,
        title: "Restoran va Kafe uchun",
        desc: "Zamonaviy savdo tizimi — stollar, ofitsiantlar va oshxona bitta tizimda",
        grad: "from-sky-400 to-blue-600",
        glow: "#38bdf8",
    },
    {
        icon: Zap,
        title: "Tezkor buyurtma",
        desc: "Bir necha soniyada buyurtma qabul qiling va chek chiqaring",
        grad: "from-amber-400 to-orange-600",
        glow: "#fbbf24",
    },
    {
        icon: Printer,
        title: "Aqlli print tizimi",
        desc: "Kassa, oshxona va bar printerlariga avtomatik yo'naltirish",
        grad: "from-emerald-400 to-teal-600",
        glow: "#34d399",
    },
    {
        icon: Boxes,
        title: "Ombor nazorati",
        desc: "Xomashyo, kirim-chiqim va inventarizatsiya — hammasi nazoratda",
        grad: "from-purple-400 to-fuchsia-600",
        glow: "#c084fc",
    },
    {
        icon: BarChart3,
        title: "Hisobotlar va analitika",
        desc: "Savdo, foyda va xodimlar samaradorligi real vaqtda",
        grad: "from-rose-400 to-red-600",
        glow: "#fb7185",
    },
    {
        icon: ShieldCheck,
        title: "Xavfsiz va ishonchli",
        desc: "Internet uzilsa ham ishlaydi — ma'lumotlaringiz doim himoyada",
        grad: "from-cyan-400 to-sky-600",
        glow: "#22d3ee",
    },
];

export default function LockScreensaver({ onUnlock }: { onUnlock: () => void }) {
    const [slide, setSlide] = useState(0);
    const [now, setNow] = useState(() => new Date());
    const lastTapRef = useRef(0);
    const [bgImage, setBgImage] = useState("");
    const [showBgMenu, setShowBgMenu] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("eviko_screensaver_bg");
        if (saved) setBgImage(saved);
    }, []);

    const changeBg = (url: string) => {
        setBgImage(url);
        localStorage.setItem("eviko_screensaver_bg", url);
        setShowBgMenu(false);
    };

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        const s = setInterval(() => setSlide((v) => (v + 1) % SLIDES.length), 5000);
        return () => { clearInterval(t); clearInterval(s); };
    }, []);

    // Double-tap / double-click — touch ekranlarda ham ishlashi uchun qo'lda aniqlanadi
    const handleTap = () => {
        const t = Date.now();
        if (t - lastTapRef.current < 450) {
            lastTapRef.current = 0;
            onUnlock();
        } else {
            lastTapRef.current = t;
        }
    };

    const cur = SLIDES[slide];
    const Icon = cur.icon;
    const time = now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const date = now.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    return (
        <div
            className="fixed inset-0 z-[3000] overflow-hidden bg-slate-950 select-none"
        >
            {bgImage && (
                <>
                    <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000" style={{ backgroundImage: `url(${bgImage})` }} />
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[4px]" />
                </>
            )}

            <div className="absolute inset-0 cursor-pointer" onPointerDown={handleTap} />

            {/* Yengil fon sharlari — blur filtri o'rniga radial-gradient (GPU tejamkor) */}
            <div className="ss-orb ss-orb-1" style={{ background: `radial-gradient(circle, ${cur.glow}38 0%, transparent 70%)` }} />
            <div className="ss-orb ss-orb-2" />
            {/* Yulduzchalar (kam sonli, faqat opacity animatsiya) */}
            {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="ss-star" style={{
                    left: `${(i * 41) % 100}%`,
                    top: `${(i * 67) % 100}%`,
                    animationDelay: `${(i % 5) * 0.9}s`,
                }} />
            ))}

            <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
                {/* Soat */}
                <div className="ss-fade-down mb-10">
                    <p className="text-white font-black text-6xl md:text-7xl tabular-nums tracking-wider">
                        {time}
                    </p>
                    <p className="text-slate-400 text-sm md:text-base font-semibold mt-2 capitalize">{date}</p>
                </div>

                {/* Logo */}
                <div className="mb-12 ss-fade-down" style={{ animationDelay: "0.15s" }}>
                    <span className="font-black text-4xl md:text-5xl tracking-tight">
                        <span className="text-white">EVIKO</span>
                        <span className="ss-shine bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent"> POS</span>
                    </span>
                    <p className="text-slate-500 text-xs font-bold tracking-[0.35em] uppercase mt-1">Restoran boshqaruv tizimi</p>
                </div>

                {/* Aylanma slayd */}
                <div key={slide} className="ss-slide-in max-w-xl">
                    <div className={`w-20 h-20 md:w-24 md:h-24 mx-auto rounded-3xl bg-gradient-to-br ${cur.grad} flex items-center justify-center ss-float`}
                        style={{ boxShadow: `0 12px 40px ${cur.glow}55` }}>
                        <Icon size={42} className="text-white" strokeWidth={2} />
                    </div>
                    <h2 className="text-white font-black text-2xl md:text-4xl mt-6 tracking-tight">{cur.title}</h2>
                    <p className="text-slate-400 text-sm md:text-lg font-medium mt-3 leading-relaxed">{cur.desc}</p>
                </div>

                {/* Slayd indikatorlari */}
                <div className="flex items-center gap-2 mt-10">
                    {SLIDES.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all duration-500 ${i === slide ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/25"}`} />
                    ))}
                </div>

                {/* Pastki ko'rsatma */}
                <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2">
                    <div className="ss-pulse flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 border border-white/10 pointer-events-none">
                        <Hand size={16} className="text-sky-300" />
                        <span className="text-slate-300 text-sm font-bold">Davom etish uchun ekranga 2 marta teging</span>
                    </div>
                    <p className="text-slate-600 text-[11px] font-semibold mt-1">EVIKO POS · chaqqonpro.e-code.uz</p>
                </div>

                {/* Orqa fon tanlash tugmasi */}
                <div className="absolute bottom-6 left-6 z-50 flex flex-col items-start">
                    {showBgMenu && (
                        <div className="mb-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-700 backdrop-blur-xl shadow-2xl animate-fade-in flex flex-wrap gap-3 max-w-[280px]">
                            {BG_IMAGES.map((bg) => (
                                <button
                                    key={bg.id}
                                    onClick={(e) => { e.stopPropagation(); changeBg(bg.url); }}
                                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${bgImage === bg.url ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]" : "border-slate-700 hover:border-slate-500"}`}
                                >
                                    {bg.url ? (
                                        <img src={bg.url} className="w-full h-full object-cover" alt={bg.name} />
                                    ) : (
                                        <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                                            <span className="text-xs font-semibold text-slate-500">Qora</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                            <button onClick={(e) => { e.stopPropagation(); setShowBgMenu(false); }} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-lg">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowBgMenu(!showBgMenu); }}
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md active:scale-95"
                        title="Orqa fonni o'zgartirish"
                    >
                        <ImageIcon size={20} />
                    </button>
                </div>
            </div>

            <style>{`
                .ss-orb {
                    position: absolute;
                    border-radius: 9999px;
                    will-change: transform;
                    transition: background 1.2s ease;
                }
                .ss-orb-1 { width: 640px; height: 640px; top: -200px; left: -160px; animation: ssDrift1 18s ease-in-out infinite; }
                .ss-orb-2 { width: 560px; height: 560px; bottom: -180px; right: -140px; background: radial-gradient(circle, #6366f133 0%, transparent 70%); animation: ssDrift2 24s ease-in-out infinite; }
                @keyframes ssDrift1 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(60px, 45px); }
                }
                @keyframes ssDrift2 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-50px, -40px); }
                }
                .ss-star {
                    position: absolute;
                    width: 3px; height: 3px;
                    border-radius: 9999px;
                    background: #fff;
                    opacity: 0;
                    animation: ssTwinkle 4.5s ease-in-out infinite;
                }
                @keyframes ssTwinkle {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 0.5; }
                }
                .ss-fade-down { animation: ssFadeDown 0.8s ease both; }
                @keyframes ssFadeDown {
                    from { opacity: 0; transform: translateY(-18px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .ss-slide-in { animation: ssSlideIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) both; }
                @keyframes ssSlideIn {
                    from { opacity: 0; transform: translateY(26px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .ss-float { animation: ssFloat 3.4s ease-in-out infinite; }
                @keyframes ssFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .ss-pulse { animation: ssPulse 2.2s ease-in-out infinite; }
                @keyframes ssPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.65; transform: scale(0.97); }
                }
                .ss-shine {
                    background-size: 200% auto;
                    animation: ssShine 3s linear infinite;
                }
                @keyframes ssShine {
                    to { background-position: 200% center; }
                }
            `}</style>
        </div>
    );
}
