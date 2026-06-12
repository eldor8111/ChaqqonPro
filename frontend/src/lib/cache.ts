/**
 * TTL In-Memory Cache
 * Tashqi dependency shart emas. Thread-safe emas (Node.js single-threaded = OK).
 */

type CacheEntry<T> = { value: T; expiresAt: number };
const _store = new Map<string, CacheEntry<unknown>>();

/** Cache dan qiymat olish. Muddati o'tgan bo'lsa null qaytaradi. */
export function cacheGet<T>(key: string): T | null {
    const entry = _store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
        _store.delete(key);
        return null;
    }
    return entry.value;
}

/** Cache ga yozish. ttlMs — millisecond da TTL. */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
    _store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Cache ni tozalash (masalan, settings yangilanganda) */
export function cacheInvalidate(key: string): void {
    _store.delete(key);
}

/** Prefix bo'yicha barcha keylarni tozalash */
export function cacheInvalidatePrefix(prefix: string): void {
    Array.from(_store.keys()).forEach(key => {
        if (key.startsWith(prefix)) _store.delete(key);
    });
}

// ─── Tayyor TTL konstantalari ────────────────────────────────────────────────
export const TTL = {
    RECEIPT_SETTINGS: 60_000,      // 60 soniya
    MENU:             5 * 60_000,  // 5 daqiqa
    TENANT:           2 * 60_000,  // 2 daqiqa
    PRINTERS:         30_000,      // 30 soniya
};
