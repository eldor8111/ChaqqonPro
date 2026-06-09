import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = session.tenantId;

        // 1. Qarzdorlar (Mijozlar bizga qarzi)
        const qarzTransactions = await prisma.transaction.findMany({
            where: { 
                 tenantId, 
                 method: "qarz", 
                 status: "completed",
                 NOT: { notes: { contains: "TOLANGAN" } }
            },
            include: { customer: true, kassir: true },
            orderBy: { createdAt: 'desc' },
        });

        const qarzQaytarish = await prisma.kassiHarakat.findMany({
            where: { tenantId, type: "income", category: "Qarz qaytarish" },
            orderBy: { createdAt: 'desc' },
        });

        // 2. Bizning Qarzimiz (Bizning qaruzlarimiz)
        // Qarz olish = Biz birovdan qarz oldik (income)
        const qarzOlingan = await prisma.kassiHarakat.findMany({
            where: {
                tenantId,
                type: "income",
                category: { contains: "qarz olish" },
                NOT: { description: { contains: "TOLANGAN" } }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Qarz uzish = Birovga qarzni to'ladik (expense)
        const qarzUzilgan = await prisma.kassiHarakat.findMany({
            where: {
                tenantId,
                type: "expense",
                category: { contains: "qarz" } // 'qarz uzish', 'qarz qaytarish' vs we just write qarz
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            qarzdorlar: {
                transactions: qarzTransactions,
                payments: qarzQaytarish,
            },
            bizningQarz: {
                olingan: qarzOlingan,
                uzilgan: qarzUzilgan,
            }
        });

    } catch (error: any) {
        console.error("[DEBTS GET]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const tenantId = session.tenantId;

        const { id, amount, title, isOurDebt, isFullPayment } = await req.json();

        if (!isOurDebt) {
            // Mark the outstanding transaction as Paid ONLY if it's a full payment
            const tx = await prisma.transaction.findUnique({ where: { id, tenantId } });
            if (tx && isFullPayment) {
                await prisma.transaction.update({
                    where: { id },
                    data: { notes: tx.notes ? tx.notes + " | TOLANGAN" : "TOLANGAN" }
                });
            }

            // Record income in Finance
            await prisma.kassiHarakat.create({
                data: {
                    tenantId, 
                    type: "income", 
                    category: "Qarz qaytarish",
                    amount: Number(amount),
                    description: `Qarz qaytarildi: ${title} (Trx #${id.slice(-6).toUpperCase()})`,
                    paymentMethod: "Naqd pul"
                }
            });
        } else {
            // Paying back OUR debt
            const moliya = await prisma.kassiHarakat.findUnique({ where: { id, tenantId } });
            if (moliya && isFullPayment) {
                await prisma.kassiHarakat.update({
                    where: { id },
                    data: { description: moliya.description ? moliya.description + " | TOLANGAN" : "TOLANGAN" }
                });
            }

            // Record expense in Finance
            await prisma.kassiHarakat.create({
                data: {
                    tenantId, 
                    type: "expense", 
                    category: "Qarz uzish",
                    amount: Number(amount),
                    description: `Qarz uzildi: ${title} (Harakat #${id.slice(-6).toUpperCase()})`,
                    paymentMethod: "Naqd pul"
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[DEBTS POST]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
