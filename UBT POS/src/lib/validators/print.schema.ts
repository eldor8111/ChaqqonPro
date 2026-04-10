/**
 * Zod DTO validators — Print
 */
import { z } from "zod";

export const PrintItemSchema = z.object({
    name:  z.string().min(1),
    qty:   z.number().positive(),
    price: z.number().nonnegative(),
    unit:  z.string().optional(),
});

export const PrintJobSchema = z.object({
    printerIp:      z.string().min(1, "printerIp kiritilmagan"),
    port:           z.number().int().min(1).max(65535).optional().default(9100),
    receiptType:    z.enum(["kitchen", "client", "report"]).optional().default("client"),
    tableName:      z.string().optional(),
    tableZone:      z.string().optional(),
    tableType:      z.string().optional(),
    waiter:         z.string().optional(),
    time:           z.string().optional(),
    items:          z.array(PrintItemSchema).optional().default([]),
    total:          z.number().nonnegative(),
    orderNum:       z.number().positive().optional(),
    paymentMethod:  z.string().optional(),
    cashAmount:     z.number().nonnegative().optional(),
    cardAmount:     z.number().nonnegative().optional(),
    servicePercent: z.number().min(0).max(100).optional(),
    tenantId:       z.string().optional(),
});

export type PrintJobDTO = z.infer<typeof PrintJobSchema>;
