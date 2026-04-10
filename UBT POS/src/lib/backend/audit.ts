import { prisma } from "./db";

export async function createAuditLog(
    tenantId: string,
    user: string,
    action: string,
    detail: string,
    type: "create" | "update" | "delete" | "info"
) {
    try {
        await prisma.$executeRaw`
            INSERT INTO AuditLog (id, tenantId, user, action, detail, type, createdAt)
            VALUES (
                ${`log_${Date.now()}`},
                ${tenantId},
                ${user},
                ${action},
                ${detail},
                ${type},
                CURRENT_TIMESTAMP
            )
        `;
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
}
