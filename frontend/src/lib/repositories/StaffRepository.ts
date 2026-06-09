/**
 * StaffRepository — barcha Staff DB operatsiyalari shu yerda
 */
import { prisma } from "@/lib/backend/db";

export type StaffRecord = {
    id: string;
    tenantId: string;
    name: string;
    role: string;
    username: string;
    passwordHash: string;
    permissions: string;
    branch: string;
    phone: string;
    printerIp: string;
    status: string;
};

export const StaffRepository = {
    /** Username va status bo'yicha qidirish */
    async findByUsername(username: string, status = "active"): Promise<StaffRecord[]> {
        const res = await prisma.staff.findMany({ where: { username, status } });
        return res as unknown as StaffRecord[];
    },

    /** Ism bo'yicha qidirish (SQLite: contains + JS filter) */
    async findByName(name: string, status = "active"): Promise<StaffRecord[]> {
        const result = await prisma.staff.findMany({
            where: { status, name: { contains: name } },
        });
        const filtered = result.filter(
            s => s.name.toLowerCase() === name.toLowerCase()
        );
        return filtered as unknown as StaffRecord[];
    },

    /** ID bo'yicha bitta staff */
    async findById(id: string): Promise<StaffRecord | null> {
        const res = await prisma.staff.findUnique({ where: { id } });
        return res as unknown as StaffRecord | null;
    },

    /** TenantId bo'yicha barcha staff */
    async findAllByTenant(tenantId: string): Promise<StaffRecord[]> {
        const res = await prisma.staff.findMany({ where: { tenantId } });
        return res as unknown as StaffRecord[];
    },

    /** Yangi staff yaratish */
    async create(data: Partial<StaffRecord> & { passwordHash: string }): Promise<StaffRecord> {
        return prisma.staff.create({ data: data as any }) as Promise<StaffRecord>;
    },

    /** Staff ni yangilash */
    async update(id: string, data: Partial<StaffRecord>): Promise<StaffRecord> {
        return prisma.staff.update({ where: { id }, data: data as any }) as Promise<StaffRecord>;
    },

    /** Staff ni o'chirish */
    async delete(id: string): Promise<void> {
        await prisma.staff.delete({ where: { id } });
    },
};
