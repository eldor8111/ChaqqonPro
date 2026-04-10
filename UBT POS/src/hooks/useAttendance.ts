import { useState, useEffect, useCallback } from 'react';

export interface AttendanceRecord {
    id: string;
    tenantId: string;
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
    ipAddress: string | null;
    deviceInfo: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AttendanceStats {
    total: number;
    active: number;
    completed: number;
    totalWorkMinutes: number;
    totalWorkHours: number;
}

export interface UseAttendanceReturn {
    currentAttendance: AttendanceRecord | null;
    isCheckedIn: boolean;
    loading: boolean;
    error: string | null;
    checkIn: (location?: string, notes?: string) => Promise<void>;
    checkOut: (location?: string, notes?: string) => Promise<void>;
    refreshAttendance: () => Promise<void>;
}

export function useAttendance(token: string | null, staffId?: string): UseAttendanceReturn {
    const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isCheckedIn = currentAttendance?.status === 'active';

    const getHeaders = useCallback(() => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (staffId) headers['x-staff-id'] = staffId;
        return headers;
    }, [token, staffId]);

    // Fetch current attendance status
    const refreshAttendance = useCallback(async () => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);

            const d = new Date();
            const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const response = await fetch(`/api/attendance?date=${today}${staffId ? `&staffId=${staffId}` : ''}`, {
                headers: getHeaders(),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to fetch attendance');
            }

            const data = await response.json();

            // Find today's active attendance
            const activeAttendance = data.attendances?.find(
                (a: AttendanceRecord) => a.status === 'active'
            );

            setCurrentAttendance(activeAttendance || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [token, staffId, getHeaders]);

    // Check in
    const checkIn = useCallback(async (location?: string, notes?: string) => {
        if (!token) {
            setError('Token topilmadi');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ location, notes }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Kirish belgilashda xatolik');
            }

            setCurrentAttendance(data.attendance);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [token, getHeaders]);

    // Check out
    const checkOut = useCallback(async (location?: string, notes?: string) => {
        if (!token) {
            setError('Token topilmadi');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/attendance', {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    attendanceId: currentAttendance?.id,
                    location,
                    notes,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Chiqish belgilashda xatolik');
            }

            setCurrentAttendance(data.attendance);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [token, getHeaders, currentAttendance?.id]);

    // Refresh on mount and when token/staffId changes
    useEffect(() => {
        refreshAttendance();
    }, [refreshAttendance]);

    return {
        currentAttendance,
        isCheckedIn,
        loading,
        error,
        checkIn,
        checkOut,
        refreshAttendance,
    };
}
