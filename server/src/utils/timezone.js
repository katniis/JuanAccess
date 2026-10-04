/**
 * Manila Timezone Utility
 *
 * All clinic operations use Asia/Manila (UTC+8) as the canonical timezone.
 * These helpers build correct day boundaries regardless of the server's
 * local timezone setting.
 */

const MANILA_TZ = 'Asia/Manila';

/**
 * Returns { startOfDay, endOfDay } as Date objects representing the
 * boundaries of the given date string (YYYY-MM-DD) in Asia/Manila timezone.
 *
 * If no dateStr is provided, uses the current Manila date.
 *
 * @param {string} [dateStr] – Optional ISO date string (YYYY-MM-DD).
 *   When omitted the current Manila date is used.
 * @returns {{ startOfDay: Date, endOfDay: Date }}
 */
export function manilaDateBounds(dateStr) {
   let year, month, day;

   if (dateStr) {
      // Parse the date string directly to avoid any timezone shift
      [year, month, day] = dateStr.split('-').map(Number);
   } else {
      // Get the current date parts in Manila
      const parts = new Intl.DateTimeFormat('en-CA', {
         timeZone: MANILA_TZ,
         year: 'numeric',
         month: '2-digit',
         day: '2-digit',
      }).formatToParts(new Date());

      year = Number(parts.find((p) => p.type === 'year').value);
      month = Number(parts.find((p) => p.type === 'month').value);
      day = Number(parts.find((p) => p.type === 'day').value);
   }

   // Manila is always UTC+8 (no DST)
   // startOfDay in Manila = midnight Manila = (midnight UTC) - 8 hours offset
   // which means:  Manila 00:00  = UTC (year-month-day) - 8h  = UTC previous-day 16:00
   const startOfDay = new Date(
      Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000,
   );
   const endOfDay = new Date(
      Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 8 * 60 * 60 * 1000,
   );

   return { startOfDay, endOfDay };
}

/**
 * Formats a Date object as an ISO date string (YYYY-MM-DD) in Manila timezone.
 *
 * @param {Date} date
 * @returns {string}
 */
export function manilaDateString(date) {
   return new Intl.DateTimeFormat('en-CA', {
      timeZone: MANILA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
   }).format(date);
}

/**
 * Returns the day of week (0 = Sunday ... 6 = Saturday) for the given
 * Date, interpreted in Manila timezone.
 *
 * @param {Date} date
 * @returns {number}
 */
export function manilaDayOfWeek(date) {
   const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: MANILA_TZ,
      weekday: 'short',
   }).formatToParts(date);
   const weekday = parts.find((p) => p.type === 'weekday').value;
   const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
   return map[weekday];
}
