import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   dutyScheduleOverrides,
   providerAvailability,
} from '../db/schema/index.js';
import {
   manilaDateString,
   manilaDayOfWeek,
   manilaMinutesOfDay,
} from '../utils/timezone.js';

const toMinutes = (time) => {
   const [hours, minutes] = String(time).split(':').map(Number);
   return hours * 60 + minutes;
};

const within = (minutes, { startTime, endTime }) =>
   minutes >= toMinutes(startTime) && minutes < toMinutes(endTime);

// A date override (day off or custom hours) replaces the weekly hours for that Manila date.
export async function isOnDuty(practitionerId, at, executor = db) {
   const minutes = manilaMinutesOfDay(at);
   const [override] = await executor
      .select({
         isDayOff: dutyScheduleOverrides.isDayOff,
         startTime: dutyScheduleOverrides.startTime,
         endTime: dutyScheduleOverrides.endTime,
      })
      .from(dutyScheduleOverrides)
      .where(
         and(
            eq(dutyScheduleOverrides.providerId, practitionerId),
            eq(dutyScheduleOverrides.overrideDate, manilaDateString(at)),
         ),
      )
      .limit(1);
   if (override) return !override.isDayOff && within(minutes, override);

   const weekly = await executor
      .select({
         startTime: providerAvailability.startTime,
         endTime: providerAvailability.endTime,
      })
      .from(providerAvailability)
      .where(
         and(
            eq(providerAvailability.providerId, practitionerId),
            eq(providerAvailability.dayOfWeek, manilaDayOfWeek(at)),
         ),
      );
   return weekly.some((window) => within(minutes, window));
}

export function listDutyOverrides(practitionerId) {
   return db
      .select()
      .from(dutyScheduleOverrides)
      .where(eq(dutyScheduleOverrides.providerId, practitionerId))
      .orderBy(asc(dutyScheduleOverrides.overrideDate));
}
