import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    // 1. Cookie session (admin dashboard)
    try {
        const cookieSession = await getSession();
        if (cookieSession?.tenantId) return cookieSession.tenantId;
    } catch {}

    // 2. Bearer token (POS terminal)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { clientPhone, messageBody } = body;

        if (!clientPhone || !messageBody) {
            return NextResponse.json({ error: "Ma'lumotlar to'liq emas (clientPhone yoki messageBody yetishmaydi)" }, { status: 400 });
        }

        // Fetch support credentials from SystemSettings config
        const sysRaw: any[] = await prisma.$queryRawUnsafe(`SELECT settingKey, settingValue FROM SystemSettings WHERE settingKey IN ('supportBotToken', 'supportChatId')`);
        let supportBotToken = "";
        let supportChatId = "";
        sysRaw.forEach((row) => {
            if (row.settingKey === "supportBotToken") supportBotToken = row.settingValue;
            if (row.settingKey === "supportChatId") supportChatId = row.settingValue;
        });

        if (!supportBotToken || !supportChatId) {
            return NextResponse.json({ error: "Super Admin tomonidan Telegram Bot Token yoki Chat ID ulanmagan. Tizim yordamchisi bilan bog'laning." }, { status: 500 });
        }

        // Fetch current Tenant info to attach Shop Code
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        const shopCode = tenant?.shopCode || "Noma'lum filial";
        const shopName = tenant?.shopName || "Noma'lum nomi";

        // Dispatch to Telegram
        const telegramReqUrl = `https://api.telegram.org/bot${supportBotToken}/sendMessage`;
        const textMessage = `🚨 *Yangi Texnik Yordam So'rovi* 🚨\n\n🏢 *Filial:* ${shopName} (${shopCode})\n📞 *Mijoz raqami / Aloqa r.:* ${clientPhone}\n\n💬 *Muammo / Xabar:*\n${messageBody}`;

        const tgRes = await fetch(telegramReqUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: supportChatId,
                text: textMessage,
                parse_mode: "Markdown"
            })
        });

        if (!tgRes.ok) {
            const tgErr = await tgRes.json().catch(() => ({}));
            console.error("[support] Telegram error:", tgErr);
            return NextResponse.json({ error: "Telegramga ulana olmadik. Keyinroq urinib ko'ring." }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Xabar muvaffaqiyatli yetkazildi!" });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[support]", msg);
        return NextResponse.json({ error: "Xabarni yuborishda xatolik yuz berdi" }, { status: 500 });
    }
}
