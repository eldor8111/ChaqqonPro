"use client";
import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

const UZ_MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const UZ_DAYS   = ["Du","Se","Ch","Pa","Ju","Sh","Ya"];

export type DateRange = { from: string; to: string } | null; // ISO date strings "YYYY-MM-DD"

type Mode = "preset" | "calendar";

interface Props {
    value: {
        timeframe: string;
        range: DateRange;
    };
    onChange: (v: { timeframe: string; range: DateRange }) => void;
}

const PRESETS = [
    { id: "today", label: "Bugun" },
    { id: "week",  label: "7 kun" },
    { id: "month", label: "Shu oy" },
    { id: "year",  label: "Shu yil" },
    { id: "all",   label: "Barchasi" },
];

function toIso(d: Date) {
    return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
    // Convert Sunday=0 to Monday-first: Mon=0...Sun=6
    return (new Date(year, month, 1).getDay() + 6) % 7;
}

export default function DateRangePicker({ value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("preset");

    // Calendar state
    const now = new Date();
    const [viewYear,  setViewYear]  = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [hoverDay,  setHoverDay]  = useState<string | null>(null);

    // Active range being built
    const [picking, setPicking] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });

    const selectedLabel = () => {
        if (value.range) {
            return `${value.range.from.slice(5)} — ${value.range.to.slice(5)}`;
        }
        return PRESETS.find(p => p.id === value.timeframe)?.label ?? "Tanlang";
    };

    function prevMonth() {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    }

    function handleDayClick(iso: string) {
        if (!picking.from || (picking.from && picking.to)) {
            setPicking({ from: iso, to: null });
        } else {
            const from = picking.from!;
            const to   = iso >= from ? iso : from;
            const realFrom = iso < from ? iso : from;
            setPicking({ from: realFrom, to });
            setOpen(false);
            onChange({ timeframe: "custom", range: { from: realFrom, to } });
        }
    }

    function inRange(iso: string) {
        const { from, to } = picking;
        if (!from) return false;
        const end = to ?? hoverDay;
        if (!end) return false;
        const [a, b] = from <= end ? [from, end] : [end, from];
        return iso > a && iso < b;
    }

    function isStart(iso: string) { return iso === picking.from; }
    function isEnd(iso: string)   { return picking.to ? iso === picking.to : iso === hoverDay && iso !== picking.from; }

    const totalDays = daysInMonth(viewYear, viewMonth);
    const firstDay  = firstDayOfMonth(viewYear, viewMonth);
    const days: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= totalDays; d++) {
        days.push(toIso(new Date(viewYear, viewMonth, d)));
    }

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 shadow-sm hover:border-blue-400 hover:shadow-md transition-all active:scale-[0.98] whitespace-nowrap"
            >
                <Calendar size={14} className="text-blue-500" />
                {selectedLabel()}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" style={{ minWidth: 300 }}>

                        {/* Tab Header */}
                        <div className="flex border-b border-slate-100">
                            <button onClick={() => setMode("preset")} className={`flex-1 py-2.5 text-xs font-bold transition-colors ${mode === "preset" ? "text-blue-600 bg-blue-50 border-b-2 border-blue-500" : "text-slate-500 hover:bg-slate-50"}`}>
                                📋 Tayyor
                            </button>
                            <button onClick={() => setMode("calendar")} className={`flex-1 py-2.5 text-xs font-bold transition-colors ${mode === "calendar" ? "text-blue-600 bg-blue-50 border-b-2 border-blue-500" : "text-slate-500 hover:bg-slate-50"}`}>
                                📅 Kalendar
                            </button>
                        </div>

                        {/* Preset Mode */}
                        {mode === "preset" && (
                            <div className="py-1">
                                {PRESETS.map(opt => {
                                    const active = value.timeframe === opt.id && !value.range;
                                    return (
                                        <button key={opt.id}
                                            onClick={() => { onChange({ timeframe: opt.id, range: null }); setPicking({ from: null, to: null }); setOpen(false); }}
                                            className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"}`}>
                                            {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Calendar Mode */}
                        {mode === "calendar" && (
                            <div className="p-4">
                                {/* Month nav */}
                                <div className="flex items-center justify-between mb-3">
                                    <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                                        <ChevronLeft size={16} className="text-slate-500" />
                                    </button>
                                    <p className="text-sm font-bold text-slate-800">{UZ_MONTHS[viewMonth]} {viewYear}</p>
                                    <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                                        <ChevronRight size={16} className="text-slate-500" />
                                    </button>
                                </div>

                                {/* Day headers */}
                                <div className="grid grid-cols-7 mb-1">
                                    {UZ_DAYS.map(d => (
                                        <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                                    ))}
                                </div>

                                {/* Day cells */}
                                <div className="grid grid-cols-7 gap-y-0.5">
                                    {days.map((iso, i) => {
                                        if (!iso) return <div key={i} />;
                                        const day  = parseInt(iso.slice(-2));
                                        const start = isStart(iso);
                                        const end   = isEnd(iso);
                                        const range = inRange(iso);
                                        const today = iso === toIso(now);
                                        return (
                                            <button
                                                key={iso}
                                                onClick={() => handleDayClick(iso)}
                                                onMouseEnter={() => setHoverDay(iso)}
                                                onMouseLeave={() => setHoverDay(null)}
                                                className={[
                                                    "h-8 w-full text-xs font-bold transition-all",
                                                    start || end ? "bg-blue-500 text-white rounded-lg shadow-sm" : "",
                                                    range ? "bg-blue-100 text-blue-700 rounded-none" : "",
                                                    !start && !end && !range ? "text-slate-700 hover:bg-slate-100 rounded-lg" : "",
                                                    today && !start && !end ? "ring-1 ring-blue-400 ring-inset rounded-lg" : "",
                                                ].join(" ")}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Hint */}
                                <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">
                                    {!picking.from ? "Boshlanish kunini tanlang" : "Tugash kunini tanlang"}
                                </p>

                                {/* Clear */}
                                {value.range && (
                                    <button onClick={() => { onChange({ timeframe: "today", range: null }); setPicking({ from: null, to: null }); setOpen(false); }}
                                        className="w-full mt-2 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors">
                                        <X size={12} /> Tozalash
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
