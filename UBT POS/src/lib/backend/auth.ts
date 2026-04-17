import bcryptjs from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./db";
import { cookies } from "next/headers";

// ─── Session in-memory cache (5 daqiqa TTL) ────────────────────────────────
// DB ga har so'rovda bormaslik uchun. Logout da o'chiriladi.
type CachedSession = {
    data: Awaited<ReturnType<typeof prisma.session.findUnique>>;
    expiresAt: number;
};
const _sessionCache = new Map<string, CachedSession>();
const SESSION_CACHE_TTL = 5 * 60_000; // 5 daqiqa

function cacheGetSession(token: string) {
    const entry = _sessionCache.get(token);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) { _sessionCache.delete(token); return undefined; }
    return entry.data;
}
function cacheSetSession(token: string, data: CachedSession["data"]) {
    _sessionCache.set(token, { data, expiresAt: Date.now() + SESSION_CACHE_TTL });
}
function cacheDelSession(token: string) {
    _sessionCache.delete(token);
}

const SESSION_COOKIE_NAME = "ubt_session";
const SESSION_EXPIRY_HOURS = 24 * 7; // 7 days for admin sessions

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
    return bcryptjs.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
}

/**
 * Create a session and set HTTP-only cookie
 */
export async function createSession(
    userId: string,
    tenantId: string | null,
    role: "SUPER_ADMIN" | "ADMIN" | "KASSIR"
) {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    // Save session to database
    await prisma.session.create({
        data: {
            token,
            userId,
            tenantId,
            role,
            expiresAt,
        },
    });

    const cookieStore = await cookies();
    const cookieName = role === "SUPER_ADMIN" ? "ubt_super_session" : SESSION_COOKIE_NAME;

    cookieStore.set(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_EXPIRY_HOURS * 60 * 60,
    });

    return token;
}

/**
 * Get current session from request (for ordinary users)
 */
export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    // 1. Cache dan tekshirish (DB ga bormaydi)
    const cached = cacheGetSession(token);
    if (cached !== undefined) {
        if (!cached || cached.expiresAt < new Date()) { cacheDelSession(token); return null; }
        return cached;
    }

    // 2. Cache miss — DB dan olish
    const session = await prisma.session.findUnique({ where: { token } });

    if (!session || session.expiresAt < new Date()) {
        if (session) { prisma.session.delete({ where: { token } }).catch(() => {}); }
        cacheSetSession(token, null);
        return null;
    }

    cacheSetSession(token, session);
    return session;
}

/**
 * Get current SUPER ADMIN session
 */
export async function getSuperSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("ubt_super_session")?.value;

    if (!token) return null;

    // Cache dan tekshirish
    const cached = cacheGetSession(token);
    if (cached !== undefined) {
        if (!cached || cached.expiresAt < new Date()) { cacheDelSession(token); return null; }
        return cached;
    }

    const session = await prisma.session.findUnique({ where: { token } });

    if (!session || session.expiresAt < new Date()) {
        if (session) { prisma.session.delete({ where: { token } }).catch(() => {}); }
        cacheSetSession(token, null);
        return null;
    }

    cacheSetSession(token, session);
    return session;
}

/**
 * Delete normal session
 */
export async function deleteSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
        cacheDelSession(token); // Cache dan ham o'chirish
        await prisma.session.deleteMany({ where: { token } });
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Delete super admin session
 */
export async function deleteSuperSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("ubt_super_session")?.value;

    if (token) {
        cacheDelSession(token); // Cache dan ham o'chirish
        await prisma.session.deleteMany({ where: { token } });
    }

    cookieStore.delete("ubt_super_session");
}

/**
 * Generate a random session token
 */
function generateToken(): string {
    return randomBytes(32).toString("hex"); // 64 char, kriptografik xavfsiz
}

/**
 * Expired sessionlarni batch tozalash
 * getSession() da ~1% ehtimol bilan avtomatik chaqiriladi (DB yukini kamaytiradi)
 */
export async function cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
}

/**
 * Authenticate admin with shop code + username + password
 */
