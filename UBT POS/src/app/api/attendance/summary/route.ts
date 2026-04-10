export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const tenantId = session.tenantId;

        const now = new Date();
        
        // Start of Current Month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Start of Current Week (Monday)
        const dayOfWeek = now.getDay(); // 0(Sun) to 6(Sat)
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() + diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // Fetch all attendances for the current month
        const attendances = await prisma.attendance.findMany({
            where: {
                tenantId,
                checkInTime: { gte: startOfMonth },
                // Active shifts might not have workDuration yet, so we filter out or treat as 0
            }
        });

        // Group by staffId
        const summaryMap: Record<string, { staffId: string; staffName: string; staffRole: string; weeklyMinutes: number; monthlyMinutes: number }> = {};

        for (const record of attendances) {
            if (!summaryMap[record.staffId]) {
                summaryMap[record.staffId] = {
                    staffId: record.staffId,
                    staffName: record.staffName || "Noma'lum",
                    staffRole: record.staffRole || "Xodim",
                    weeklyMinutes: 0,
                    monthlyMinutes: 0
                };
            }

            // If shift is still 'active', we dynamically calculate minutes up to NOW to provide realtime stats
            let duration = record.workDuration || 0;
            if (record.status === "active") {
                duration = Math.round((Date.now() - record.checkInTime.getTime()) / 60000);
            }

            summaryMap[record.staffId].monthlyMinutes += duration;

            if (record.checkInTime.getTime() >= startOfWeek.getTime()) {
                summaryMap[record.staffId].weeklyMinutes += duration;
            }
        }

        const statsList = Object.values(summaryMap);
        
        // Sort descending by total monthly minutes
        statsList.sort((a, b) => b.monthlyMinutes - a.monthlyMinutes);

        return NextResponse.json({ summary: statsList });
    } catch (error) {
        console.error("GET /api/attendance/summary error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
