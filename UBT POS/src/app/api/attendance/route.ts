/**
 * /api/attendance — Davomat (Kirish/Chiqish) API
 *
 * GET    - Davomat hisobotini olish
 * POST   - Kirish (Check-in)
 * PUT    - Chiqish (Check-out)
 * PATCH  - Tanaffus vaqtini yangilash
 */

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";
import { getBusinessDayBounds } from "@/lib/backend/dateUtils";

async function getTenantDayRefreshTime(tenantId: string): Promise<string> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.settings) return "00:00";
    try {
        const parsed = JSON.parse(tenant.settings as string);
        return parsed.dayRefreshTime || "00:00";
    } catch {
        return "00:00";
    }
}

// ─── Auth Helper ────────────────────────────────────────────────────────────
async function getAuthInfo(request: NextRequest): Promise<{tenantId: string; staffId?: string; staffName?: string} | null> {
    const authHeader = request.headers.get("Authorization");
    const staffIdHeader = request.headers.get("x-staff-id");

    // 1. Agar kassir/ofitsiant POS interfeysidan kiritayotgan bo'lsa (JWT token):
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            return {
                tenantId: payload.tenantId as string,
                // POS device token assigns device id to payload.id. If 'x-staff-id' is passed, use that instead.
                staffId: staffIdHeader || (payload.userId || payload.id) as string,
                staffName: payload.name as string
            };
        } catch (err) {
            console.error("JWT verify error:", err);
        }
    }

    // 2. Agar admin panel orqali kirgan bo'lsa (Cookie session):
    try {
        const session = await getSession();
        if (session?.tenantId) {
            return { 
                tenantId: session.tenantId,
                staffId: staffIdHeader || undefined 
            };
        }
    } catch {}

    return null;
}

