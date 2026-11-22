import { staffRequest } from './staffApi.js';

export async function getStaffProviders() {
   const { doctors = [] } = await staffRequest('/staff/doctors');
   return doctors;
}

export async function getProviderSchedule(
   providerId,
   { date, start, end } = {},
) {
   const params = new URLSearchParams();
   if (start && end) {
      params.set('range_start', start);
      params.set('range_end', end);
   } else if (date) params.set('date', date);
   const suffix = params.size ? '?' + params : '';
   const { schedule = [] } = await staffRequest(
      `/staff/doctors/${encodeURIComponent(providerId)}/schedule${suffix}`,
   );
   return schedule;
}

export async function getDutyOverrides(practitionerId) {
   const { overrides = [] } = await staffRequest(
      `/staff/practitioners/${encodeURIComponent(practitionerId)}/duty-overrides`,
   );
   return overrides;
}

export function createDutyOverride(override) {
   return staffRequest('/staff/admin/reference/duty-overrides', {
      method: 'POST',
      body: override,
   });
}

export function deleteDutyOverride(id) {
   return staffRequest(
      `/staff/admin/reference/duty-overrides/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
   );
}

export async function getAppointmentPreVisitData(appointmentId) {
   return staffRequest(
      `/staff/appointments/${encodeURIComponent(appointmentId)}/pre-visit-data`,
   );
}

export const STAFF_CANCELLATION_REASONS = [
   { value: 'practitioner_unavailable', label: 'Practitioner unavailable' },
   { value: 'patient_request', label: 'Patient request' },
   { value: 'clinic_closure', label: 'Clinic closure' },
   { value: 'other', label: 'Other' },
];

export function cancelStaffAppointment(
   appointmentId,
   { reason, reasonText, letter },
) {
   return staffRequest(
      `/staff/appointments/${encodeURIComponent(appointmentId)}/cancel`,
      { method: 'PATCH', body: { reason, reasonText, letter } },
   );
}

export function draftStaffCancellationLetter(
   appointmentId,
   { reason, reasonText, candidateDates },
) {
   return staffRequest(
      `/staff/appointments/${encodeURIComponent(appointmentId)}/cancellation-letter/draft`,
      { method: 'POST', body: { reason, reasonText, candidateDates } },
   );
}
