"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard, Package, BarChart3,
    UserCheck, Warehouse,
    ChevronLeft, ChevronRight, Printer,
    DollarSign, CalendarCheck, Clock, Headset, CreditCard, Building2, X, Menu,
    Home, PieChart, Users, ShoppingBag
} from "lucide-react";
import { useLang } from "@/lib/LangContext";
import clsx from "clsx";
import { useFrontendStore } from "@/lib/frontend/store";
import { ChevronDown } from "lucide-react";
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
    { href: "/ubt", icon: LayoutDashboard, key: "nav.dashboard" },
    { href: "/ubt/reports", icon: BarChart3, key: "nav.reports" },
    { href: "/ubt/davomat", icon: Clock, key: "nav.attendance" },
    {
        href: "/ubt/nomenklatura", icon: Package, key: "nav.nomenclature",
        subItems: [
            { href: "/ubt/nomenklatura/taomlar", label: "nav.nom_dishes", isI18n: true },
            { href: "/ubt/nomenklatura/kategoriya", label: "nav.nom_dish_cats", isI18n: true },
            { href: "/ubt/nomenklatura/polfabrikat", label: "nav.nom_semi", isI18n: true },
            { href: "/ubt/nomenklatura/kategoriya-polfabrikat", label: "nav.nom_semi_cats", isI18n: true },
            { href: "/ubt/nomenklatura/xomashyo", label: "nav.nom_raw", isI18n: true },
            { href: "/ubt/nomenklatura/kategoriya-xomashyo", label: "nav.nom_raw_cats", isI18n: true },
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
        href: "/ubt/moliya", icon: DollarSign, key: "nav.finance",
        subItems: [
            { href: "/ubt/moliya", label: "nav.fin_cash", isI18n: true },
        ]
    },
    {
        href: "/ubt/kontragent", icon: Building2, key: "nav.contractors",
        subItems: [
            { href: "/ubt/kontragent/yetkazib-beruvchilar", label: "nav.kont_suppliers", isI18n: true },
            { href: "/ubt/kontragent/klientlar", label: "nav.kont_clients", isI18n: true }
        ]
    },
    {
        href: "/ubt/support", icon: Headset, key: "nav.support",
    },
    {
        href: "/billing", icon: CreditCard, key: "nav.billing",
    },
];

// Bottom navigation items for mobile (most used 4)
const MOBILE_BOTTOM_NAV = [
    { href: "/ubt", icon: Home, label: "Bosh sahifa" },
    { href: "/ubt/reports", icon: PieChart, label: "Hisobotlar" },
    { href: "/ubt/users", icon: Users, label: "Xodimlar" },
    { href: "/ubt/ombor/qoldiqlar", icon: ShoppingBag, label: "Ombor" },
];

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
    onMobileOpen?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose, onMobileOpen }: SidebarProps) {
    const pathname = usePathname();
    const { t } = useLang();
    const { user, subscriptionExpired } = useFrontendStore();
    const [collapsed, setCollapsed] = useState(false);
    const [openMenus, setOpenMenus] = useState<string[]>([]);

    // Close mobile drawer on route change
    useEffect(() => {
        onMobileClose?.();
    }, [pathname]);

    const toggleMenu = (key: string) => {
        setOpenMenus(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const navItems = subscriptionExpired ? BLOCKED_NAV_ITEMS : NAV_ITEMS;

    const sidebarContent = (
        <>
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
                {/* Mobile close button */}
                {mobileOpen && (
                    <button
                        onClick={onMobileClose}
                        className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-surface-elevated transition-all md:hidden"
                    >
                        <X size={18} />
                    </button>
                )}
                {/* Desktop collapse button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-surface-elevated transition-all hidden md:flex"
                >
                    {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const { href, icon: Icon, key, subItems } = item;
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

            <UserProfile collapsed={collapsed} />
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={clsx(
                    "hidden md:flex flex-col h-screen bg-surface-card border-r border-surface-border transition-all duration-300 ease-in-out z-40 flex-shrink-0",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                {sidebarContent}
            </aside>

            {/* Mobile Drawer Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-50 md:hidden"
                    aria-modal="true"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onMobileClose}
                    />
                    {/* Drawer panel */}
                    <aside className="relative flex flex-col h-full w-72 max-w-[85vw] bg-surface-card border-r border-surface-border shadow-2xl animate-slide-in-left">
                        {sidebarContent}
                    </aside>
                </div>
            )}

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface-card border-t border-surface-border flex items-center safe-area-pb">
                {MOBILE_BOTTOM_NAV.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                                isActive ? "text-blue-600" : "text-slate-400"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="text-[10px] leading-none">{item.label}</span>
                        </Link>
                    );
                })}
                {/* Hamburger to open full menu */}
                <button
                    onClick={onMobileOpen}
                    className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-slate-400"
                    id="mobile-menu-trigger"
                >
                    <Menu size={20} />
                    <span className="text-[10px] leading-none">Menyu</span>
                </button>

            </nav>
        </>
    );
}
