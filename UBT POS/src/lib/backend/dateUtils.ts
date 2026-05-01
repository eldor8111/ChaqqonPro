/**
 * Calculates the start and end of a "business day" based on a custom dayRefreshTime setting.
 * 
 * @param baseDate - The reference date (e.g., from `new Date()` or `new Date("2026-03-27")`)
 * @param dayRefreshTime - The custom start time of the day in "HH:MM" format (default "00:00")
 * @param isToday - True if baseDate is current time, false if it's a specific requested calendar date.
 */
export function getBusinessDayBounds(baseDate: Date, dayRefreshTime: string = "00:00", isToday: boolean = false): { start: Date, end: Date } {
    const timeParts = dayRefreshTime.split(':');
    const refreshHour = Number(timeParts[0]) || 0;
    const refreshMinute = Number(timeParts[1]) || 0;
    
    // Calculate Uzbekistan Time (UTC+5)
    const uzOffsetMs = 5 * 3600000;
    const uzTimeMs = baseDate.getTime() + uzOffsetMs;
    const startUz = new Date(uzTimeMs);

    if (isToday) {
        const currentHour = startUz.getUTCHours();
        const currentMinute = startUz.getUTCMinutes();
        
        // If current time is before the day refresh time, we are effectively still in "yesterday"
        if (currentHour < refreshHour || (currentHour === refreshHour && currentMinute < refreshMinute)) {
            startUz.setUTCDate(startUz.getUTCDate() - 1);
        }
    }

    // Set to the refresh time (in UZ timezone)
    startUz.setUTCHours(refreshHour, refreshMinute, 0, 0);

    // End of business day is exactly 24 hours later minus 1 millisecond
    const endUz = new Date(startUz);
    endUz.setUTCDate(endUz.getUTCDate() + 1);
    endUz.setUTCMilliseconds(endUz.getUTCMilliseconds() - 1);

    // Convert back to real UTC timestamps
    const start = new Date(startUz.getTime() - uzOffsetMs);
    const end = new Date(endUz.getTime() - uzOffsetMs);

    return { start, end };
}
