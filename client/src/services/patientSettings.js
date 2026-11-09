import { patientRequest } from './patientApi.js';

export async function getMyCoverage() {
   const { coverages = [] } = await patientRequest('/insurance/mine');
   return coverages;
}

export function addMyCoverage(details) {
   return patientRequest('/insurance/mine', { method: 'POST', body: details });
}

export function updateMyCoverage(coverageId, details) {
   return patientRequest(`/insurance/mine/${coverageId}`, {
      method: 'PATCH',
      body: details,
   });
}
