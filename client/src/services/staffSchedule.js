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

export async function getAppointmentPreVisitData(appointmentId) {
   return staffRequest(
      `/staff/appointments/${encodeURIComponent(appointmentId)}/pre-visit-data`,
   );
}
