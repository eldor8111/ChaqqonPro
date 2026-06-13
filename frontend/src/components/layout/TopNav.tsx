"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
    LayoutDashboard, Package, BarChart3, UserCheck, Warehouse,
    DollarSign, Clock, Headset, CreditCard, Building2, ChevronDown,
} from "lucide-react";
import { useLang } from "@/lib/LangContext";
import clsx from "clsx";
import { useFrontendStore } from "@/lib/frontend/store";
import UserProfile from "./UserProfile";

interface NavItem {
    href: string;
    icon: React.ComponentType<any>;
    key: string;
    subItems?: { href: string; label: string; isI18n?: boolean }[];
}

const BLOCKED_NAV_ITEMS: NavItem[] = [
    { href: "/billing", icon: CreditCard, key: "nav.billing" },
];

const NAV_ITEMS: NavItem[] = [
    { href: "/smart", icon: LayoutDashboard, key: "nav.dashboard" },
    { href: "/smart/reports", icon: BarChart3, key: "nav.reports" },
    { href: "/smart/davomat", icon: Clock, key: "nav.attendance" },
    {
        href: "/smart/nomenklatura", icon: Package, key: "nav.nomenclature",
        subItems: [
            { href: "/smart/nomenklatura/taomlar", label: "nav.nom_dishes", isI18n: true },
            { href: "/smart/nomenklatura/kategoriya", label: "nav.nom_dish_cats", isI18n: true },
            { href: "/smart/nomenklatura/polfabrikat", label: "nav.nom_semi", isI18n: true },
            { href: "/smart/nomenklatura/kategoriya-polfabrikat", label: "nav.nom_semi_cats", isI18n: true },
            { href: "/smart/nomenklatura/xomashyo", label: "nav.nom_raw", isI18n: true },
            { href: "/smart/nomenklatura/kategoriya-xomashyo", label: "nav.nom_raw_cats", isI18n: true },
        ]
    },
    {
        href: "/smart/ombor", icon: Warehouse, key: "nav.ombor",
        subItems: [
            { href: "/smart/ombor/qoldiqlar", label: "nav.ombor_qoldiqlar", isI18n: true },
            { href: "/smart/ombor/kirim", label: "nav.ombor_kirim", isI18n: true },
            { href: "/smart/ombor/kochirish", label: "nav.ombor_kochirish", isI18n: true },
            { href: "/smart/ombor/inventarizatsiya", label: "nav.ombor_inventarizatsiya", isI18n: true },
            { href: "/smart/ombor/sjisaniya", label: "nav.ombor_sjisaniya", isI18n: true },
        ]
    },
    {
        href: "/smart/users", icon: UserCheck, key: "nav.users",
        subItems: [
            { href: "/smart/users/kassir", label: "nav.users_kassir", isI18n: true },
            { href: "/smart/users/ofitsiant", label: "nav.users_ofitsiant", isI18n: true },
            { href: "/smart/users/kuryer", label: "nav.users_kuryer", isI18n: true },
            { href: "/smart/users/manablog", label: "nav.users_manablog", isI18n: true },
            { href: "/smart/users/povar", label: "nav.users_povar", isI18n: true },
            { href: "/smart/users/menejer", label: "nav.users_menejer", isI18n: true },
            { href: "/smart/users/omborchi", label: "nav.users_omborchi", isI18n: true },
        ]
    },
    {
        href: "/smart/moliya", icon: DollarSign, key: "nav.finance",
        subItems: [
            { href: "/smart/moliya", label: "nav.fin_cash", isI18n: true },
        ]
    },
    {
        href: "/smart/kontragent", icon: Building2, key: "nav.contractors",
        subItems: [
            { href: "/smart/kontragent/yetkazib-beruvchilar", label: "nav.kont_suppliers", isI18n: true },
            { href: "/smart/kontragent/klientlar", label: "nav.kont_clients", isI18n: true }
        ]
    },
    { href: "/smart/support", icon: Headset, key: "nav.support" },
    { href: "/billing", icon: CreditCard, key: "nav.billing" },
];

export default function TopNav() {
    const pathname = usePathname();
    const { t } = useLang();
    const { user, subscriptionExpired } = useFrontendStore();

    const settings = user?.tenant?.settings || {};
    const useWarehouse = settings.useWarehouse ?? true;
    const useCRM = settings.useCRM ?? false;
    const useAnalytics = settings.useAnalytics ?? true;

    const rawNavItems = subscriptionExpired ? BLOCKED_NAV_ITEMS : NAV_ITEMS;
    const navItems = useMemo(() => {
        return rawNavItems.map(item => {
            if (item.key === "nav.ombor" && !useWarehouse) return null;
            if (item.key === "nav.reports" && !useAnalytics) return null;
            if (item.key === "nav.contractors" && !useCRM) return null;
            return item;
        }).filter(Boolean) as NavItem[];
    }, [rawNavItems, useWarehouse, useAnalytics, useCRM]);

    return (
        // Tepa gorizontal navbar — faqat desktop (mobil drawer Sidebar'da qoladi)
        <nav className="hidden md:flex items-center gap-1 px-4 h-12 bg-surface-card border-b border-surface-border flex-shrink-0 relative z-30">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto custom-scrollbar">
                {navItems.map((item) => {
                    const { href, icon: Icon, key, subItems } = item;
                    const isActive = pathname === href || pathname.startsWith(href + "/");

                    if (subItems) {
                        return (
                            <div key={key} className="relative group flex-shrink-0">
                                <button
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                                        isActive
                                            ? "text-brand-500 bg-brand-500/10 font-medium"
                                            : "text-slate-500 hover:text-slate-800 hover:bg-surface-elevated"
                                    )}
                                >
                                    <Icon size={16} className="flex-shrink-0" />
                                    <span>{t(key)}</span>
                                    <ChevronDown size={13} className="opacity-60 transition-transform group-hover:rotate-180" />
                                </button>
                                {/* Dropdown (hover bilan ochiladi) */}
                                <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 min-w-[210px]">
                                    <div className="bg-surface-card border border-surface-border rounded-xl shadow-xl py-1.5">
                                        {subItems.map((sub) => {
                                            const isSubActive = pathname === sub.href;
                                            return (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    className={clsx(
                                                        "block px-4 py-2 text-sm whitespace-nowrap transition-colors",
                                                        isSubActive
                                                            ? "text-brand-500 bg-brand-500/10 font-medium"
                                                            : "text-slate-500 hover:text-slate-800 hover:bg-surface-elevated"
                                                    )}
                                                >
                                                    {sub.isI18n ? t(sub.label) : sub.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={key}
                            href={href}
                            className={clsx(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0",
                                isActive
                                    ? "text-brand-500 bg-brand-500/10 font-medium"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-surface-elevated"
                            )}
                        >
                            <Icon size={16} className="flex-shrink-0" />
                            <span>{t(key)}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Foydalanuvchi profili — o'ng tomonda */}
            <div className="flex-shrink-0 pl-2 border-l border-surface-border">
                <UserProfile placement="topbar" />
            </div>
        </nav>
    );
}
