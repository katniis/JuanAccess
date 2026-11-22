import { staffRequest } from './staffApi.js';

export const PROFESSIONS = [
   ['physician', 'Physician'],
   ['nurse', 'Nurse'],
   ['medical_technologist', 'Medical technologist'],
   ['radiologic_technologist', 'Radiologic technologist'],
];

export async function getPractitioners() {
   const { practitioners = [] } = await staffRequest(
      '/staff/admin/practitioners',
   );
   return practitioners;
}

export function savePractitioner(id, body) {
   return staffRequest(
      id ? `/staff/admin/practitioners/${id}` : '/staff/admin/practitioners',
      { method: id ? 'PATCH' : 'POST', body },
   );
}

export function uploadPractitionerPhoto(id, file) {
   const formData = new FormData();
   formData.append('file', file);
   return staffRequest(`/staff/admin/practitioners/${id}/photo`, {
      method: 'POST',
      body: formData,
   });
}
