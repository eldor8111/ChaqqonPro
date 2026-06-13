"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
    LayoutDashboard, Package, BarChart3, UserCheck, Warehouse,
    DollarSign, Clock, Headset, CreditCard, Building2, ChevronDown,
} from "lucide-react";
import { useLang } from "@/lib/LangContext";
import clsx from "clsx";
import { useFrontendStore } from "@/lib/frontend/store";
import UserProfile from "./UserProfile";

type SubItem = { href: string; label: string; isI18n?: boolean };
interface NavItem {
    href: string;
    icon: React.ComponentType<any>;
    key: string;
    subItems?: SubItem[];
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

    // Ochilgan dropdown — position:fixed bilan render qilinadi (scroll konteyneri kesmasin)
    const [open, setOpen] = useState<{ key: string; items: SubItem[]; left: number; top: number } | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openMenu = (key: string, items: SubItem[], el: HTMLElement) => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        const r = el.getBoundingClientRect();
        setOpen({ key, items, left: r.left, top: r.bottom });
    };
    const scheduleClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpen(null), 160);
    };
    const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };

    return (
        <nav className="hidden md:flex items-center gap-1 px-4 h-12 bg-surface-card border-b border-surface-border flex-shrink-0 relative z-30">
            <div
                className="flex items-center gap-1 flex-1 overflow-x-auto custom-scrollbar"
                onScroll={() => setOpen(null)}
            >
                {navItems.map((item) => {
                    const { href, icon: Icon, key, subItems } = item;
                    const isActive = pathname === href || pathname.startsWith(href + "/");

                    if (subItems) {
                        // Ota-punktni bosganda birinchi ichki sahifaga o'tadi (ota href ko'pincha sahifasiz)
                        const parentHref = subItems[0]?.href || href;
                        return (
                            <Link
                                key={key}
                                href={parentHref}
                                onMouseEnter={(e) => openMenu(key, subItems, e.currentTarget)}
                                onMouseLeave={scheduleClose}
                                className={clsx(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0",
                                    isActive
                                        ? "text-brand-500 bg-brand-500/10 font-medium"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-surface-elevated"
                                )}
                            >
                                <Icon size={16} className="flex-shrink-0" />
                                <span>{t(key)}</span>
                                <ChevronDown size={13} className={clsx("opacity-60 transition-transform", open?.key === key && "rotate-180")} />
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={key}
                            href={href}
                            onMouseEnter={() => setOpen(null)}
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

            {/* Dropdown paneli — position:fixed, barcha kesishlardan tashqarida, eng ustda */}
            {open && (
                <div
                    style={{ position: "fixed", left: open.left, top: open.top, zIndex: 1000 }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                    className="pt-1"
                >
                    <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl py-1.5 min-w-[210px] animate-fade-in">
                        {open.items.map((sub) => {
                            const isSubActive = pathname === sub.href;
                            return (
                                <Link
                                    key={sub.href}
                                    href={sub.href}
                                    onClick={() => setOpen(null)}
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
            )}
        </nav>
    );
}
