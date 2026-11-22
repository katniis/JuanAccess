import { staffRequest } from './staffApi.js';

export async function getApeQueue() {
   const { windows = [] } = await staffRequest('/staff/ape-queue');
   return windows;
}

export async function getEligiblePractitioners(bookingProcedureId) {
   const { practitioners = [] } = await staffRequest(
      `/staff/ape-queue/procedures/${bookingProcedureId}/practitioners`,
   );
   return practitioners;
}

export function assignStation(bookingProcedureId, practitionerId) {
   return staffRequest(
      `/staff/ape-queue/procedures/${bookingProcedureId}/assignment`,
      { method: 'POST', body: { practitioner_id: practitionerId } },
   );
}
