import { patientRequest } from './patientApi.js';
import { formatClinicDate, formatClinicDateTime } from './patientDates.js';

const timeRanges = {
   morning: ['08:00', '12:00'],
   afternoon: ['12:00', '17:00'],
   evening: ['17:00', '19:00'],
};

const statusLabels = {
   waiting: 'Waitlisted',
   offered: 'Offered',
   confirmed: 'Confirmed',
   expired: 'Expired',
   cancelled: 'Cancelled',
};

export async function getMyWaitlist() {
   const { waitlistEntries } = await patientRequest('/waitlist/mine');
   return waitlistEntries.map((entry) => {
      const requestedWindow = formatWindow(
         entry.preferredDateStart,
         entry.preferredDateEnd,
      );
      return {
         ...entry,
         providerName: entry.providerFirstName
            ? 'Dr. ' + entry.providerFirstName + ' ' + entry.providerLastName
            : 'Any provider',
         visitType: entry.visitTypeName || 'Appointment',
         requestedWindow,
         statusLabel: statusLabels[entry.status] || 'Unknown',
         statusClass: entry.status === 'waiting' ? 'waitlisted' : entry.status,
         offeredDateTime: entry.scheduledStart
            ? formatClinicDateTime(entry.scheduledStart)
            : null,
         visitLabel:
            (entry.visitTypeName || 'Appointment') + ' · ' + requestedWindow,
         note:
            entry.status === 'offered'
               ? 'Action needed'
               : entry.status === 'waiting'
                 ? 'Looking for a slot'
                 : '',
      };
   });
}

export async function joinPatientWaitlist({
   visitTypeId,
   dateStart,
   dateEnd,
   timePeriod,
}) {
   const [timeStart, timeEnd] = timeRanges[timePeriod] || [null, null];
   return patientRequest('/waitlist', {
      method: 'POST',
      body: {
         visit_type_id: Number(visitTypeId),
         preferred_date_start: dateStart,
         preferred_date_end: dateEnd,
         preferred_time_start: timeStart,
         preferred_time_end: timeEnd,
      },
   });
}

export function confirmWaitlistOffer(id) {
   return patientRequest('/waitlist/' + id + '/confirm', {
      method: 'POST',
      body: {},
   });
}

export function declineWaitlistOffer(id) {
   return patientRequest('/waitlist/' + id + '/decline', {
      method: 'POST',
      body: {},
   });
}

export function removeWaitlistEntry(id) {
   return patientRequest('/waitlist/' + id, { method: 'DELETE' });
}

function formatWindow(start, end) {
   const first = formatClinicDate(start, { year: 'numeric' });
   if (start === end) return first;
   return first + ' – ' + formatClinicDate(end, { year: 'numeric' });
}
