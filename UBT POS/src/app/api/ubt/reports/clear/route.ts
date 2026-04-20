export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

/**
 * DELETE /api/ubt/reports/clear
 * Tenant uchun barcha hisobot ma'lumotlarini o'chiradi:
 *  - Transaction + TransactionItem (cascade)
 *  - InventoryExpenditure (chiqim)
 *  - InventoryReceipt (kirim)
 *  - InventoryTransfer (ko'chirish)
 *  - InventoryCount (inventarizatsiya)
 *  - InventoryWriteoff (hisobdan chiqarish)
 *  - AuditLog (audit yozuvlari)
 * Mahsulot katalogi, xodimlar, mijozlar va sozlamalar o'CHIRILMAYDI.
 */
export async function DELETE(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tid = session.tenantId;

        // TransactionItem ni avval o'chiramiz (foreign key constraint)
        try { await (prisma as any).transactionItem.deleteMany({ where: { transaction: { tenantId: tid } } }); } catch {}

        // Asosiy jadvallarni o'chirish
        const txDel = await prisma.transaction.deleteMany({ where: { tenantId: tid } }).catch(() => ({ count: 0 }));
        const expDel = await prisma.inventoryExpenditure.deleteMany({ where: { tenantId: tid } }).catch(() => ({ count: 0 }));
        const rcptDel = await prisma.inventoryReceipt.deleteMany({ where: { tenantId: tid } }).catch(() => ({ count: 0 }));
        const trfDel = await prisma.inventoryTransfer.deleteMany({ where: { tenantId: tid } }).catch(() => ({ count: 0 }));
        const cntDel = await prisma.inventoryCount.deleteMany({ where: { tenantId: tid } }).catch(() => ({ count: 0 }));
        const woDel = await prisma.inventoryWriteoff.deleteMany({ where: { tenantId: tid } }).catch(() => ({ count: 0 }));
        const auditDel = await prisma.auditLog.deleteMany({ where: { tenantId: tid } }).catch(() => ({ count: 0 }));

        // O'chirish harakatini yangi audit log yozuviga qayd etish
        await prisma.auditLog.create({
            data: {
                tenantId: tid,
                user: session.userId,
                action: "REPORTS_CLEARED",
                detail: `Barcha hisobotlar o'chirildi. Tranzaksiyalar: ${txDel.count}, Chiqimlar: ${expDel.count}, Kirimlar: ${rcptDel.count}, Ko'chirishlar: ${trfDel.count}, Inventarizatsiya: ${cntDel.count}, Hisobdan chiqarish: ${woDel.count}, Audit: ${auditDel.count}`,
                type: "delete",
            },
        });

        return NextResponse.json({
            success: true,
            deleted: {
                transactions: txDel.count,
                expenditures: expDel.count,
                receipts: rcptDel.count,
                transfers: trfDel.count,
                counts: cntDel.count,
                writeoffs: woDel.count,
                auditLogs: auditDel.count,
            },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Server xatoligi" }, { status: 500 });
    }
}
