export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { hashPassword } from "@/lib/backend/auth";
import { sendSms } from "@/lib/backend/sms";
import crypto from "crypto";

// In-process memory caches for OTP and temporary tokens.
// In production with multiple instances this must move to Redis or a DB table.
const globalAny = global as any;

if (!globalAny.otpCache) {
    globalAny.otpCache = new Map<string, { code: string; expiresAt: number }>();
}
if (!globalAny.resetTokenCache) {
    globalAny.resetTokenCache = new Map<string, { phone: string; expiresAt: number }>();
}

const otpCache: Map<string, { code: string; expiresAt: number }> = globalAny.otpCache;
const resetTokenCache: Map<string, { phone: string; expiresAt: number }> = globalAny.resetTokenCache;

function maskPhone(phone: string) {
    if (phone.length <= 6) return "***";
    return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, phone, code, token, newPassword } = body;

        if (!phone) {
            return NextResponse.json({ success: false, error: "Telefon raqami kiritilmadi" }, { status: 400 });
        }

        const normalizedPhone = phone.replace(/\s+/g, "");

        if (action === "send-code") {
            const tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { phone: normalizedPhone },
                        { adminUsername: normalizedPhone },
                        { phone },
                    ],
                },
            });

            if (!tenant) {
                return NextResponse.json({ success: false, error: "Ushbu raqam yoki foydalanuvchi tizimda topilmadi" });
            }

            const otpCode = crypto.randomInt(100000, 1000000).toString();
            const message = `Sizning SMART tizimi uchun tasdiqlash kodingiz: ${otpCode}`;

            try {
                await sendSms(normalizedPhone, message);
            } catch {
                console.error("SMS jo'natish ishlamadi", { phone: maskPhone(normalizedPhone) });
                return NextResponse.json(
                    { success: false, error: "SMS yuborib bo'lmadi. Keyinroq qayta urinib ko'ring" },
                    { status: 502 }
                );
            }

            otpCache.set(normalizedPhone, {
                code: otpCode,
                expiresAt: Date.now() + 3 * 60 * 1000,
            });

            console.info("OTP SMS yuborildi", { phone: maskPhone(normalizedPhone) });
            return NextResponse.json({ success: true, message: "Kod yuborildi" });
        }

        if (action === "verify-code") {
            if (!code) {
                return NextResponse.json({ success: false, error: "Kod kiritilmadi" });
            }

            const cachedOtp = otpCache.get(normalizedPhone);
            if (!cachedOtp || cachedOtp.code !== code || cachedOtp.expiresAt < Date.now()) {
                return NextResponse.json({ success: false, error: "Tasdiqlash kodi noto'g'ri yoki uning yaroqlilik vaqti tugagan" });
            }

            otpCache.delete(normalizedPhone);
            const resetToken = crypto.randomBytes(32).toString("hex");

            resetTokenCache.set(resetToken, {
                phone: normalizedPhone,
                expiresAt: Date.now() + 15 * 60 * 1000,
            });

            return NextResponse.json({ success: true, token: resetToken });
        }

        if (action === "reset") {
            if (!token || !newPassword || newPassword.length < 6) {
                return NextResponse.json({ success: false, error: "Barcha maydonlarni to'g'ri to'ldiring" });
            }

            const cachedToken = resetTokenCache.get(token);
            if (!cachedToken || cachedToken.phone !== normalizedPhone || cachedToken.expiresAt < Date.now()) {
                return NextResponse.json({ success: false, error: "Xavfsizlik tokeni eskirgan, jarayonni boshidan boshlang" });
            }

            const tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { phone: normalizedPhone },
                        { adminUsername: normalizedPhone },
                    ],
                },
            });

            if (!tenant) {
                return NextResponse.json({ success: false, error: "Foydalanuvchi topilmadi" });
            }

            const newHash = await hashPassword(newPassword);
            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { adminPasswordHash: newHash },
            });

            resetTokenCache.delete(token);

            return NextResponse.json({ success: true, message: "Parol muvaffaqiyatli saqlandi" });
        }

        return NextResponse.json({ success: false, error: "Noto'g'ri amal" }, { status: 400 });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ success: false, error: "Ichki server xatoligi" }, { status: 500 });
    }
}
