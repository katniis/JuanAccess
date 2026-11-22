import { staffRequest } from './staffApi.js';

// Index = day of week as the server stores it (0 = Sunday).
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function getArrivalWindows() {
   const { arrivalWindows = [] } = await staffRequest(
      '/staff/admin/arrival-windows',
   );
   return arrivalWindows;
}

export function saveArrivalWindow(id, body) {
   return staffRequest(
      id
         ? `/staff/admin/arrival-windows/${id}`
         : '/staff/admin/arrival-windows',
      { method: id ? 'PATCH' : 'POST', body },
   );
}

export function deleteArrivalWindow(id) {
   return staffRequest(`/staff/admin/arrival-windows/${id}`, {
      method: 'DELETE',
   });
}

export function saveProcedureCapacity(id, offeredDays, capacityPerWindow) {
   return staffRequest(`/staff/admin/reference/fee-schedule/${id}`, {
      method: 'PATCH',
      body: { offeredDays, capacityPerWindow },
   });
}
