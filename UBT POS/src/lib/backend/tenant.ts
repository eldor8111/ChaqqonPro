import { getSession } from "./auth";
import { prisma } from "./db";

/**
 * Get tenant ID from current session
 * Throws error if user is not authenticated or is not an admin/kassir
 */
export async function getTenantId(): Promise<string> {
    const session = await getSession();

    if (!session || !session.tenantId || session.role === "SUPER_ADMIN") {
        throw new Error("Unauthorized: No tenant context");
    }

    return session.tenantId;
}

/**
 * Verify user is super admin
 */
export async function requireSuperAdmin(): Promise<boolean> {
    const session = await getSession();
    return session?.role === "SUPER_ADMIN" || false;
}

/**
 * Verify user is admin (not kassir)
 */
export async function requireAdmin(): Promise<boolean> {
    const session = await getSession();
    return session?.role === "ADMIN" || false;
}

/**
 * Verify user is kassir
 */
export async function requireKassir(): Promise<boolean> {
    const session = await getSession();
    return session?.role === "KASSIR" || false;
}

/**
 * Verify user has specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
    const session = await getSession();

    if (!session) {
        return false;
    }

    if (session.role === "SUPER_ADMIN") {
        return true; // Super admin has all permissions
    }

    if (session.role === "ADMIN") {
        return true; // Admin has all permissions
    }

    // KASSIR uchun DB dan permissions tekshiriladi
    try {
        const staff = await prisma.staff.findUnique({
            where: { id: session.userId },
            select: { permissions: true },
        });
        if (!staff?.permissions) return false;
        const perms: string[] = JSON.parse(staff.permissions);
        return perms.includes(permission);
    } catch {
        return false;
    }
}
