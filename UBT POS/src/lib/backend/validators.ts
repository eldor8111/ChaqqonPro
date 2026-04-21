import { prisma } from "@/lib/backend/db";

/**
 * Checks if a phone number is globally unique across Tenant, Staff, and PlatformUser tables.
 * Empty phones are ignored (assumed valid).
 * 
 * @param phone The phone number to check
 * @param currentId Optional ID of the document being edited to exclude it from uniqueness checks
 * @returns true if unique or empty, false if already in use by another record
 */
export async function isPhoneGloballyUnique(phone: string, currentId?: string): Promise<boolean> {
    if (!phone) return true;
    
    // Normalize phone (trim whitespace)
    const normalizedPhone = phone.trim();
    if (normalizedPhone === "") return true;
    
    // Ignore JSON payloads which are stored in the phone field for some roles
    if (normalizedPhone.startsWith("{") && normalizedPhone.endsWith("}")) return true;

    // Check Tenant
    const tenants = await prisma.$queryRaw`SELECT id FROM Tenant WHERE phone = ${normalizedPhone}` as {id: string}[];
    if (tenants.some(t => t.id !== currentId)) return false;

    // Check Staff
    const staff = await prisma.$queryRaw`SELECT id FROM Staff WHERE phone = ${normalizedPhone}` as {id: string}[];
    if (staff.some(s => s.id !== currentId)) return false;

    // Check PlatformUser
    const platformUsers = await prisma.$queryRaw`SELECT id FROM PlatformUser WHERE phone = ${normalizedPhone}` as {id: string}[];
    if (platformUsers.some(p => p.id !== currentId)) return false;

    return true;
}
