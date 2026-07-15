"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { 
  X, Download, Printer, QrCode, Copy, Check, 
  ExternalLink, Smartphone, Info
} from "lucide-react";
import type { SmartTable } from "@/lib/store";

// ─── Props ───────────────────────────────────────────────────────────────────
interface QrCodeModalProps {
  table: SmartTable;
  tenantId: string;
  restaurantName?: string;
  onClose: () => void;
}

// ─── QR Code Modal ────────────────────────────────────────────────────────────
export default function QrCodeModal({
  table,
  tenantId,
  restaurantName = "Restoran",
  onClose,
}: QrCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(true);

  // Public menu URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://smart.e-code.uz";
  const menuUrl = `${baseUrl}/menu/${tenantId}?tableId=${table.id}`;

  // ── Generate QR ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    setGenerating(true);
    QRCode.toCanvas(canvasRef.current, menuUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#1a1410", light: "#fffaf0" },
      errorCorrectionLevel: "H",
    })
      .then(() => setGenerating(false))
      .catch(() => setGenerating(false));

    // Also generate data URL for download
    QRCode.toDataURL(menuUrl, {
      width: 600,
      margin: 3,
      color: { dark: "#1a1410", light: "#fffaf0" },
      errorCorrectionLevel: "H",
    }).then(url => setQrDataUrl(url));
  }, [menuUrl]);

  // ── Download QR ────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-${restaurantName}-${table.name}.png`;
    link.click();
  }, [qrDataUrl, restaurantName, table.name]);

  // ── Copy URL ───────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { }
  }, [menuUrl]);

  // ── Print QR ──────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const printWin = window.open("", "_blank", "width=600,height=700");
    if (!printWin) return;
    printWin.document.write(`
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8"/>
  <title>QR Kod — ${restaurantName} — ${table.name}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', serif;
      background: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      width: 320px;
      background: linear-gradient(160deg, #1a1410 0%, #2d2015 100%);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .card-top {
      padding: 20px 20px 16px;
      text-align: center;
      position: relative;
    }
    .ornament {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212,160,23,0.15), transparent);
      pointer-events: none;
    }
    .resto-name {
      font-size: 20px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 1px;
      text-shadow: 0 2px 12px rgba(0,0,0,0.4);
      margin-bottom: 4px;
    }
    .gold-line {
      height: 1.5px;
      background: linear-gradient(90deg, transparent, #d4a017, transparent);
      margin: 12px auto;
      width: 80%;
    }
    .table-badge-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 4px;
    }
    .table-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #d4a017, #b8860b);
      color: #1a1410;
      font-size: 13px;
      font-weight: 800;
      padding: 5px 16px;
      border-radius: 100px;
      box-shadow: 0 4px 16px rgba(212,160,23,0.5);
      letter-spacing: 0.5px;
    }
    .card-qr {
      background: #fffaf0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .qr-frame {
      padding: 12px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      border: 2px solid #f0ebe2;
    }
    .qr-img { width: 220px; height: 220px; display: block; }
    .scan-label {
      font-size: 12px;
      font-weight: 700;
      color: #9a6f0e;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      text-align: center;
    }
    .card-footer {
      background: #fffaf0;
      padding: 12px 20px 20px;
      text-align: center;
      border-top: 1.5px solid #f0ebe2;
    }
    .scan-instruction {
      font-size: 13px;
      color: #6b6057;
      line-height: 1.5;
      margin-bottom: 8px;
    }
    .url-text {
      font-size: 9px;
      color: #b8a99a;
      word-break: break-all;
    }
    .powered-by {
      font-size: 10px;
      color: #c4b8a8;
      margin-top: 10px;
    }
    .powered-by span { color: #d4a017; font-weight: 800; }
    @media print {
      body { padding: 0; }
      .card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-top">
      <div class="ornament" style="width:140px;height:140px;top:-40px;right:-30px;"></div>
      <div class="ornament" style="width:80px;height:80px;bottom:-20px;left:10px;"></div>
      <p class="resto-name">${restaurantName}</p>
      <div class="gold-line"></div>
      <div class="table-badge-wrap">
        <span class="table-badge">🪑 ${table.zone ? table.zone + " · " : ""}Stol ${table.name}</span>
      </div>
    </div>
    <div class="card-qr">
      <p class="scan-label">📱 Telefon kamerasini ulang</p>
      <div class="qr-frame">
        <img src="${qrDataUrl}" class="qr-img" alt="QR Kod"/>
      </div>
    </div>
    <div class="card-footer">
      <p class="scan-instruction">QR kodni skanerlang va bizning<br>menyumizni ko'ring 🍽️</p>
      <p class="url-text">${menuUrl}</p>
      <p class="powered-by">Powered by <span>EVIKO POS</span></p>
    </div>
  </div>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }<\/script>
</body>
</html>`);
    printWin.document.close();
  }, [qrDataUrl, restaurantName, table, menuUrl]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm relative"
        style={{ background: "linear-gradient(160deg, #1a1410, #2d2015)", borderRadius: 28, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,160,23,0.15)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ padding: "20px 20px 16px", position: "relative" }}>
          {/* Ornaments */}
          <div style={{ position: "absolute", width: 180, height: 180, top: -50, right: -40, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,160,23,0.12), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 100, height: 100, bottom: -30, left: 10, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,57,43,0.1), transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #d4a017, #b8860b)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(212,160,23,0.4)" }}>
                <QrCode size={20} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>QR Kod Menyusi</p>
                <p style={{ fontSize: 11, color: "rgba(212,160,23,0.7)", marginTop: 1 }}>Stol tablicka</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={16} color="rgba(255,255,255,0.7)" />
            </button>
          </div>

          {/* Gold divider */}
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.5), transparent)", margin: "0 0 14px" }} />

          {/* Restaurant + table info */}
          <p style={{ fontSize: 18, fontWeight: 900, color: "#fff", textAlign: "center", letterSpacing: 0.5, textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
            {restaurantName}
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #d4a017, #b8860b)", color: "#1a1410", fontSize: 12, fontWeight: 800, padding: "5px 14px", borderRadius: 100, boxShadow: "0 4px 16px rgba(212,160,23,0.4)" }}>
              🪑 {table.zone ? `${table.zone} · ` : ""}Stol {table.name}
            </span>
          </div>
        </div>

        {/* ── QR Canvas ── */}
        <div style={{ background: "#fffaf0", padding: "20px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#9a6f0e", letterSpacing: 0.8, textTransform: "uppercase" }}>
            📱 Telefon kamerasini ulang
          </p>
          <div style={{ padding: 12, background: "#fff", borderRadius: 18, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", border: "2px solid #f0ebe2", position: "relative" }}>
            {generating && (
              <div style={{ position: "absolute", inset: 12, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "#fffaf0", zIndex: 5 }}>
                <div style={{ width: 32, height: 32, border: "3px solid rgba(212,160,23,0.2)", borderTopColor: "#d4a017", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            )}
            <canvas ref={canvasRef} style={{ borderRadius: 8, display: "block" }} />
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>
            Skanerlang → Menyu ko'ring → Ofitsiant chaqiring
          </p>
        </div>

        {/* ── URL copy ── */}
        <div style={{ background: "#fffaf0", padding: "0 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e5e0d8", borderRadius: 12, padding: "8px 12px" }}>
            <Smartphone size={14} color="#9ca3af" />
            <p style={{ flex: 1, fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{menuUrl}</p>
            <button onClick={handleCopy} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: copied ? "#27ae60" : "#9a6f0e", background: "none", border: "none", cursor: "pointer" }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Nusxalandi" : "Nusxa"}
            </button>
          </div>
        </div>

        {/* ── Info tip ── */}
        <div style={{ background: "#fffaf0", padding: "0 20px 16px" }}>
          <div style={{ display: "flex", gap: 8, background: "rgba(212,160,23,0.06)", border: "1.5px solid rgba(212,160,23,0.2)", borderRadius: 12, padding: "10px 14px" }}>
            <Info size={14} color="#d4a017" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "#7a5f30", lineHeight: 1.5 }}>
              Chop etib, har bir stolga tablichka sifatida qo'ying. Mijozlar QR kodni skanerlaydi va menyu ochiladi.
            </p>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ padding: "0 20px 24px", display: "flex", gap: 10 }}>
          <button
            onClick={handleDownload}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <Download size={16} />
            Yuklab olish
          </button>
          <button
            onClick={handlePrint}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 16px", borderRadius: 14, background: "linear-gradient(135deg, #d4a017, #b8860b)", color: "#1a1410", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(212,160,23,0.4)", border: "none", transition: "all 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <Printer size={16} />
            Chop etish
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
