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
    
    const start = new Date(baseDate);

    if (isToday) {
        const currentHour = start.getHours();
        const currentMinute = start.getMinutes();
        
        // If current time is before the day refresh time, we are effectively still in "yesterday"
        if (currentHour < refreshHour || (currentHour === refreshHour && currentMinute < refreshMinute)) {
            start.setDate(start.getDate() - 1);
        }
    }

    // Set to the refresh time
    start.setHours(refreshHour, refreshMinute, 0, 0);

    // End of business day is exactly 24 hours later minus 1 millisecond
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);

    return { start, end };
}
