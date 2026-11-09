import {
   mapPatientAppointment,
   partitionPatientAppointments,
} from './patientAppointments.js';
import { getMyBills } from './patientBills.js';
import { patientRequest } from './patientApi.js';
import { formatClinicDateTime } from './patientDates.js';
import { getMyCoverage } from './patientSettings.js';
import { getMyWaitlist } from './patientWaitlist.js';

export async function getPatientDashboard() {
   const [appointmentRows, bills, coverages, waitlistRows] = await Promise.all([
      patientRequest('/appointment/mine'),
      getMyBills(),
      getMyCoverage().catch(() => []),
      getMyWaitlist(),
   ]);
   const now = Date.now();
   const appointments = appointmentRows.map(mapPatientAppointment);
   const { upcoming: upcomingAppointments } = partitionPatientAppointments(
      appointments,
      now,
   );
   const upcomingAppointment = upcomingAppointments[0] || null;
   const waitlistEntries = waitlistRows.filter((entry) =>
      ['waiting', 'offered'].includes(entry.status),
   );
   const offeredEntry = waitlistEntries.find(
      (entry) => entry.status === 'offered',
   );
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
   const recentActivity = [
      ...appointmentRows.map((appointment) => {
         const providerName = [
            appointment.providerFirst,
            appointment.providerLast,
         ]
            .filter(Boolean)
            .join(' ');
         return {
            id: `appointment-${appointment.id}`,
            title: 'Appointment booked',
            description:
               `${appointment.visitTypeName || 'Appointment'}` +
               (providerName ? ` with Dr. ${providerName}` : ''),
            occurredAt: appointment.createdAt,
            href: '/patient/appointments',
            icon: 'calendar',
         };
      }),
      ...bills.map((bill) => ({
         id: `bill-${bill.id}`,
         title: 'Bill uploaded',
         description: 'A bill was uploaded to your account.',
         occurredAt: bill.uploadDate,
         href: '/patient/bills',
         icon: 'receipt',
      })),
      ...coverages.map((coverage) => {
         const createdAt = Date.parse(coverage.createdAt);
         const updatedAt = Date.parse(coverage.updatedAt ?? coverage.createdAt);
         const wasUpdated = Number.isFinite(updatedAt) && updatedAt > createdAt;
         return {
            id: `coverage-${coverage.id}`,
            title: wasUpdated
               ? 'Insurance information updated'
               : 'Insurance information added',
            description: wasUpdated
               ? 'Your insurance information was updated in Settings.'
               : 'Insurance information was added in Settings.',
            occurredAt: wasUpdated ? coverage.updatedAt : coverage.createdAt,
            href: '/patient/settings',
            icon: 'settings',
         };
      }),
   ]
      .filter(
         (activity) =>
            activity.occurredAt &&
            Number.isFinite(Date.parse(activity.occurredAt)),
      )
      .sort(
         (left, right) =>
            Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
      );

   return {
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
           }
         : null,
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
      waitlistEntries,
      recentActivity,
   };
}
