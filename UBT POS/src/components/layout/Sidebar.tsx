"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard, Package, BarChart3,
    UserCheck, Coffee, Warehouse,
    Settings, ChevronLeft, ChevronRight, Printer,
    DollarSign, Bike, CalendarCheck, Clock, Zap, Headset, CreditCard, Building2,
} from "lucide-react";
import { useLang } from "@/lib/LangContext";
import clsx from "clsx";

import { useFrontendStore } from "@/lib/frontend/store";
import { ChevronDown } from "lucide-react";

const BLOCKED_NAV_ITEMS = [
    { href: "/billing", icon: CreditCard, key: "Obuna va Tariflar" },
];

const NAV_ITEMS = [
    { href: "/ubt", icon: LayoutDashboard, key: "nav.dashboard" },
    { href: "/ubt/reports", icon: BarChart3, key: "nav.reports" },
    { href: "/ubt/davomat", icon: Clock, key: "Davomat" },
    {
        href: "/ubt/nomenklatura", icon: Package, key: "Nomenklatura",
        subItems: [
            { href: "/ubt/nomenklatura/taomlar", label: "Taomlar" },
            { href: "/ubt/nomenklatura/kategoriya", label: "Taomlar kategoriyasi" },
            { href: "/ubt/nomenklatura/polfabrikat", label: "Yarim tayyor (Polfabrikat)" },
            { href: "/ubt/nomenklatura/kategoriya-polfabrikat", label: "Yar. tayyor kategoriyasi" },
            { href: "/ubt/nomenklatura/xomashyo", label: "Xomashyo" },
            { href: "/ubt/nomenklatura/kategoriya-xomashyo", label: "Xomashyo kategoriyasi" },
        ]
    },
    {
        href: "/ubt/ombor", icon: Warehouse, key: "nav.ombor",
        subItems: [
            { href: "/ubt/ombor/qoldiqlar", label: "nav.ombor_qoldiqlar", isI18n: true },
            { href: "/ubt/ombor/kirim", label: "nav.ombor_kirim", isI18n: true },
            { href: "/ubt/ombor/kochirish", label: "nav.ombor_kochirish", isI18n: true },
            { href: "/ubt/ombor/inventarizatsiya", label: "nav.ombor_inventarizatsiya", isI18n: true },
            { href: "/ubt/ombor/sjisaniya", label: "nav.ombor_sjisaniya", isI18n: true },
        ]
    },
    {
        href: "/ubt/users", icon: UserCheck, key: "nav.users",
        subItems: [
            { href: "/ubt/users/kassir", label: "nav.users_kassir", isI18n: true },
            { href: "/ubt/users/ofitsiant", label: "nav.users_ofitsiant", isI18n: true },
            { href: "/ubt/users/kuryer", label: "nav.users_kuryer", isI18n: true },
            { href: "/ubt/users/manablog", label: "nav.users_manablog", isI18n: true },
            { href: "/ubt/users/povar", label: "nav.users_povar", isI18n: true },
            { href: "/ubt/users/menejer", label: "nav.users_menejer", isI18n: true },
            { href: "/ubt/users/omborchi", label: "nav.users_omborchi", isI18n: true },
        ]
    },
    {
        href: "/ubt/moliya", icon: DollarSign, key: "Moliya",
        subItems: [
            { href: "/ubt/moliya", label: "Kassa & P&L" },
        ]
    },
    {
        href: "/ubt/kontragent", icon: Building2, key: "Kontragentlar",
    },
    {
        href: "/ubt/support", icon: Headset, key: "Tex yordam",
    },
    {
        href: "/billing", icon: CreditCard, key: "Obuna va Tariflar",
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { t } = useLang();
    const { user, subscriptionExpired } = useFrontendStore();
    const [collapsed, setCollapsed] = useState(false);
    const [openMenus, setOpenMenus] = useState<string[]>([]);

    const toggleMenu = (key: string) => {
        setOpenMenus(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const navItems = subscriptionExpired ? BLOCKED_NAV_ITEMS : NAV_ITEMS;

    return (
        <aside
            className={clsx(
                "flex flex-col h-screen bg-surface-card border-r border-surface-border transition-all duration-300 ease-in-out z-40 flex-shrink-0",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-border">
                {!collapsed ? (
                    <div className="animate-fade-in">
                        <span className="font-black text-[22px] tracking-tight text-slate-800">
                            Chaqqon<span className="text-blue-600">Pro</span>
                        </span>
                    </div>
                ) : (
                    <div className="animate-fade-in flex w-full justify-center -ml-2">
                        <span className="font-black text-[22px] tracking-tight text-slate-800">
                            C<span className="text-blue-600">P</span>
                        </span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-surface-elevated transition-all"
                >
                    {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navItems.map(({ href, icon: Icon, key, subItems }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    const isExpanded = openMenus.includes(key);

                    return (
                        <div key={key}>
                            {subItems ? (
                                <button
                                    onClick={() => {
                                        if (collapsed) setCollapsed(false);
                                        toggleMenu(key);
                                    }}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-surface-elevated transition-colors",
                                        (isActive || isExpanded) && "text-slate-800 bg-surface-elevated"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon size={18} className="flex-shrink-0" />
                                        {!collapsed && <span className="text-sm truncate">{t(key)}</span>}
                                    </div>
                                    {!collapsed && (
                                        <ChevronDown size={14} className={clsx("transition-transform", isExpanded && "rotate-180")} />
                                    )}
                                </button>
                            ) : (
                                <Link
                                    href={href}
                                    title={collapsed ? t(key) : ""}
                                    className={clsx(
                                        "nav-item flex items-center gap-3 p-2 rounded-xl transition-colors text-slate-400 hover:text-slate-800 hover:bg-surface-elevated",
                                        isActive && "active text-brand-400 bg-brand-500/10"
                                    )}
                                >
                                    <Icon size={18} className="flex-shrink-0" />
                                    {!collapsed && (
                                        <span className="text-sm truncate">{t(key)}</span>
                                    )}
                                </Link>
                            )}

                            {/* Sub items list */}
                            {subItems && isExpanded && !collapsed && (
                                <div className="mt-1 ml-4 space-y-1 pl-4 border-l border-surface-border">
                                    {subItems.map((subItem) => {
                                        const isSubActive = pathname === subItem.href;
                                        return (
                                                <Link
                                                    key={subItem.href}
                                                    href={subItem.href}
                                                    className={clsx(
                                                        "block p-2 rounded-lg text-sm transition-colors",
                                                        isSubActive
                                                            ? "text-brand-400 font-medium bg-brand-500/10"
                                                            : "text-slate-400 hover:text-slate-200 hover:bg-surface-elevated"
                                                    )}
                                                >
                                                    {(subItem as any).isI18n ? t(subItem.label) : subItem.label}
                                                </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>


        </aside>
    );
}
