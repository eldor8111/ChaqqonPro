/**
 * TenantRepository — Tenant DB operatsiyalari
 */
import { prisma } from "@/lib/backend/db";

export type TenantRecord = {
    id: string;
    shopCode: string;
    shopName: string;
    ownerName: string;
    phone: string;
    plan: string;
    status: string;
    adminUsername: string;
    adminPasswordHash: string;
    settings: string | null;
};

export const TenantRepository = {
    async findById(id: string): Promise<TenantRecord | null> {
        return prisma.tenant.findUnique({ where: { id } }) as Promise<TenantRecord | null>;
    },

    async findByShopCode(shopCode: string): Promise<TenantRecord | null> {
        return prisma.tenant.findUnique({ where: { shopCode } }) as Promise<TenantRecord | null>;
    },

    async findActiveByUsername(username: string): Promise<TenantRecord | null> {
        return prisma.tenant.findFirst({
            where: { adminUsername: username, status: "active" },
        }) as Promise<TenantRecord | null>;
    },

    async findFirst(where: { status?: string }): Promise<TenantRecord | null> {
        return prisma.tenant.findFirst({ where }) as Promise<TenantRecord | null>;
    },

    async updateSettings(id: string, settings: Record<string, unknown>): Promise<void> {
        await prisma.tenant.update({
            where: { id },
            data: { settings: JSON.stringify(settings) } as any,
        });
    },

    /** Tenant settings JSON parse */
    parseSettings(tenant: TenantRecord): Record<string, unknown> {
        try {
            return tenant.settings ? JSON.parse(tenant.settings) : {};
        } catch {
            return {};
        }
    },
};
