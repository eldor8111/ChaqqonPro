/**
 * Umumiy yordamchi funksiyalar (utility functions)
 */

/**
 * Pul miqdorini to'liq formatda ko'rsatadi.
 * Misol: 1500000 → "1 500 000 so'm"
 */
export const formatCurrency = (n: number) =>
    new Intl.NumberFormat("uz-UZ").format(n) + " so'm";

/**
 * Pul miqdorini qisqa formatda ko'rsatadi.
 * Misol: 1500000 → "1.5 mln", 150000 → "150 ming"
 */
export const formatCurrencyShort = (n: number) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
    if (n >= 1000) return (n / 1000).toFixed(0) + " ming";
    return n.toString();
};
