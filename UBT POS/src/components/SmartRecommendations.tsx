/**
 * Smart Tavsiyalar Komponenti
 * Mijoz savatga mahsulot qo'shganda avtomatik tavsiyalar ko'rsatadi
 */

"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, TrendingUp, Gift } from "lucide-react";

interface Product {
    id: string;
    name: string;
    category: string;
    originalPrice: number;
    finalPrice: number;
    stock: number;
    image?: string | null;
}

interface Recommendation {
    id: string;
    product: Product;
    title: string;
    description: string;
    badgeText: string;
    badgeColor: string;
    discountType: string;
    discountValue: number;
    priority: number;
}

interface SmartRecommendationsProps {
    cartItems: string[]; // Product IDs
    cartTotal: number;
    tenantToken?: string;
    onAddToCart: (productId: string, productName: string, price: number) => void;
    lang?: "uz" | "ru";
    dark?: boolean;
}

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const th = {
    bg: (d: boolean) => d ? "bg-gray-900" : "bg-gray-50",
    card: (d: boolean) => d ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
    text: (d: boolean) => d ? "text-gray-100" : "text-gray-800",
    sub: (d: boolean) => d ? "text-gray-400" : "text-gray-500",
};

const getBadgeColor = (color: string) => {
    const colors: Record<string, string> = {
        blue: "bg-blue-500",
        red: "bg-red-500",
        green: "bg-green-500",
        orange: "bg-orange-500",
        sky: "bg-sky-500",
        indigo: "bg-indigo-500",
    };
    return colors[color] || colors.blue;
};

export default function SmartRecommendations({
    cartItems,
    cartTotal,
    tenantToken,
    onAddToCart,
    lang = "uz",
    dark = false
}: SmartRecommendationsProps) {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);

    // Fetch recommendations when cart changes
    useEffect(() => {
        if (cartItems.length === 0) {
            setRecommendations([]);
            setVisible(false);
            return;
        }

        fetchRecommendations();
    }, [cartItems, cartTotal]);

    const fetchRecommendations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                cartItems: JSON.stringify(cartItems),
                cartTotal: cartTotal.toString()
            });

            const headers: Record<string, string> = {};
            if (tenantToken) {
                headers["Authorization"] = `Bearer ${tenantToken}`;
            }

            const res = await fetch(`/api/ubt/recommendations?${params}`, {
                headers
            });

            if (res.ok) {
                const data = await res.json();
                if (data.recommendations && data.recommendations.length > 0) {
                    setRecommendations(data.recommendations);
                    setVisible(true);
                } else {
                    setRecommendations([]);
                    setVisible(false);
                }
            }
        } catch (error) {
            console.error("Failed to fetch recommendations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClick = async (rec: Recommendation) => {
        // Track click
        try {
            await fetch("/api/ubt/recommendations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: rec.id, action: "click" })
            });
        } catch {}

        // Add to cart
        onAddToCart(rec.product.id, rec.product.name, rec.product.finalPrice);

        // Track conversion
        try {
            await fetch("/api/ubt/recommendations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: rec.id, action: "conversion" })
            });
        } catch {}

        // Remove this recommendation from list
        setRecommendations(prev => prev.filter(r => r.id !== rec.id));
    };

    if (!visible || recommendations.length === 0) return null;

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 ${th.card(dark)} border-t-2 shadow-2xl animate-slide-up`}>
            <div className="max-w-7xl mx-auto px-4 py-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-yellow-500" size={20} />
                        <h3 className={`font-bold text-sm ${th.text(dark)}`}>
                            {lang === "uz" ? "Sizga yoqishi mumkin" : "Вам может понравиться"}
                        </h3>
                    </div>
                    <button
                        onClick={() => setVisible(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        <X size={18} className={th.sub(dark)} />
                    </button>
                </div>

                {/* Recommendations Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {recommendations.map((rec) => {
                        const hasDiscount = rec.product.originalPrice > rec.product.finalPrice;
                        const discountPercent = hasDiscount
                            ? Math.round(((rec.product.originalPrice - rec.product.finalPrice) / rec.product.originalPrice) * 100)
                            : 0;

                        return (
                            <button
                                key={rec.id}
                                onClick={() => handleClick(rec)}
                                className={`${th.card(dark)} border-2 rounded-xl p-3 text-left transition-all hover:shadow-lg hover:scale-105 active:scale-95 relative overflow-hidden`}
                            >
                                {/* Badge */}
                                <div className={`absolute top-2 left-2 ${getBadgeColor(rec.badgeColor)} text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-10`}>
                                    {rec.badgeText}
                                </div>

                                {/* Discount Badge */}
                                {hasDiscount && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md z-10">
                                        -{discountPercent}%
                                    </div>
                                )}

                                {/* Image */}
                                <div className="w-full aspect-square bg-gradient-to-br from-sky-50 to-sky-100 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                    {rec.product.image ? (
                                        <img
                                            src={rec.product.image}
                                            alt={rec.product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <TrendingUp className="text-sky-400" size={32} />
                                    )}
                                </div>

                                {/* Title */}
                                <p className={`font-bold text-[10px] leading-tight mb-1 ${th.text(dark)}`}>
                                    {rec.title}
                                </p>

                                {/* Product Name */}
                                <p className={`text-[11px] font-semibold leading-tight mb-2 line-clamp-2 ${th.text(dark)}`}>
                                    {rec.product.name}
                                </p>

                                {/* Price */}
                                <div className="flex items-center gap-1">
                                    {hasDiscount && (
                                        <span className={`text-[10px] line-through ${th.sub(dark)}`}>
                                            {fmt(rec.product.originalPrice)}
                                        </span>
                                    )}
                                    <span className="text-green-600 dark:text-green-400 font-black text-sm">
                                        {fmt(rec.product.finalPrice)}
                                    </span>
                                </div>

                                {/* Description */}
                                {rec.description && (
                                    <p className={`text-[9px] mt-1 ${th.sub(dark)}`}>
                                        {rec.description}
                                    </p>
                                )}

                                {/* Add Icon */}
                                <div className="absolute bottom-2 right-2 bg-green-500 rounded-full p-1.5 shadow-md">
                                    <Gift className="text-white" size={14} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