// ─── GET: Davomat hisoboti ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthInfo(request);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const staffId = searchParams.get("staffId"); // Agar aniq xodim kerak bo'lsa
        const date = searchParams.get("date"); // 2026-03-26
        const from = searchParams.get("from"); // 2026-03-01
        const to = searchParams.get("to"); // 2026-03-31
        const status = searchParams.get("status"); // active, completed

        const where: any = { tenantId: auth.tenantId };

        // Filter by staff
        if (staffId) {
            where.staffId = staffId;
        }

        // Filter by date
        if (date) {
            const refreshTime = await getTenantDayRefreshTime(auth.tenantId);
            const bounds = getBusinessDayBounds(new Date(date), refreshTime, false);
            where.checkInTime = {
                gte: bounds.start,
                lte: bounds.end
            };
        } else if (from && to) {
            where.checkInTime = {
                gte: new Date(from),
                lte: new Date(to)
            };
        }

        // Filter by status
        if (status) {
            where.status = status;
        }

        const attendances = await prisma.attendance.findMany({
            where,
            orderBy: { checkInTime: 'desc' },
            take: 100
        });

        // Calculate statistics
        const stats = {
            total: attendances.length,
            active: attendances.filter(a => a.status === 'active').length,
            completed: attendances.filter(a => a.status === 'completed').length,
            totalWorkMinutes: attendances.reduce((sum, a) => sum + (a.workDuration || 0), 0),
            totalWorkHours: Math.round(attendances.reduce((sum, a) => sum + (a.workDuration || 0), 0) / 60 * 10) / 10
        };

        return NextResponse.json({ attendances, stats });

    } catch (error) {
        console.error("GET /api/attendance error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}

// ─── POST: Kirish (Check-in) ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthInfo(request);
        if (!auth || !auth.staffId) {
            return NextResponse.json({ error: "Unauthorized - staffId kerak" }, { status: 401 });
        }

        const body = await request.json();
        const { location, notes } = body;

        const tenantId = auth.tenantId;
        const staffId = auth.staffId;

        // Check if already checked in today (hali check-out qilmagan)
        const refreshTime = await getTenantDayRefreshTime(tenantId);
        const bounds = getBusinessDayBounds(new Date(), refreshTime, true);

        const existing = await prisma.attendance.findFirst({
            where: {
                tenantId,
                staffId,
                checkInTime: { gte: bounds.start },
                status: 'active'
            }
        });

        if (existing) {
            return NextResponse.json({
                error: "Siz bugun allaqachon kirish belgilagansiz",
                attendance: existing
            }, { status: 400 });
        }

        // Get staff info
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { name: true, role: true }
        });

        if (!staff) {
            return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
        }

        // Create attendance record
        const attendance = await prisma.attendance.create({
            data: {
                tenantId,
                staffId,
                staffName: staff.name,
                staffRole: staff.role,
                checkInTime: new Date(),
                checkInLocation: location || "POS",
                notes: notes || null,
                status: "active",
                ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
                deviceInfo: request.headers.get("user-agent") || null
            }
        });

        return NextResponse.json({
            success: true,
            message: "Kirish muvaffaqiyatli belgilandi",
            attendance
        });

    } catch (error) {
        console.error("POST /api/attendance error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}

// ─── PUT: Chiqish (Check-out) ───────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    try {
        const auth = await getAuthInfo(request);
        if (!auth || !auth.staffId) {
            return NextResponse.json({ error: "Unauthorized - staffId kerak" }, { status: 401 });
        }

        const body = await request.json();
        const { attendanceId, location, notes } = body;

        const tenantId = auth.tenantId;
        const staffId = auth.staffId;

        // Find active attendance
        let attendance;
        if (attendanceId) {
            attendance = await prisma.attendance.findUnique({
                where: { id: attendanceId }
            });
        } else {
            // Find today's active attendance
            const refreshTime = await getTenantDayRefreshTime(tenantId);
            const bounds = getBusinessDayBounds(new Date(), refreshTime, true);

            attendance = await prisma.attendance.findFirst({
                where: {
                    tenantId,
                    staffId,
                    checkInTime: { gte: bounds.start },
                    status: 'active'
                }
            });
        }

        if (!attendance) {
            return NextResponse.json({
                error: "Faol davomat topilmadi. Avval kirish belgisini qo'ying."
            }, { status: 404 });
        }

        if (attendance.staffId !== staffId) {
            return NextResponse.json({ error: "Bu sizning davomatingiz emas" }, { status: 403 });
        }

        // Calculate work duration
        const checkOutTime = new Date();
        const workDuration = Math.round((checkOutTime.getTime() - attendance.checkInTime.getTime()) / 60000); // minutes

        // Update attendance
        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime,
                checkOutLocation: location || "POS",
                workDuration,
                status: "completed",
                notes: notes || attendance.notes
            }
        });

        return NextResponse.json({
            success: true,
            message: "Chiqish muvaffaqiyatli belgilandi",
            attendance: updated,
            workDuration: {
                minutes: workDuration,
                hours: Math.floor(workDuration / 60),
                remainingMinutes: workDuration % 60
            }
        });

    } catch (error) {
        console.error("PUT /api/attendance error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}

// ─── PATCH: Tanaffus vaqtini yangilash ─────────────────────────────────────
export async function PATCH(request: NextRequest) {
    try {
        const auth = await getAuthInfo(request);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { attendanceId, breakDuration, notes } = body;

        if (!attendanceId) {
            return NextResponse.json({ error: "attendanceId kerak" }, { status: 400 });
        }

        const attendance = await prisma.attendance.findUnique({
            where: { id: attendanceId }
        });

        if (!attendance || attendance.tenantId !== auth.tenantId) {
            return NextResponse.json({ error: "Davomat topilmadi" }, { status: 404 });
        }

        const updated = await prisma.attendance.update({
            where: { id: attendanceId },
            data: {
                breakDuration: breakDuration !== undefined ? breakDuration : attendance.breakDuration,
                notes: notes !== undefined ? notes : attendance.notes
            }
        });

        return NextResponse.json({ success: true, attendance: updated });

    } catch (error) {
        console.error("PATCH /api/attendance error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}

// ─── DELETE: Davomat yozuvini o'chirish (Admin faqat) ──────────────────────
export async function DELETE(request: NextRequest) {
    try {
        const auth = await getAuthInfo(request);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id kerak" }, { status: 400 });
        }

        const attendance = await prisma.attendance.findUnique({
            where: { id }
        });

        if (!attendance || attendance.tenantId !== auth.tenantId) {
            return NextResponse.json({ error: "Davomat topilmadi" }, { status: 404 });
        }

        await prisma.attendance.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE /api/attendance error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}
