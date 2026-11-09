import {
   mapPatientAppointment,
   partitionPatientAppointments,
} from './patientAppointments.js';
import { getMyBills } from './patientBills.js';
import { patientRequest } from './patientApi.js';
import { formatClinicDate, formatClinicDateTime } from './patientDates.js';
import { getMyWaitlist } from './patientWaitlist.js';

export async function getPatientDashboard() {
   const [appointmentRows, waitlistRows, bills] = await Promise.all([
      patientRequest('/appointment/mine'),
      getMyWaitlist(),
      getMyBills(),
   ]);
   const now = Date.now();
   const appointments = appointmentRows.map(mapPatientAppointment);
   const { upcoming: upcomingAppointments } = partitionPatientAppointments(
      appointments,
      now,
   );
   const activeWaitlist = waitlistRows.filter((entry) =>
      ['waiting', 'offered'].includes(entry.status),
   );
   const offeredEntry = activeWaitlist.find(
      (entry) => entry.status === 'offered',
   );
   const upcomingAppointment = upcomingAppointments[0] || null;
   const completedSince = new Date();
   completedSince.setFullYear(completedSince.getFullYear() - 1);
   const completedVisits = appointments.filter((appointment) => {
      const start = new Date(appointment.scheduledStart).getTime();
      return (
         appointment.status === 'completed' &&
         start >= completedSince.getTime() &&
         start < now
      );
   }).length;
   const billsToReview = bills.filter((bill) =>
      ['processing', 'disputed'].includes(bill.status),
   );

   return {
      dateLabel: formatClinicDate(new Date(), {
         weekday: 'long',
         month: 'long',
         year: 'numeric',
      }),
      offeredSlot: offeredEntry
         ? {
              id: offeredEntry.id,
              status: offeredEntry.status,
              providerName: offeredEntry.providerName,
              visitType: offeredEntry.visitType,
              dateTimeLabel: offeredEntry.offeredDateTime,
              offerExpiresAt: offeredEntry.offerExpiresAt,
           }
         : null,
      upcomingAppointment: upcomingAppointment
         ? {
              ...upcomingAppointment,
              visitDescription: upcomingAppointment.visitType,
              dateLabel: formatClinicDateTime(
                 upcomingAppointment.scheduledStart,
              ),
           }
         : null,
      waitlistEntries: activeWaitlist,
      summaryCards: [
         {
            icon: 'calendar',
            title: 'Total visits',
            value: String(completedVisits),
            detail: 'Completed in the last 12 months',
            linkLabel: 'View',
            path: '/patient/appointments',
         },
         {
            icon: 'clock',
            title: 'Upcoming',
            value: String(upcomingAppointments.length),
            detail: upcomingAppointment
               ? formatClinicDateTime(upcomingAppointment.scheduledStart)
               : 'No upcoming appointments',
            linkLabel: 'View',
            path: '/patient/appointments',
         },
         {
            icon: 'receipt',
            title: 'Bills to review',
            value: String(billsToReview.length),
            detail:
               billsToReview.length === 1
                  ? '1 bill needs review'
                  : billsToReview.length + ' bills need review',
            linkLabel: 'Review bills',
            path: '/patient/bills',
         },
      ],
   };
}
