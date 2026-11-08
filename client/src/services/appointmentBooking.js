import { patientRequest } from './patientApi.js';
import {
   formatClinicDate,
   formatClinicMonth,
   formatClinicTime,
} from './patientDates.js';

const timeRanges = {
   morning: ['08:00', '12:00'],
   afternoon: ['12:00', '17:00'],
   evening: ['17:00', '19:00'],
};

export async function getAppointmentVisitTypes() {
   const { visitTypes } = await patientRequest('/appointment/visit-type');
   return visitTypes;
}

export async function findAvailableAppointments({
   visitTypeId,
   dateKeys,
   timePeriod,
}) {
   if (!dateKeys.length) return [];

   const sortedDates = [...dateKeys].sort();
   const params = new URLSearchParams({
      visit_type_id: String(visitTypeId),
      range_start: sortedDates[0],
      range_end: sortedDates[sortedDates.length - 1],
   });
   if (timePeriod && timeRanges[timePeriod]) {
      params.set('time_start', timeRanges[timePeriod][0]);
      params.set('time_end', timeRanges[timePeriod][1]);
   }

   const { slots } = await patientRequest(
      '/appointment/available-slots?' + params,
   );
   return slots.map((slot) => {
      const start = new Date(slot.start);
      const providerName = slot.provider_name || 'Provider';
      return {
         id: String(slot.provider_id) + '-' + slot.start,
         providerId: slot.provider_id,
         providerName: providerName.startsWith('Dr.')
            ? providerName
            : 'Dr. ' + providerName,
         start: slot.start,
         end: slot.end,
         dateLabel: formatClinicDate(slot.start, { weekday: 'short' }),
         monthLabel: formatClinicMonth(slot.start).toUpperCase(),
         dayLabel: new Intl.DateTimeFormat(undefined, {
            timeZone: 'Asia/Manila',
            day: 'numeric',
         }).format(start),
         timeLabel: formatClinicTime(slot.start),
      };
   });
}

export function bookAppointment({ visitTypeId, slot }) {
   return patientRequest('/appointment', {
      method: 'POST',
      body: {
         visit_type_id: Number(visitTypeId),
         provider_id: Number(slot.providerId),
         start: slot.start,
         end: slot.end,
      },
   });
}
