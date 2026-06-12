'use client';

import React, { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { Clock, LogIn, LogOut, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface AttendanceWidgetProps {
    token: string | null;
    staffId?: string;
    staffName?: string;
    lang?: 'uz' | 'ru' | 'en';
    dark?: boolean;
    compact?: boolean;
}

export default function AttendanceWidget({
    token,
    staffId,
    staffName,
    lang = 'uz',
    dark = false,
    compact = false
}: AttendanceWidgetProps) {
    const {
        currentAttendance,
        isCheckedIn,
        loading,
        error,
        checkIn,
        checkOut,
    } = useAttendance(token, staffId);

    const [showSuccess, setShowSuccess] = useState(false);

    const translations = {
        uz: {
            title: 'Davomat',
            checkIn: 'Kelgan vaqtini belgilash',
            checkOut: 'Ketgan vaqtini belgilash',
            checkedIn: 'Kirilgan',
            checkedOut: 'Chiqilgan',
            workTime: 'Ish vaqti',
            checkInTime: 'Kelgan vaqt',
            checkOutTime: 'Ketgan vaqt',
            notCheckedIn: 'Hali kirilmagan',
            success: 'Muvaffaqiyatli!',
            hours: 'soat',
            minutes: 'daqiqa',
        },
        ru: {
            title: 'Посещаемость',
            checkIn: 'Отметить приход',
            checkOut: 'Отметить уход',
            checkedIn: 'Вошел',
            checkedOut: 'Вышел',
            workTime: 'Рабочее время',
            checkInTime: 'Время прихода',
            checkOutTime: 'Время ухода',
            notCheckedIn: 'Еще не вошел',
            success: 'Успешно!',
            hours: 'часов',
            minutes: 'минут',
        },
        en: {
            title: 'Attendance',
            checkIn: 'Check In',
            checkOut: 'Check Out',
            checkedIn: 'Checked In',
            checkedOut: 'Checked Out',
            workTime: 'Work Time',
            checkInTime: 'Check-in Time',
            checkOutTime: 'Check-out Time',
            notCheckedIn: 'Not checked in yet',
            success: 'Success!',
            hours: 'hours',
            minutes: 'minutes',
        },
    };

    const t = translations[lang];

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return '--';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}${t.hours} ${mins}${t.minutes}`;
    };

    const handleCheckIn = async () => {
        try {
            await checkIn('POS');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            // Error is handled by the hook
        }
    };

    const handleCheckOut = async () => {
        try {
            await checkOut('POS');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            // Error is handled by the hook
        }
    };

    if (!token) return null;

    const bgClass = dark ? 'bg-gray-800' : 'bg-white';
    const textClass = dark ? 'text-gray-100' : 'text-gray-900';
    const mutedClass = dark ? 'text-gray-400' : 'text-gray-600';
    const borderClass = dark ? 'border-gray-700' : 'border-gray-200';

    if (compact) {
        return (
            <div className={`${bgClass} ${textClass} rounded-lg border ${borderClass} p-3`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{t.title}</span>
                    </div>

                    {isCheckedIn ? (
                        <button
                            onClick={handleCheckOut}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            {t.checkOut}
                        </button>
                    ) : (
                        <button
                            onClick={handleCheckIn}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <LogIn className="w-3.5 h-3.5" />
                            {t.checkIn}
                        </button>
                    )}
                </div>

                {currentAttendance && (
                    <div className={`mt-2 pt-2 border-t ${borderClass} text-xs ${mutedClass}`}>
                        {t.checkInTime}: {formatTime(currentAttendance.checkInTime)}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`${bgClass} ${textClass} rounded-lg border ${borderClass} shadow-sm overflow-hidden`}>
            {/* Header */}
            <div className={`px-4 py-3 border-b ${borderClass} bg-gradient-to-r ${dark ? 'from-gray-700 to-gray-800' : 'from-gray-50 to-gray-100'}`}>
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">{t.title}</h3>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Success Message */}
                {showSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-md">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            {t.success}
                        </span>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                    </div>
                )}

                {/* Status */}
                <div className="space-y-3">
                    {currentAttendance ? (
                        <>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${mutedClass}`}>{t.checkInTime}:</span>
                                <span className="font-medium">
                                    {formatTime(currentAttendance.checkInTime)}
                                </span>
                            </div>

                            {currentAttendance.checkOutTime && (
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm ${mutedClass}`}>{t.checkOutTime}:</span>
                                    <span className="font-medium">
                                        {formatTime(currentAttendance.checkOutTime)}
                                    </span>
                                </div>
                            )}

                            {currentAttendance.workDuration !== null && (
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm ${mutedClass}`}>{t.workTime}:</span>
                                    <span className="font-semibold text-blue-600">
                                        {formatDuration(currentAttendance.workDuration)}
                                    </span>
                                </div>
                            )}

                            <div className={`flex items-center gap-2 p-2 rounded ${
                                isCheckedIn
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                    isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                }`} />
                                <span className="text-sm font-medium">
                                    {isCheckedIn ? t.checkedIn : t.checkedOut}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className={`p-3 rounded text-center ${mutedClass}`}>
                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t.notCheckedIn}</p>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="pt-2">
                    {isCheckedIn ? (
                        <button
                            onClick={handleCheckOut}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <LogOut className="w-5 h-5" />
                            {loading ? 'Yuborilmoqda...' : t.checkOut}
                        </button>
                    ) : (
                        <button
                            onClick={handleCheckIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <LogIn className="w-5 h-5" />
                            {loading ? 'Yuborilmoqda...' : t.checkIn}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
