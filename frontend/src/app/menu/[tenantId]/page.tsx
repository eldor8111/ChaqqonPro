"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ChevronRight, Phone, MapPin, Wifi, Clock, Star, 
  Search, X, ShoppingBag, Bell, BellRing, CheckCircle,
  Instagram, MessageCircle, Loader2, UtensilsCrossed
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  price: number;
  image: string | null;
}
interface Category {
  id: string;
  name: string;
}
interface RestaurantInfo {
  id: string;
  name: string;
  logo?: string;
  phone?: string;
  address?: string;
  wifi?: string;
  wifiPassword?: string;
  description?: string;
  workingHours?: string;
  instagram?: string;
  telegram?: string;
}
interface TableInfo {
  tableNumber?: string;
  section?: string;
}
interface MenuData {
  restaurant: RestaurantInfo;
  table: TableInfo;
  categories: Category[];
  items: MenuItem[];
}

// ─── Format currency ─────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ", { minimumFractionDigits: 0 }).format(n) + " so'm";

// ─── Waiter call status ───────────────────────────────────────────────────────
type WaiterStatus = "idle" | "calling" | "called" | "error";

// ─── Menu Item Card ───────────────────────────────────────────────────────────
function MenuItemCard({ 
  item, 
  qty, 
  onAdd, 
  onMinus 
}: { 
  item: MenuItem; 
  qty: number; 
  onAdd: () => void; 
  onMinus: () => void; 
}) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="menu-card group relative flex flex-col justify-between h-full">
      <div>
        {/* Image */}
        <div className="menu-card-image relative">
          {item.image && !imgErr ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
              <UtensilsCrossed size={36} className="text-amber-300" />
            </div>
          )}
          {/* Price badge */}
          <div className="price-badge">{fmt(item.price)}</div>
          {qty > 0 && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-white animate-scale-in">
              {qty}
            </div>
          )}
        </div>
        {/* Info */}
        <div className="menu-card-body">
          <h3 className="menu-item-name">{item.name}</h3>
          <p className="menu-item-category">{item.category}</p>
        </div>
      </div>

      {/* Add / Subtract Controls */}
      <div className="p-3 pt-0">
        {qty > 0 ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-1">
            <button 
              onClick={onMinus} 
              className="w-8 h-8 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-700 font-bold active:scale-90 transition-transform shadow-sm"
            >
              -
            </button>
            <span className="font-extrabold text-amber-900 text-sm">{qty}</span>
            <button 
              onClick={onAdd} 
              className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold active:scale-90 transition-transform shadow-sm"
            >
              +
            </button>
          </div>
        ) : (
          <button 
            onClick={onAdd}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-orange-500/10"
          >
            Savatga qo'shish
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function PublicMenuPage({
  params,
  searchParams,
}: {
  params: { tenantId: string };
  searchParams: { tableId?: string };
}) {
  const { tenantId } = params;
  const tableId = searchParams.tableId || "";

  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [waiterStatus, setWaiterStatus] = useState<WaiterStatus>("idle");
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Savatcha holati
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [orderingStatus, setOrderingStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === itemId);
      if (ex && ex.qty > 1) {
        return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  // ── Fetch menu data ──────────────────────────────────────────────────────
  useEffect(() => {
    const url = tableId
      ? `/api/menu/${tenantId}?tableId=${tableId}`
      : `/api/menu/${tenantId}`;

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Ma'lumot yuklanmadi"))
      .finally(() => setLoading(false));
  }, [tenantId, tableId]);

  // ── Call waiter ──────────────────────────────────────────────────────────
  const callWaiter = useCallback(async (message?: string) => {
    if (!tableId) {
      setShowWaiterModal(true);
      return;
    }
    setWaiterStatus("calling");
    try {
      const res = await fetch(`/api/menu/${tenantId}/call-waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, message }),
      });
      if (res.ok) {
        setWaiterStatus("called");
        setTimeout(() => setWaiterStatus("idle"), 30_000);
      } else {
        setWaiterStatus("error");
        setTimeout(() => setWaiterStatus("idle"), 5_000);
      }
    } catch {
      setWaiterStatus("error");
      setTimeout(() => setWaiterStatus("idle"), 5_000);
    }
  }, [tenantId, tableId]);

  // ── Filter items ─────────────────────────────────────────────────────────
  const filteredItems = data?.items.filter(item => {
    const matchCat = activeCategory === "all" || item.categoryId === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }) ?? [];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center menu-bg">
        <div className="text-center">
          <div className="loader-ring mx-auto mb-4" />
          <p className="text-amber-600 font-semibold animate-pulse">Menyu yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center menu-bg p-6">
        <div className="text-center max-w-xs">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Menyu topilmadi</h2>
          <p className="text-slate-500 text-sm">{error || "Bu restoran menyusi mavjud emas"}</p>
        </div>
      </div>
    );
  }

  const { restaurant, table, categories } = data;

  return (
    <>
      <style>{`
        :root {
          --gold: #d4a017;
          --gold-light: #f5c842;
          --cream: #fffaf0;
          --dark: #1a1410;
          --accent: #c0392b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Times New Roman', Times, serif;
          background: #fdf8f0;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .menu-bg {
          background: linear-gradient(135deg, #fdf8f0 0%, #fef3e2 50%, #fdf0e8 100%);
          min-height: 100vh;
        }

        /* ─── HERO HEADER ─── */
        .menu-hero {
          background: linear-gradient(160deg, #1a1410 0%, #2d2015 40%, #3d2a18 100%);
          position: relative;
          overflow: hidden;
          padding: 0;
        }

        .menu-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 30% 50%, rgba(212, 160, 23, 0.15) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 20%, rgba(192, 57, 43, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-ornament {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212, 160, 23, 0.12), transparent 70%);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          padding: 28px 20px 24px;
        }

        .restaurant-logo {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          object-fit: cover;
          border: 2px solid rgba(212, 160, 23, 0.5);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,160,23,0.2);
        }

        .restaurant-logo-placeholder {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, #d4a017, #8b6914);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          border: 2px solid rgba(212, 160, 23, 0.4);
        }

        .restaurant-name {
          font-size: 22px;
          font-weight: 900;
          color: #fff;
          letter-spacing: 0.5px;
          line-height: 1.2;
          text-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }

        .restaurant-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          margin-top: 4px;
          font-style: italic;
        }

        .gold-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #d4a017, rgba(212,160,23,0.3), transparent);
          margin: 14px 0;
        }

        .table-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #d4a017, #b8860b);
          color: #1a1410;
          font-size: 12px;
          font-weight: 800;
          padding: 5px 14px;
          border-radius: 100px;
          box-shadow: 0 4px 16px rgba(212,160,23,0.4);
          letter-spacing: 0.5px;
        }

        .info-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
          border-radius: 12px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }

        .info-btn:hover {
          background: rgba(212,160,23,0.2);
          border-color: rgba(212,160,23,0.5);
          color: #f5c842;
        }

        /* ─── CALL WAITER BUTTON ─── */
        .waiter-btn {
          position: fixed;
          bottom: 24px;
          right: 20px;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #c0392b, #96281b);
          color: white;
          border: none;
          border-radius: 100px;
          padding: 14px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 32px rgba(192, 57, 43, 0.5), 0 2px 8px rgba(0,0,0,0.2);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          letter-spacing: 0.3px;
        }

        .waiter-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 16px 40px rgba(192, 57, 43, 0.6);
        }

        .waiter-btn:active {
          transform: scale(0.97);
        }

        .waiter-btn.called {
          background: linear-gradient(135deg, #27ae60, #1e8449);
          box-shadow: 0 8px 32px rgba(39,174,96,0.5);
        }

        .waiter-btn.calling {
          background: linear-gradient(135deg, #d4a017, #b8860b);
          box-shadow: 0 8px 32px rgba(212,160,23,0.5);
        }

        .waiter-btn-pulse {
          animation: pulse-ring 1.5s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0% { box-shadow: 0 8px 32px rgba(192,57,43,0.5), 0 0 0 0 rgba(192,57,43,0.4); }
          50% { box-shadow: 0 8px 32px rgba(192,57,43,0.5), 0 0 0 14px rgba(192,57,43,0); }
          100% { box-shadow: 0 8px 32px rgba(192,57,43,0.5), 0 0 0 0 rgba(192,57,43,0); }
        }

        /* ─── SEARCH BAR ─── */
        .search-wrap {
          padding: 12px 16px 0;
          position: relative;
        }

        .search-input {
          width: 100%;
          background: #fff;
          border: 1.5px solid #e5e0d8;
          border-radius: 16px;
          padding: 12px 16px 12px 44px;
          font-size: 14px;
          color: #1a1410;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .search-input:focus {
          border-color: #d4a017;
          box-shadow: 0 2px 16px rgba(212,160,23,0.15);
        }

        .search-icon {
          position: absolute;
          left: 28px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }

        /* ─── CATEGORIES ─── */
        .cat-bar {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .cat-bar::-webkit-scrollbar { display: none; }

        .cat-chip {
          flex-shrink: 0;
          padding: 7px 16px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid #e5e0d8;
          background: #fff;
          color: #6b6057;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .cat-chip:hover {
          border-color: #d4a017;
          color: #9a6f0e;
        }

        .cat-chip.active {
          background: linear-gradient(135deg, #d4a017, #b8860b);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 14px rgba(212,160,23,0.35);
          font-weight: 800;
        }

        /* ─── MENU GRID ─── */
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 0 16px 120px;
        }

        @media (min-width: 480px) {
          .menu-grid { grid-template-columns: repeat(3, 1fr); }
        }

        .menu-card {
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s;
          cursor: default;
          border: 1px solid #f0ebe2;
        }

        .menu-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 12px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
        }

        .menu-card-image {
          position: relative;
          height: 130px;
          overflow: hidden;
          background: #fdf5e6;
        }

        @media (min-width: 400px) {
          .menu-card-image { height: 150px; }
        }

        .price-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: linear-gradient(135deg, #d4a017, #9a6f0e);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 9px;
          border-radius: 100px;
          box-shadow: 0 3px 12px rgba(212,160,23,0.5);
          letter-spacing: 0.2px;
        }

        .menu-card-body {
          padding: 10px 12px 12px;
        }

        .menu-item-name {
          font-size: 13px;
          font-weight: 700;
          color: #1a1410;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .menu-item-category {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 3px;
          font-style: italic;
        }

        /* ─── SECTION HEADER ─── */
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 16px 8px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 800;
          color: #1a1410;
          letter-spacing: 0.3px;
        }

        .section-count {
          font-size: 11px;
          background: rgba(212,160,23,0.1);
          color: #9a6f0e;
          padding: 2px 8px;
          border-radius: 100px;
          font-weight: 700;
          border: 1px solid rgba(212,160,23,0.2);
        }

        .gold-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4a017, #f5c842);
          flex-shrink: 0;
          box-shadow: 0 0 8px rgba(212,160,23,0.5);
        }

        /* ─── MODALS ─── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: flex-end;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(6px);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .modal-sheet {
          width: 100%;
          background: #fffaf5;
          border-radius: 28px 28px 0 0;
          padding: 0 0 32px;
          animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          max-height: 85vh;
          overflow-y: auto;
        }

        .modal-handle {
          width: 40px;
          height: 4px;
          background: #ddd;
          border-radius: 2px;
          margin: 12px auto 20px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 900;
          color: #1a1410;
          text-align: center;
          margin-bottom: 4px;
        }

        .modal-subtitle {
          font-size: 13px;
          color: #9ca3af;
          text-align: center;
          margin-bottom: 24px;
        }

        .info-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid #f0ebe2;
        }

        .info-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(212,160,23,0.12), rgba(212,160,23,0.06));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(212,160,23,0.2);
        }

        .info-label {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 14px;
          color: #1a1410;
          font-weight: 700;
          margin-top: 2px;
        }

        .waiter-option-btn {
          width: 100%;
          padding: 14px 20px;
          border: 1.5px solid #e5e0d8;
          border-radius: 16px;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .waiter-option-btn:hover {
          border-color: #d4a017;
          background: rgba(212,160,23,0.03);
        }

        .waiter-option-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 20px;
        }

        .waiter-option-label {
          font-size: 14px;
          font-weight: 700;
          color: #1a1410;
        }

        .waiter-option-desc {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 2px;
        }

        .success-check {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #27ae60, #1e8449);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 32px rgba(39,174,96,0.4);
          animation: pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }

        @keyframes pop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        /* ─── LOADER ─── */
        .loader-ring {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(212,160,23,0.15);
          border-top-color: #d4a017;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ─── FOOTER ─── */
        .menu-footer {
          text-align: center;
          padding: 16px;
          padding-bottom: 32px;
        }

        .eviko-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #b8a99a;
          font-style: italic;
        }

        .eviko-badge span {
          font-weight: 800;
          color: #d4a017;
          font-style: normal;
        }

        /* ─── EMPTY STATE ─── */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          grid-column: 1 / -1;
        }
      `}</style>

      <div className="menu-bg">
        {/* ── HERO HEADER ────────────────────────────────────────────── */}
        <div className="menu-hero">
          <div className="hero-ornament" style={{ width: 200, height: 200, top: -60, right: -40 }} />
          <div className="hero-ornament" style={{ width: 120, height: 120, bottom: -30, left: 20 }} />

          <div className="hero-content">
            {/* Logo + Name */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={restaurant.name} className="restaurant-logo" />
              ) : (
                <div className="restaurant-logo-placeholder">🍽️</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 className="restaurant-name">{restaurant.name}</h1>
                {restaurant.description && (
                  <p className="restaurant-desc">{restaurant.description}</p>
                )}
                {restaurant.workingHours && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                    <Clock size={11} color="rgba(212,160,23,0.7)" />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                      {restaurant.workingHours}
                    </span>
                  </div>
                )}
              </div>
              {(restaurant.phone || restaurant.address || restaurant.wifi) && (
                <button className="info-btn" onClick={() => setShowInfoModal(true)}>
                  ℹ️ Ma'lumot
                </button>
              )}
            </div>

            <div className="gold-divider" />

            {/* Table badge + social links */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                {table.tableNumber ? (
                  <div className="table-badge">
                    🪑 {table.section && `${table.section} · `}Stol {table.tableNumber}
                  </div>
                ) : (
                  <div className="table-badge">🍽️ Raqamli Menyu</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {restaurant.instagram && (
                  <a
                    href={`https://instagram.com/${restaurant.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Instagram size={16} color="rgba(255,255,255,0.7)" />
                  </a>
                )}
                {restaurant.telegram && (
                  <a
                    href={`https://t.me/${restaurant.telegram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <MessageCircle size={16} color="rgba(255,255,255,0.7)" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── SEARCH ─────────────────────────────────────────────────── */}
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            placeholder="Taom izlash..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: 28, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", background: "none", border: "none", cursor: "pointer", paddingTop: 12 }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── CATEGORIES ─────────────────────────────────────────────── */}
        <div className="cat-bar" ref={categoryRef}>
          <button
            className={`cat-chip ${activeCategory === "all" ? "active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            🍽️ Barchasi
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`cat-chip ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ── MENU GRID ──────────────────────────────────────────────── */}
        {!search && (
          <div className="section-header">
            <div className="gold-dot" />
            <span className="section-title">
              {activeCategory === "all"
                ? "Barcha taomlar"
                : categories.find(c => c.id === activeCategory)?.name || "Taomlar"}
            </span>
            <span className="section-count">{filteredItems.length} ta</span>
          </div>
        )}

        <div className="menu-grid">
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
              <p style={{ color: "#9ca3af", fontSize: 14 }}>Taom topilmadi</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const qty = cart.find(cartItem => cartItem.id === item.id)?.qty ?? 0;
              return (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  qty={qty}
                  onAdd={() => addToCart(item)}
                  onMinus={() => removeFromCart(item.id)}
                />
              );
            })
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <div className="menu-footer">
          <div className="eviko-badge">
            <ShoppingBag size={13} />
            Powered by <span>EVIKO POS</span>
          </div>
        </div>
      </div>

      {/* ── WAITER BUTTON ──────────────────────────────────────────── */}
      {waiterStatus === "called" ? (
        <button className="waiter-btn called">
          <CheckCircle size={20} />
          Ofitsiant kelmoqda!
        </button>
      ) : waiterStatus === "calling" ? (
        <button className="waiter-btn calling">
          <Loader2 size={20} style={{ animation: "spin 0.8s linear infinite" }} />
          Chaqirilmoqda...
        </button>
      ) : (
        <button
          className={`waiter-btn ${waiterStatus === "idle" ? "waiter-btn-pulse" : ""}`}
          onClick={() => tableId ? callWaiter() : setShowWaiterModal(true)}
        >
          <BellRing size={20} />
          Ofitsiant chaqirish
        </button>
      )}

      {/* ── INFO MODAL ─────────────────────────────────────────────── */}
      {showInfoModal && (
        <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <p className="modal-title">{restaurant.name}</p>
            <p className="modal-subtitle">Restoran ma'lumotlari</p>

            {restaurant.phone && (
              <div className="info-row">
                <div className="info-icon"><Phone size={16} color="#d4a017" /></div>
                <div>
                  <p className="info-label">Telefon</p>
                  <a href={`tel:${restaurant.phone}`} className="info-value" style={{ color: "#c0392b", textDecoration: "none" }}>
                    {restaurant.phone}
                  </a>
                </div>
              </div>
            )}

            {restaurant.address && (
              <div className="info-row">
                <div className="info-icon"><MapPin size={16} color="#d4a017" /></div>
                <div>
                  <p className="info-label">Manzil</p>
                  <p className="info-value">{restaurant.address}</p>
                </div>
              </div>
            )}

            {restaurant.workingHours && (
              <div className="info-row">
                <div className="info-icon"><Clock size={16} color="#d4a017" /></div>
                <div>
                  <p className="info-label">Ish vaqti</p>
                  <p className="info-value">{restaurant.workingHours}</p>
                </div>
              </div>
            )}

            {restaurant.wifi && (
              <div className="info-row">
                <div className="info-icon"><Wifi size={16} color="#d4a017" /></div>
                <div>
                  <p className="info-label">WiFi tarmog'i</p>
                  <p className="info-value">{restaurant.wifi}</p>
                  {restaurant.wifiPassword && (
                    <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                      🔐 Parol: <strong>{restaurant.wifiPassword}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={{ padding: "20px 20px 0" }}>
              <button
                onClick={() => setShowInfoModal(false)}
                style={{ width: "100%", padding: "14px", borderRadius: 16, background: "linear-gradient(135deg, #1a1410, #2d2015)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WAITER MODAL ───────────────────────────────────────────── */}
      {showWaiterModal && (
        <div className="modal-overlay" onClick={() => setShowWaiterModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />

            {waiterStatus === "called" ? (
              <div style={{ textAlign: "center", padding: "0 20px 20px" }}>
                <div className="success-check">
                  <CheckCircle size={36} color="#fff" />
                </div>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#1a1410", marginBottom: 8 }}>
                  Ofitsiant chaqirildi! ✅
                </p>
                <p style={{ fontSize: 14, color: "#9ca3af" }}>
                  Ofitsiant tez orada sizning stolingizga keladi.
                </p>
                <button
                  onClick={() => { setShowWaiterModal(false); setWaiterStatus("idle"); }}
                  style={{ marginTop: 24, width: "100%", padding: 14, borderRadius: 16, background: "linear-gradient(135deg, #1a1410, #2d2015)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}
                >
                  Yopish
                </button>
              </div>
            ) : (
              <div style={{ padding: "0 20px" }}>
                <p className="modal-title">🔔 Ofitsiant chaqirish</p>
                <p className="modal-subtitle">Xizmat turini tanlang</p>

                {[
                  { emoji: "🍽️", label: "Buyurtma berish", desc: "Menyu bo'yicha buyurtma bermoqchiman" },
                  { emoji: "🧾", label: "Hisob-kitob", desc: "To'lov qilmoqchiman" },
                  { emoji: "🥛", label: "Suv / Ichimlik", desc: "Qo'shimcha ichimlik kerak" },
                  { emoji: "🆘", label: "Boshqa muammo", desc: "Yordam kerak" },
                ].map(opt => (
                  <button
                    key={opt.label}
                    className="waiter-option-btn"
                    onClick={() => {
                      callWaiter(opt.label);
                      if (tableId) setShowWaiterModal(false);
                    }}
                  >
                    <div className="waiter-option-icon" style={{ background: "rgba(212,160,23,0.1)" }}>
                      {opt.emoji}
                    </div>
                    <div>
                      <p className="waiter-option-label">{opt.label}</p>
                      <p className="waiter-option-desc">{opt.desc}</p>
                    </div>
                    <ChevronRight size={16} color="#9ca3af" style={{ marginLeft: "auto" }} />
                  </button>
                ))}

                {!tableId && (
                  <div style={{ background: "#fff9e6", border: "1.5px solid rgba(212,160,23,0.3)", borderRadius: 14, padding: "12px 16px", marginTop: 4, marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: "#9a6f0e", fontWeight: 600 }}>
                      ⚠️ Stol aniqlanmadi. Ofitsiant chaqirish uchun QR kodingizni skanerlang yoki stoldagi ofitsiantdan so'rang.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowWaiterModal(false)}
                  style={{ width: "100%", padding: "13px", borderRadius: 16, border: "1.5px solid #e5e0d8", background: "#fff", color: "#6b6057", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 4 }}
                >
                  Bekor qilish
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
