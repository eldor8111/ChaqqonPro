"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Users, Download, Search, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const getLocalToday = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

interface AttendanceRecord {
    id: string;
    staffId: string;
    staffName: string;
    staffRole: string;
    checkInTime: string;
    checkOutTime: string | null;
    workDuration: number | null;
    breakDuration: number;
    checkInLocation: string | null;
    checkOutLocation: string | null;
    notes: string | null;
    status: 'active' | 'completed';
}

interface AttendanceStats {
    total: number;
    active: number;
    completed: number;
    totalWorkMinutes: number;
    totalWorkHours: number;
}

export default function DavomatPage() {
    const { t } = useLang();
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState<AttendanceStats>({ total: 0, active: 0, completed: 0, totalWorkMinutes: 0, totalWorkHours: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState<string>(getLocalToday());
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [roleFilter, setRoleFilter] = useState<'all' | 'Kassir' | 'Ofitsiant'>('all');

    const [activeTab, setActiveTab] = useState<"daily" | "summary">("daily");
    const [summaryData, setSummaryData] = useState<any[]>([]);
    const [summaryLoading, setSummaryLoading] = useState(false);

    const fetchAttendances = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (dateFilter) params.append('date', dateFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const response = await fetch(`/api/attendance?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch attendance data');
            const data = await response.json();
            setAttendances(data.attendances || []);
            setStats(data.stats || { total: 0, active: 0, completed: 0, totalWorkMinutes: 0, totalWorkHours: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [dateFilter, statusFilter]);

    const fetchSummary = useCallback(async () => {
        try {
            setSummaryLoading(true);
            const response = await fetch("/api/attendance/summary");
            if (response.ok) {
                const data = await response.json();
                setSummaryData(data.summary || []);
            }
        } catch {} finally {
            setSummaryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "daily") fetchAttendances();
        else fetchSummary();
    }, [activeTab, fetchAttendances, fetchSummary]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return '--';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}s ${mins}d`;
    };

    const filteredAttendances = attendances.filter(a => {
        const matchesSearch = a.staffName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || a.staffRole === roleFilter;
        return matchesSearch && matchesRole;
    });

    const exportToCSV = () => {
        const headers = [t('staff.employee'), t('staff.role'), t('davomat.checkIn') || 'Kelgan vaqt', t('davomat.checkOut') || 'Ketgan vaqt', t('davomat.workTime') || 'Ish vaqti', t('common.status')];
        const rows = filteredAttendances.map(a => [
            a.staffName,
            a.staffRole,
            formatTime(a.checkInTime),
            a.checkOutTime ? formatTime(a.checkOutTime) : '--',
            formatDuration(a.workDuration),
            a.status === 'active' ? t('common.active') : t('davomat.completed') || 'Tugallangan'
        ]);
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `davomat-${dateFilter}.csv`;
        link.click();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.attendance')} {t('nav.reports')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('reports.subTitle')}</p>
                            </div>
                        </div>
                        <button onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors">
                            <Download className="w-4 h-4" />
                            {t('common.export')}
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 mt-6 border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => setActiveTab("daily")}
                            className={`pb-4 px-2 text-sm font-semibold transition-colors relative ${activeTab === "daily" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`}>
                            {t('reports.daily')} {t('nav.attendance')}
                            {activeTab === "daily" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
                        </button>
                        <button onClick={() => setActiveTab("summary")}
                            className={`pb-4 px-2 text-sm font-semibold transition-colors relative ${activeTab === "summary" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`}>
                            {t('reports.title')} ({t('reports.monthly')}/{t('reports.yearly')})
                            {activeTab === "summary" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
                        </button>
                    </div>
                </div>

                {activeTab === "summary" ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {summaryLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : summaryData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
                                <p>{t('common.noData')}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('staff.employee')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('staff.role')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t('reports.daily')} (hafta)</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider">{t('reports.monthly')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {summaryData.map(s => (
                                            <tr key={s.staffId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-bold text-xs">
                                                            {s.staffName.charAt(0)}
                                                        </div>
                                                        <p className="ml-3 text-sm font-medium text-gray-900 dark:text-white">{s.staffName}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                        {s.staffRole}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700 dark:text-blue-400 font-mono">{formatDuration(s.weeklyMinutes)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-sky-700 dark:text-sky-400 font-mono">{formatDuration(s.monthlyMinutes)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')} {t('nav.attendance')}</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.active')}</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.active}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('ecommerce.completed')}</p>
                                <p className="text-3xl font-bold text-gray-600 dark:text-gray-400 mt-1">{stats.completed}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')} ish vaqti</p>
                                <p className="text-3xl font-bold text-sky-600 dark:text-sky-400 mt-1">{stats.totalWorkHours}s</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text"
                                placeholder={t('staff.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.date')}</label>
                            <input type="date" value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.status')}</label>
                            <select value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                <option value="all">{t('inventory.all')}</option>
                                <option value="active">{t('common.active')}</option>
                                <option value="completed">{t('ecommerce.completed')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staff.role')}</label>
                            <select value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as any)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                <option value="all">{t('inventory.all')}</option>
                                <option value="Kassir">{t('nav.users_kassir')}</option>
                                <option value="Ofitsiant">{t('nav.users_ofitsiant')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-12 text-red-600">{error}</div>
                    ) : filteredAttendances.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                            <Calendar className="w-12 h-12 mb-3 opacity-50" />
                            <p>{t('common.noData')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('staff.employee')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('staff.role')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.date') + ' (kirish)'}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.date') + ' (chiqish)'}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ish vaqti</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredAttendances.map((attendance) => (
                                        <tr key={attendance.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center text-white font-bold text-sm">
                                                        {attendance.staffName.charAt(0)}
                                                    </div>
                                                    <p className="ml-3 text-sm font-medium text-gray-900 dark:text-white">{attendance.staffName}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    attendance.staffRole === 'Kassir'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        : 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                                                }`}>
                                                    {attendance.staffRole}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    {formatTime(attendance.checkInTime)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {attendance.checkOutTime ? (
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        {formatTime(attendance.checkOutTime)}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">--</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {formatDuration(attendance.workDuration)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {attendance.status === 'active' ? (
                                                    <span className="px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                        {t('common.active')}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                        {t('ecommerce.completed')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                </>
                )}
            </div>
        </div>
    );
}
