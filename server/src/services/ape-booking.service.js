import {
   manilaDateBounds,
   manilaDateString,
   manilaDayOfWeek,
} from '../utils/timezone.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Package Procedures that apply to everyone or match the patient's Sex at Birth.
export function includedProcedures(procedures, sexAtBirth) {
   return procedures.filter(
      (procedure) =>
         !procedure.sexAtBirth || procedure.sexAtBirth === sexAtBirth,
   );
}

// YYYY-MM-DD Manila dates from start to end inclusive (Manila has no DST).
export function manilaDateRange(startDate, endDate) {
   const dates = [];
   const last = manilaDateBounds(endDate).startOfDay.getTime();
   for (
      let day = manilaDateBounds(startDate).startOfDay.getTime();
      day <= last;
      day += DAY_MS
   ) {
      dates.push(manilaDateString(new Date(day)));
   }
   return dates;
}

// The start and end of an Arrival Window on a Manila date.
export function arrivalWindowTimes(date, window) {
   const { startOfDay } = manilaDateBounds(date);
   const at = (time) => {
      const [hours, minutes] = String(time).split(':').map(Number);
      return new Date(startOfDay.getTime() + (hours * 60 + minutes) * 60000);
   };
   return { start: at(window.startTime), end: at(window.endTime) };
}

// How many active APE Bookings include each Procedure, keyed by Procedure, window and Manila date.
function bookedKey(feeScheduleId, arrivalWindowId, date) {
   return `${feeScheduleId}:${arrivalWindowId}:${date}`;
}

export function countBookings(bookings) {
   const counts = new Map();
   for (const booking of bookings) {
      const key = bookedKey(
         booking.feeScheduleId,
         booking.arrivalWindowId,
         manilaDateString(new Date(booking.scheduledStart)),
      );
      counts.set(key, (counts.get(key) ?? 0) + 1);
   }
   return counts;
}

// Spots left in a window on a date: the tightest of the included Procedures, or 0 when one is not offered that weekday.
export function spotsLeft(procedures, counts, window, date) {
   if (procedures.length === 0) return 0;
   const weekday = manilaDayOfWeek(manilaDateBounds(date).startOfDay);
   let spots = Infinity;
   for (const procedure of procedures) {
      if (!procedure.offeredDays.includes(weekday)) return 0;
      const booked =
         counts.get(bookedKey(procedure.feeScheduleId, window.id, date)) ?? 0;
      spots = Math.min(spots, procedure.capacityPerWindow - booked);
   }
   return Math.max(spots, 0);
}

// Bookable Arrival Windows per date for the included Procedures. Full or started windows are left out.
export function computeApeAvailability({
   procedures,
   windows,
   bookings,
   dates,
   now,
}) {
   const counts = countBookings(bookings);
   const days = [];
   for (const date of dates) {
      const open = [];
      for (const window of windows) {
         const { start, end } = arrivalWindowTimes(date, window);
         const spots = spotsLeft(procedures, counts, window, date);
         if (start <= now || spots <= 0) continue;
         open.push({
            id: window.id,
            name: window.name,
            startTime: window.startTime,
            endTime: window.endTime,
            start: start.toISOString(),
            end: end.toISOString(),
            spotsLeft: spots,
         });
      }
      if (open.length) days.push({ date, windows: open });
   }
   return days;
}
