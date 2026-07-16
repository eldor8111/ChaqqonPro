// Shared in-memory store for waiter calls
// Key: `${tenantId}:${tableId}`, Value: { calledAt: Date, tableNumber: string, message?: string }
export const waiterCalls = new Map<string, { calledAt: Date; tableNumber: string; message?: string }>();