export async function authenticateAdmin(shopCode: string | null, username: string, password: string) {
    let tenant: any = null;

    // Normalize: remove all spaces from phone number (e.g. "+998 77 123 45 67" -> "+998771234567")
    const normalizedUsername = username.replace(/\s+/g, "");

    if (shopCode) {
        // shopCode bilan bitta query
        tenant = await prisma.tenant.findUnique({ where: { shopCode } });
    } else {
        // Avval bitta OR query bilan barcha variantlarni qidiramiz (4-5 query o'rniga 1 ta)
        const orConditions: object[] = [
            { adminUsername: normalizedUsername },
            { phone: normalizedUsername },
        ];
        if (normalizedUsername !== username) {
            orConditions.push({ adminUsername: username });
            orConditions.push({ phone: username });
        }
        tenant = await prisma.tenant.findFirst({ where: { OR: orConditions } });
    }

    if (!tenant || tenant.status !== "active") {
        return { success: false, error: "Hisob topilmadi yoki to'xtatilgan" };
    }

    // Obuna muddati tekshirish login vaqtida o'chirildi - expired foydalanuvchilar ham kirishlari mumkin
    // Ammo ular faqat billing sahifasini ko'radi (Sidebar'da cheklangan)

    const passwordValid = await verifyPassword(password, tenant.adminPasswordHash);

    // Check password and that username matches (normalized comparison)
    const usernameMatches =
        tenant.adminUsername === normalizedUsername ||
        tenant.adminUsername === username ||
        tenant.phone === normalizedUsername ||
        tenant.phone === username;

    if (!passwordValid || !usernameMatches) {
        return { success: false, error: "Login yoki parol noto'g'ri" };
    }

    await createSession(tenant.id, tenant.id, "ADMIN");

    let tenantSettings: Record<string, unknown> = {};
    try { if ((tenant as any).settings) tenantSettings = JSON.parse((tenant as any).settings); } catch {}

    return {
        success: true,
        tenant: {
            id: tenant.id,
            shopCode: tenant.shopCode,
            shopName: tenant.shopName,
            plan: tenant.plan,
            settings: tenantSettings,
            expiresAt: tenant.expiresAt,
        },
    };
}

/**
 * Authenticate super admin with password
 */
export async function authenticateSuperAdmin(password: string) {
    const superAdmin = await prisma.superAdmin.findFirst();

    if (!superAdmin) {
        return { success: false, error: "Super admin topilmadi" };
    }

    const passwordValid = await verifyPassword(password, superAdmin.passwordHash);

    if (!passwordValid) {
        return { success: false, error: "Parol noto'g'ri" };
    }

    await createSession("superadmin", null, "SUPER_ADMIN");

    return { success: true };
}

/**
 * Authenticate PlatformUser (Super Admin Panel staff)
 */
export async function authenticatePlatformUser(phone: string, password: string) {
    const normalizedPhone = phone.replace(/\s+/g, "");
    const user = await prisma.platformUser.findUnique({ where: { phone: normalizedPhone } });

    if (!user || user.status !== "active") {
        return { success: false, error: "Hisob topilmadi yoki to'xtatilgan" };
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
        return { success: false, error: "Telefon yoki parol noto'g'ri" };
    }

    await createSession(user.id, null, "SUPER_ADMIN");

    return { 
        success: true, 
        user: { 
            id: user.id, 
            name: user.name,
            role: user.role, 
            permissions: JSON.parse(user.permissions || "[]"),
            agentCode: user.agentCode
        } 
    };
}

/**
 * Authenticate kassir with username + password
 */
export async function authenticateKassir(username: string, password: string, tenantId: string) {
    const staff = await prisma.staff.findFirst({
        where: {
            tenantId,
            username,
            status: "active",
        },
    });

    if (!staff) {
        return { success: false, error: "Kassir topilmadi" };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.status !== "active") {
        return { success: false, error: "Do'kon topilmadi yoki to'xtatilgan" };
    }

    if (tenant.expiresAt && new Date(tenant.expiresAt) < new Date()) {
        return { success: false, error: "Obuna muddati tugagan. Kassa vaqtincha bloklandi! Iltimos admin bilan bog'laning." };
    }

    const passwordValid = await verifyPassword(password, staff.passwordHash);

    if (!passwordValid) {
        return { success: false, error: "Parol noto'g'ri" };
    }

    let permissions: string[] = [];
    try { if (staff.permissions) permissions = JSON.parse(staff.permissions); } catch {}

    // Manablog (POS Apparat) roli uchun pos huquqi tekshirilmaydi
    // ularga maxsus ruxsat berilgan, chunki ular POS qurilmasining o'zi
    const isManablog = staff.role === "Manablog";

    if (!isManablog && !permissions.includes("pos")) {
        return { success: false, error: "Sizda kassa tizimiga kirish huquqi yo'q" };
    }

    await createSession(staff.id, tenantId, "KASSIR");

    return {
        success: true,
        staff: {
            id: staff.id,
            name: staff.name,
            branch: staff.branch,
            permissions,
        },
    };
}
