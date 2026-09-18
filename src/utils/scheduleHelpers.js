import { fromZonedTime } from "date-fns-tz";

const normalizeDateKey = (date) => {
    if (!date) return "";
    const value = String(date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (value.includes("T")) return value.split("T")[0];
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? value : parsed.toISOString().split("T")[0];
};

const getScheduleOccurrences = (schedule) => {
    const occurrences = schedule?.scheduleOccurrences || schedule?.schedule_occurrences || [];
    return Array.isArray(occurrences) ? occurrences : [];
};

const getScheduleOccurrence = (schedule, dateKey = null) => {
    const occurrences = getScheduleOccurrences(schedule);
    if (!occurrences.length) return null;

    const hasExplicitDate = Boolean(dateKey);
    const key = normalizeDateKey(dateKey || schedule?.date);
    if (!key) return occurrences[0];

    return occurrences.find((occurrence) =>
        normalizeDateKey(occurrence?.date) === key ||
        normalizeDateKey(occurrence?.sourceDate || occurrence?.source_date) === key
    ) || (hasExplicitDate ? null : occurrences[0]);
};

const getScheduleDateKey = (schedule, dateKey = null) => {
    if (dateKey) return normalizeDateKey(dateKey);
    const occurrence = getScheduleOccurrence(schedule);
    if (occurrence?.date) return normalizeDateKey(occurrence.date);
    if (schedule?.date) return normalizeDateKey(schedule.date);
    if (schedule?.startDate || schedule?.start_date) return normalizeDateKey(schedule.startDate || schedule.start_date);
    const dates = schedule?.scheduleDates || schedule?.schedule_dates || [];
    return normalizeDateKey(dates[0]);
};

const getSpecificTiming = (schedule, dateKey = null) => {
    const key = getScheduleDateKey(schedule, dateKey);
    const specificDates = schedule?.specificDates || schedule?.specific_dates || {};
    return key && specificDates?.[key] ? specificDates[key] : null;
};

const getZonedDateTime = (schedule, field, dateKey = null) => {
    if (!schedule) return null;

    const occurrence = getScheduleOccurrence(schedule, dateKey);
    const specificTiming = getSpecificTiming(schedule, dateKey);
    const requestedDate = getScheduleDateKey(schedule, dateKey);
    const baseDate = normalizeDateKey(schedule?.startDate || schedule?.start_date || schedule?.date);
    const canUseScheduleIso = !requestedDate || !baseDate || requestedDate === baseDate;
    const isoValue =
        occurrence?.[`${field}DateTime`] ||
        occurrence?.[`${field}_date_time`] ||
        specificTiming?.[`${field}DateTime`] ||
        (canUseScheduleIso ? schedule?.[`${field}DateTime`] : null) ||
        (canUseScheduleIso ? schedule?.[`${field}_date_time`] : null);

    if (isoValue) {
        const date = new Date(isoValue);
        if (!isNaN(date.getTime())) return date;
    }

    const timezone = specificTiming?.timezone || occurrence?.timezone || schedule.timezone || "Europe/London";
    const scheduleDate = requestedDate;
    const time =
        specificTiming?.[`${field}Time`] ||
        specificTiming?.[`${field}_time`] ||
        occurrence?.[`${field}Time`] ||
        occurrence?.[`${field}_time`] ||
        schedule?.[`${field}Time`] ||
        schedule?.[`${field}_time`];

    if (!scheduleDate || !time) return null;

    try {
        const date = fromZonedTime(`${scheduleDate} ${String(time).slice(0, 5)}`, timezone);
        return date && !isNaN(date.getTime()) ? date : null;
    } catch (e) {
        return null;
    }
};

/**
 * Converts a time given in a source timezone (e.g. student's timezone) into the viewer's (teacher/admin) local time.
 * @param {string} date - "YYYY-MM-DD"
 * @param {string} time - "HH:mm"
 * @param {string} sourceTimezone - IANA timezone (e.g. "Europe/London", "Africa/Cairo")
 * @param {string|null} targetTimezone - Target IANA timezone (defaults to browser's resolved timezone)
 * @returns {string} Formatted 12-hour time (e.g. "12:30 PM")
 */
export const formatTimeInViewerTimezone = (date, time, sourceTimezone, targetTimezone = null) => {
    if (!time) return "";
    const viewerTz = targetTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
    const srcTz = sourceTimezone || "Europe/London";
    const dateStr = date
        ? (typeof date === "string" ? (date.includes("T") ? date.split("T")[0] : date) : new Date(date).toISOString().split("T")[0])
        : new Date().toISOString().split("T")[0];
    try {
        const utcDate = fromZonedTime(`${dateStr} ${String(time).slice(0, 5)}`, srcTz);
        if (!utcDate || isNaN(utcDate.getTime())) return formatTime12Hour(time);
        return utcDate.toLocaleTimeString("en-US", {
            timeZone: viewerTz,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    } catch (e) {
        return formatTime12Hour(time);
    }
};

/**
 * Formats a date given in a source timezone into the viewer's local timezone.
 */
export const formatDateInViewerTimezone = (date, time, sourceTimezone, targetTimezone = null) => {
    if (!date) return "";
    const viewerTz = targetTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
    const srcTz = sourceTimezone || "Europe/London";
    const dateStr = typeof date === "string" ? (date.includes("T") ? date.split("T")[0] : date) : new Date(date).toISOString().split("T")[0];
    const timeStr = time ? String(time).slice(0, 5) : "12:00";
    try {
        const utcDate = fromZonedTime(`${dateStr} ${timeStr}`, srcTz);
        if (!utcDate || isNaN(utcDate.getTime())) return new Date(dateStr).toLocaleDateString();
        return utcDate.toLocaleDateString("en-US", {
            timeZone: viewerTz,
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch (e) {
        return new Date(dateStr).toLocaleDateString();
    }
};

export const formatTime24 = (dateTime) => {
    if (!dateTime) return "";
    if (typeof dateTime === "string") return dateTime.slice(0, 5);

    return dateTime?.toLocaleTimeString(
        "en-GB",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }
    );
};

export const getScheduleStart = (schedule, dateKey = null) => {
    return getZonedDateTime(schedule, "start", dateKey);
};

export const getScheduleEnd = (schedule, dateKey = null) => {
    return getZonedDateTime(schedule, "end", dateKey);
};

const getScheduleRange = (schedule, dateKey = null) => {
    const start = getZonedDateTime(schedule, "start", dateKey);
    const end = getZonedDateTime(schedule, "end", dateKey);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    return { start, end };
};

const getScheduleOccurrenceRanges = (schedule) => {
    const occurrences = getScheduleOccurrences(schedule);
    return occurrences
        .map((occurrence) => {
            const key = occurrence?.sourceDate || occurrence?.source_date || occurrence?.date;
            const range = getScheduleRange(schedule, key);
            return range ? { ...range, occurrence } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start);
};


/**
 * Schedule Helper Utilities - Reusable across all dashboards
 */

export const CLASS_JOIN_UNLOCK_MINUTES = 10;

/**
 * Parse date from string (supports YYYY-MM-DD and DD-M-YY formats)
 * @param {string} dateStr - Date string 
 * @returns {Date|null} Parsed Date object or null if invalid
 */
const parseDateFromDB = (dateStr) => {
    if (!dateStr) return null;

    // Try YYYY-MM-DD format first (from PostgreSQL date array)
    if (dateStr.includes('-') && dateStr.length === 10) {
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Try DD-M-YY format (e.g., "26-2-5")
    const parts = dateStr.split("-");
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        let year = parseInt(parts[2], 10);
        // Handle 2-digit years (assume 20xx for years < 100)
        if (year < 100) year += 2000;
        const parsed = new Date(year, month, day);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Fallback to standard Date parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Convert 24-hour time to 12-hour format with AM/PM
 * @param {string} time24 - Time in 24-hour format (HH:MM)
 * @returns {string} Time in 12-hour format (h:MM AM/PM)
 */
export const formatTime12Hour = (time24) => {
    if (!time24) return '';

    if (time24 instanceof Date) {
        return time24.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    }

    const parts = String(time24).split(':');
    if (parts.length < 2) return time24;
    const [hours, minutes] = parts;
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Get today's date string in YYYY-MM-DD format (local time)
 * @returns {string} Today's date string
 */
const getTodayStr = () => {
    const now = new Date();
    return now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");
};

/**
 * Check if today is in the schedule dates
 * @param {string[]} scheduleDates - Array of date strings
 * @returns {boolean}
 */
const isTodayInSchedule = (scheduleDates) => {
    if (!Array.isArray(scheduleDates)) return false;
    const todayStr = getTodayStr();
    return scheduleDates.includes(todayStr);
};

/**
 * Get the next upcoming date from scheduleDates that is today or in the future
 * @param {string[]} scheduleDates - Array of date strings
 * @returns {string|null} Next upcoming date or null
 */
const getNextScheduleDate = (scheduleDates) => {
    if (!Array.isArray(scheduleDates) || scheduleDates.length === 0) return null;
    const todayStr = getTodayStr();
    const upcomingDates = scheduleDates.filter(d => d >= todayStr);
    if (upcomingDates.length === 0) return null;
    return upcomingDates.sort()[0];
};

/**
 * Check if a class is currently live (between start and end time)
 * @param {Object} schedule - Schedule object with scheduleDates, startTime, endTime
 * @returns {boolean}
 */
export const isClassLive = (schedule) => {
    if (!schedule) return false;
    const now = new Date();
    const todayStr = getTodayStr();

    const start = schedule.start instanceof Date ? schedule.start : getScheduleStart(schedule, todayStr);
    const end = schedule.end instanceof Date ? schedule.end : getScheduleEnd(schedule, todayStr);

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return false;

    const classDateStr = schedule.date
        ? (typeof schedule.date === 'string' && schedule.date.includes('T') ? schedule.date.split('T')[0] : String(schedule.date))
        : null;

    if (classDateStr && classDateStr !== todayStr) {
        return false;
    }

    const scheduleDates = schedule.scheduleDates || schedule.schedule_dates;
    if (Array.isArray(scheduleDates) && scheduleDates.length > 0 && !scheduleDates.includes(todayStr)) {
        return false;
    }

    const unlockTime = new Date(start);
    unlockTime.setMinutes(unlockTime.getMinutes() - CLASS_JOIN_UNLOCK_MINUTES);

    return now >= unlockTime && now <= end;
};

/**
 * Check if a class has ended (all dates are in the past or today's class time has passed)
 * @param {Object} schedule - Schedule object with scheduleDates, endTime
 * @returns {boolean}
 */
export const isClassExpired = (schedule) => {
    if (!schedule) return false;
    const now = new Date();
    const todayStr = getTodayStr();

    const end = schedule.end instanceof Date ? schedule.end : getScheduleEnd(schedule, todayStr);

    if (!end || isNaN(end.getTime())) return false;

    const classDateStr = schedule.date
        ? (typeof schedule.date === 'string' && schedule.date.includes('T') ? schedule.date.split('T')[0] : String(schedule.date))
        : null;

    if (classDateStr) {
        if (classDateStr < todayStr) return true;
        if (classDateStr > todayStr) return false;
        return now > end;
    }

    const scheduleDates = schedule.scheduleDates || schedule.schedule_dates;
    if (Array.isArray(scheduleDates) && scheduleDates.length > 0) {
        const futureDates = scheduleDates.filter((d) => d > todayStr);
        if (futureDates.length > 0) return false;
        if (!scheduleDates.includes(todayStr)) return true;
    }

    return now > end;
};

/**
 * Get status color for chip/badge display
 * @param {Object} schedule - Schedule object
 * @returns {string} HeroUI color name
 */
export const getStatusColor = (schedule) => {
    if (isClassExpired(schedule)) return "default";
    if (isClassLive(schedule)) return "success";
    return "warning";
};

/**
 * Get status text for display (for recurring schedules with scheduleDates array)
 * @param {Object} schedule - Schedule object with scheduleDates, startTime, endTime
 * @returns {string} Status text: "live", "upcoming", or "completed"
 */
export const getStatusText = (schedule) => {
    const occurrenceRanges = getScheduleOccurrenceRanges(schedule);
    if (occurrenceRanges.length) {
        const now = new Date();
        if (occurrenceRanges.some(({ start, end }) => now >= start && now <= end)) {
            return "live";
        }
        if (occurrenceRanges.some(({ end }) => now <= end)) {
            return "upcoming";
        }
        return "completed";
    }

    const scheduleDates = schedule.scheduleDates || schedule.schedule_dates || [];
    if (!scheduleDates.length) return "completed";

    const todayStr = getTodayStr();
    const now = new Date();

    // Check if today is in the schedule
    if (scheduleDates.includes(todayStr)) {
        const range = getScheduleRange(schedule, todayStr);
        if (!range) return "upcoming";

        if (now >= range.start && now <= range.end) {
            return "live";
        }

        if (now < range.start) {
            return "upcoming";
        }
        // Today's class has ended, but check if there are future dates
    }

    // Check if there are any future dates
    const futureDates = scheduleDates.filter(d => d > todayStr);
    if (futureDates.length > 0) {
        return "upcoming";
    }

    return "completed";
};

/**
 * Get status text for single date schedule
 * @param {string} date - "YYYY-MM-DD"
 * @param {string} startTime - "HH:mm"
 * @param {string} endTime - "HH:mm"
 * @return {string}
 */
export const getStatusTextForSingleDate = (date, startTime, endTime) => {
    const now = new Date();
    const todayStr = getTodayStr();
    const dateKey = normalizeDateKey(date);
    const range = startTime instanceof Date && endTime instanceof Date
        ? { start: startTime, end: endTime }
        : getScheduleRange({ date: dateKey, startTime, endTime }, dateKey);

    // If today is not the schedule date
    if (dateKey !== todayStr && !range) {
        return todayStr < dateKey ? "upcoming" : "completed";
    }

    if (range) {
        if (now >= range.start && now <= range.end) return "live";
        if (now < range.start) return "upcoming";
        return "completed";
    }

    // Parse time
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    // Create LOCAL date objects correctly
    const [year, month, day] = dateKey.split("-").map(Number);

    const start = new Date(year, month - 1, day, startHour, startMin);
    const end = new Date(year, month - 1, day, endHour, endMin);

    if (now >= start && now <= end) {
        return "live";
    }

    if (now < start) {
        return "upcoming";
    }

    return "completed";
};

/**
 * Get hours until class starts for a specific date
 * @param {string} date - "YYYY-MM-DD"
 * @param {string} startTime - "HH:mm"
 * @return {number|null} Hours until class (negative if already started), null if invalid
 */
export const getHoursUntilClass = (date, startTime) => {
    if (!date || !startTime) return null;

    const now = new Date();
    if (startTime instanceof Date) {
        return (startTime - now) / (1000 * 60 * 60);
    }

    const range = getScheduleRange({ date, startTime, endTime: startTime }, date);
    if (!range) return null;
    const hoursUntil = (range.start - now) / (1000 * 60 * 60);

    return hoursUntil;
};

/**
 * Filter schedules to only show upcoming/future classes
 * @param {Array} schedules - Array of schedule objects
 * @returns {Array} Filtered schedules
 */
export const getUpcomingSchedules = (schedules) => {
    const today = new Date().setHours(0, 0, 0, 0);
    return schedules.filter(s => new Date(s.date) >= today);
};

/**
 * Format remaining time in a user-friendly way (e.g., "45m" or "1h 30m")
 * @param {number} hoursUntil - Hours until class starts
 * @returns {string} Formatted string
 */
export const formatRemainingTime = (hoursUntil) => {
    if (hoursUntil === null || hoursUntil < 0) return "";

    const h = Math.floor(hoursUntil);
    const m = Math.round((hoursUntil % 1) * 60);

    if (h < 1) {
        return `${m}m`;
    }

    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

/**
 * Check if a schedule occurrence date has been cancelled
 */
export const isScheduleDateCancelled = (schedule, dateKey = null) => {
    const cancelList = schedule?.cancelSpecific || schedule?.cancel_specific || [];
    if (!cancelList.length) return false;

    const normalized = (value) => {
        if (!value) return "";
        const str = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        if (str.includes("T")) return str.split("T")[0];
        const parsed = new Date(str);
        return Number.isNaN(parsed.getTime()) ? str : parsed.toISOString().split("T")[0];
    };

    const key = normalized(dateKey || schedule?.date);
    const sourceKey = normalized(schedule?.sourceDate || schedule?.source_date);
    const cancelSet = new Set(cancelList.map(normalized));

    return cancelSet.has(key) || (sourceKey && cancelSet.has(sourceKey));
};

/**
 * Group and sort schedules by date, splitting into upcoming and previous
 * @param {Array} schedules - Array of schedule objects
 * @param {string} filterType - "all", "zoom", or "video"
 * @param {Object} options - { excludeCancelled: boolean }
 * @returns {Object} { upcoming: { dateKey: [schedules] }, previous: { dateKey: [schedules] } }
 */
export const groupAndSortSchedulesByDate = (schedules, filterType = "all", options = {}) => {
    if (!schedules) return { upcoming: {}, previous: {} };

    const todayStr = getTodayStr();

    const grouped = {};

    schedules.forEach((schedule) => {
        // Filter by type (Zoom/Video)
        if (filterType !== "all") {
            if (filterType === "zoom" && !schedule.meetingLink) return;
            if (filterType === "video" && schedule.meetingLink) return;
        }

        const occurrences = getScheduleOccurrences(schedule);
        const datesToProcess = occurrences.length > 0
            ? occurrences
            : (schedule.scheduleDates?.length > 0
                ? schedule.scheduleDates
                : (schedule.date ? [schedule.date] : []));

        if (!datesToProcess.length) return;

        datesToProcess.forEach((scheduleDate) => {
            const dateStr = typeof scheduleDate === 'string'
                ? scheduleDate
                : (scheduleDate?.sourceDate || scheduleDate?.source_date || scheduleDate?.date);
            if (!dateStr) return;

            const occurrenceDateKey = typeof scheduleDate === 'object'
                ? normalizeDateKey(scheduleDate?.date || dateStr)
                : normalizeDateKey(dateStr);
            const occurrenceSourceKey = typeof scheduleDate === 'object'
                ? normalizeDateKey(scheduleDate?.sourceDate || scheduleDate?.source_date)
                : normalizeDateKey(dateStr);

            if (options.excludeCancelled) {
                const cancelList = schedule?.cancelSpecific || schedule?.cancel_specific || [];
                const cancelSet = new Set(cancelList.map(normalizeDateKey));
                if (
                    cancelSet.has(occurrenceDateKey) ||
                    (occurrenceSourceKey && cancelSet.has(occurrenceSourceKey))
                ) {
                    return;
                }
            }

            // Use the same logic as parseDateFromDB to ensure consistency
            let dateKey = "";
            if (dateStr.includes("-") && dateStr.length === 10) {
                dateKey = dateStr;
            } else {
                const parts = dateStr.split("-");
                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10);
                    let year = parseInt(parts[2], 10);
                    if (year < 100) year += 2000;
                    dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                } else {
                    try {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                            dateKey = d.toISOString().split('T')[0];
                        } else {
                            return;
                        }
                    } catch (e) {
                        return;
                    }
                }
            }

            const specificDates = schedule.specificDates || schedule.specific_dates || {};
            const specificTiming = specificDates?.[dateKey];
            const scheduleForDate = {
                ...schedule,
                date: dateKey,
                startTime: specificTiming?.startTime || (typeof scheduleDate === 'object' ? scheduleDate.startTime : null) || schedule.startTime,
                endTime: specificTiming?.endTime || (typeof scheduleDate === 'object' ? scheduleDate.endTime : null) || schedule.endTime,
                startDateTime: typeof scheduleDate === 'object' ? scheduleDate.startDateTime || scheduleDate.start_date_time : schedule.startDateTime,
                endDateTime: typeof scheduleDate === 'object' ? scheduleDate.endDateTime || scheduleDate.end_date_time : schedule.endDateTime,
            };
            const start = getScheduleStart(scheduleForDate, dateKey);
            const end = getScheduleEnd(scheduleForDate, dateKey);
            const validStart = start && !isNaN(start.getTime()) ? start : null;
            const validEnd = end && !isNaN(end.getTime()) ? end : null;
            const displayDateKey = validStart
                ? `${validStart.getFullYear()}-${String(validStart.getMonth() + 1).padStart(2, "0")}-${String(validStart.getDate()).padStart(2, "0")}`
                : dateKey;

            if (!grouped[displayDateKey]) {
                grouped[displayDateKey] = [];
            }

            grouped[displayDateKey].push({
                ...schedule,
                date: displayDateKey,
                sourceDate: dateKey,
                startTime: formatTime24(validStart) || scheduleForDate.startTime,
                endTime: formatTime24(validEnd) || scheduleForDate.endTime,
                startDateTime: validStart?.toISOString(),
                endDateTime: validEnd?.toISOString(),
            });
        });
    });

    const upcoming = {};
    const previous = {};

    const sortedDateKeys = Object.keys(grouped).sort();

    sortedDateKeys.forEach(key => {
        if (key >= todayStr) {
            upcoming[key] = grouped[key];
        } else {
            previous[key] = grouped[key];
        }
    });

    return { all: grouped, upcoming, previous };
}
