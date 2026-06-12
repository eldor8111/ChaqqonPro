/**
 * StaffService — biznes logika (autentifikatsiya, mavjudlik tekshiruvi)
 */
import bcryptjs from "bcryptjs";
import { StaffRepository, type StaffRecord } from "@/lib/repositories/StaffRepository";
import { TenantRepository } from "@/lib/repositories/TenantRepository";

export type AuthenticatedStaff = {
    id: string;
    name: string;
    role: string;
    tenantId: string;
    branch: string;
    permissions: string[];
    printerIp: string;
};

export const StaffService = {
    /**
     * Username + parol bilan kassir autentifikatsiya
     * Repository orqali DB dan oladi, biznes logika shu yerda
     */
    async authenticate(username: string, password: string): Promise<
        { success: true; staff: AuthenticatedStaff; tenantShopType: string } |
        { success: false; error: string }
    > {
        // 1. Username yoki ism bo'yicha qidirish
        let candidates: StaffRecord[] = await StaffRepository.findByUsername(username);
        if (candidates.length === 0) {
            candidates = await StaffRepository.findByName(username);
        }
        if (candidates.length === 0) {
            return { success: false, error: "Foydalanuvchi topilmadi" };
        }

        // 2. Parol tekshirish (birinchi mos kelgani)
        let matched: StaffRecord | null = null;
        for (const candidate of candidates) {
            const ok = await bcryptjs.compare(password, candidate.passwordHash);
            if (ok) { matched = candidate; break; }
        }
        if (!matched) return { success: false, error: "Login yoki parol noto'g'ri" };

        // 3. Tenant tekshirish
        const tenant = await TenantRepository.findById(matched.tenantId);
        if (!tenant || tenant.status !== "active") {
            return { success: false, error: "Korxona faol emas" };
        }

        // 4. Ruxsat tekshirish
        let permissions: string[] = [];
        try { permissions = JSON.parse(matched.permissions); } catch { permissions = []; }

        const isManablog = matched.role === "Manablog";
        if (!isManablog && !permissions.includes("pos")) {
            return { success: false, error: "Sizda kassa tizimiga kirish huquqi yo'q" };
        }

        // 5. printerIp — avval alohida maydon, keyin phone JSON fallback
        let printerIp = matched.printerIp ?? "";
        if (!printerIp) {
            try {
                const phoneData = matched.phone ? JSON.parse(matched.phone) : {};
                printerIp = phoneData.printerIp || "";
            } catch { printerIp = ""; }
        }

        const tenantSettings = TenantRepository.parseSettings(tenant);
        const tenantShopType = (tenantSettings.shopType as string) || "shop";

        return {
            success: true,
            staff: {
                id: matched.id,
                name: matched.name,
                role: matched.role,
                tenantId: matched.tenantId,
                branch: matched.branch,
                permissions,
                printerIp,
            },
            tenantShopType,
        };
    },

    /** Permissions parse */
    parsePermissions(staff: StaffRecord): string[] {
        try { return JSON.parse(staff.permissions); } catch { return []; }
    },
};
