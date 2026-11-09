import { patientRequest } from './patientApi.js';
import { partitionPatientAppointments } from './patientAppointmentBuckets.js';
import {
   formatClinicDate,
   formatClinicMonth,
   formatClinicTime,
} from './patientDates.js';

export { partitionPatientAppointments };

const insuranceStatuses = {
   active: {
      label: 'Active',
      pill: 'active',
      description:
         'This is the coverage status recorded by the clinic; confirm your benefits with your insurer.',
   },
   inactive: {
      label: 'Inactive',
      pill: 'waitlisted',
      description:
         'The clinic has marked this coverage inactive. Update your details in Settings if they have changed.',
   },
   unverified: {
      label: 'Unverified',
      pill: 'pending',
      description:
         'Clinic staff still need to verify these details. Update them in Settings if anything has changed.',
   },
   unknown: {
      label: 'Unknown',
      pill: 'waitlisted',
      description: 'Ask clinic staff to confirm this coverage status.',
   },
};

const priorAuthorizationStatuses = {
   needs_draft: {
      label: 'Staff draft needed',
      pill: 'pending',
      description:
         'Clinic staff need to prepare the request. No action is needed from you right now.',
   },
   drafted: {
      label: 'Staff review needed',
      pill: 'pending',
      description:
         'A draft is ready for staff review before it enters the plan workflow.',
   },
   manual_review: {
      label: 'Staff review needed',
      pill: 'pending',
      description: 'Clinic staff need to review this request.',
   },
   submitted: {
      label: 'Awaiting outcome',
      pill: 'active',
      description:
         'The request is in the plan workflow. Demo decisions may be simulated and are not a guarantee of payment.',
   },
   approved: {
      label: 'Approved',
      pill: 'approved',
      description:
         'The configured workflow marked this request approved. Confirm benefits and payment with your insurer.',
   },
   denied: {
      label: 'Denied',
      pill: 'denied',
      description:
         'The authorization workflow recorded a denial. Clinic staff can review the available next steps.',
   },
   appealed: {
      label: 'Appeal in progress',
      pill: 'pending',
      description:
         'An appeal is in progress. Clinic staff are reviewing the draft or following up on the plan’s response.',
   },
   not_required: {
      label: 'Not Required',
      pill: 'not-required',
      description:
         'The clinic’s configured rules do not currently require authorization; this does not guarantee payment.',
   },
};

export const insuranceStatusGuide = Object.values(insuranceStatuses);
export const priorAuthorizationStatusGuide = [
   priorAuthorizationStatuses.needs_draft,
   {
      label: 'Staff review needed',
      pill: 'pending',
      description:
         'A draft is ready for staff review, or clinic staff need to review this request.',
   },
   priorAuthorizationStatuses.submitted,
   priorAuthorizationStatuses.approved,
   priorAuthorizationStatuses.denied,
   priorAuthorizationStatuses.appealed,
   priorAuthorizationStatuses.not_required,
];

export async function getPatientAppointments() {
   const rows = await patientRequest('/appointment/mine');
   return partitionPatientAppointments(
      rows.map(mapPatientAppointment),
      Date.now(),
   );
}

export async function getMyPriorAuthorizationStatuses() {
   const { priorAuthorizations = [] } =
      await patientRequest('/prior-auth/mine');
   return priorAuthorizations;
}

export function mapPatientAppointment(appointment) {
   const insurance =
      insuranceStatuses[appointment.insuranceStatus] ||
      insuranceStatuses.unknown;
   const priorAuthorization = appointment.priorAuthorizationStatus
      ? priorAuthorizationStatuses[appointment.priorAuthorizationStatus] || {
           label: appointment.priorAuthorizationStatus.replaceAll('_', ' '),
           pill: 'pending',
           description:
              'Clinic staff can explain this authorization status and any next steps.',
        }
      : {
           label: 'Not Required',
           pill: 'not-required',
           description:
              'The clinic’s configured rules do not currently require authorization; this does not guarantee payment.',
        };
   const start = new Date(appointment.scheduledStart);
   const hasValidStart = Number.isFinite(start.getTime());

   return {
      id: appointment.id,
      providerName: appointment.providerFirst
         ? 'Dr. ' + appointment.providerFirst + ' ' + appointment.providerLast
         : 'Provider',
      visitType: appointment.visitTypeName || 'Appointment',
      scheduledStart: appointment.scheduledStart,
      scheduledEnd: appointment.scheduledEnd,
      status: appointment.status,
      dateLabel: hasValidStart
         ? formatClinicDate(appointment.scheduledStart)
         : 'Date unavailable',
      monthLabel: hasValidStart
         ? formatClinicMonth(appointment.scheduledStart).toUpperCase()
         : '',
      dayLabel: hasValidStart
         ? new Intl.DateTimeFormat(undefined, {
              timeZone: 'Asia/Manila',
              day: 'numeric',
           }).format(start)
         : '—',
      timeLabel: hasValidStart
         ? formatClinicTime(appointment.scheduledStart)
         : 'Time unavailable',
      insuranceStatus: insurance.pill,
      insuranceLabel: insurance.label,
      insuranceDescription: insurance.description,
      priorAuthorizationStatus: priorAuthorization.pill,
      priorAuthorizationLabel: priorAuthorization.label,
      priorAuthorizationDescription: priorAuthorization.description,
   };
}

export function cancelPatientAppointment(id) {
   return patientRequest('/appointment/' + id, { method: 'DELETE' });
}
