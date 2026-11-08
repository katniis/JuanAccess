import { patientRequest } from './patientApi.js';
import {
   formatClinicDate,
   formatClinicMonth,
   formatClinicTime,
} from './patientDates.js';

const insuranceStatuses = {
   active: { label: 'Active', pill: 'active' },
   inactive: { label: 'Inactive', pill: 'waitlisted' },
   unverified: { label: 'Unverified', pill: 'pending' },
};

const priorAuthorizationStatuses = {
   needs_draft: { label: 'Needs Draft', pill: 'pending' },
   drafted: { label: 'Drafted', pill: 'pending' },
   submitted: { label: 'Submitted', pill: 'active' },
   approved: { label: 'Approved', pill: 'approved' },
   denied: { label: 'Denied', pill: 'denied' },
};

export async function getPatientAppointments() {
   const rows = await patientRequest('/appointment/mine');
   const now = Date.now();
   const mapped = rows.map(mapPatientAppointment);
   return {
      upcoming: mapped
         .filter(
            (appointment) =>
               appointment.status === 'scheduled' &&
               new Date(appointment.scheduledStart).getTime() >= now,
         )
         .sort(
            (a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart),
         ),
      past: mapped
         .filter(
            (appointment) =>
               appointment.status !== 'scheduled' ||
               new Date(appointment.scheduledStart).getTime() < now,
         )
         .sort(
            (a, b) => new Date(b.scheduledStart) - new Date(a.scheduledStart),
         ),
   };
}

export async function getMyPriorAuthorizationStatuses() {
   const { priorAuthorizations = [] } =
      await patientRequest('/prior-auth/mine');
   return priorAuthorizations;
}

export function mapPatientAppointment(appointment) {
   const insurance = insuranceStatuses[appointment.insuranceStatus] || {
      label: 'Unknown',
      pill: 'waitlisted',
   };
   const priorAuthorization = appointment.priorAuthorizationStatus
      ? priorAuthorizationStatuses[appointment.priorAuthorizationStatus] || {
           label: appointment.priorAuthorizationStatus.replaceAll('_', ' '),
           pill: 'pending',
        }
      : { label: 'Not Required', pill: 'not-required' };
   const start = new Date(appointment.scheduledStart);

   return {
      id: appointment.id,
      providerName: appointment.providerFirst
         ? 'Dr. ' + appointment.providerFirst + ' ' + appointment.providerLast
         : 'Provider',
      visitType: appointment.visitTypeName || 'Appointment',
      scheduledStart: appointment.scheduledStart,
      scheduledEnd: appointment.scheduledEnd,
      status: appointment.status,
      dateLabel: formatClinicDate(appointment.scheduledStart),
      monthLabel: formatClinicMonth(appointment.scheduledStart).toUpperCase(),
      dayLabel: new Intl.DateTimeFormat(undefined, {
         timeZone: 'Asia/Manila',
         day: 'numeric',
      }).format(start),
      timeLabel: formatClinicTime(appointment.scheduledStart),
      insuranceStatus: insurance.pill,
      insuranceLabel: insurance.label,
      priorAuthorizationStatus: priorAuthorization.pill,
      priorAuthorizationLabel: priorAuthorization.label,
   };
}

export function cancelPatientAppointment(id) {
   return patientRequest('/appointment/' + id, { method: 'DELETE' });
}
