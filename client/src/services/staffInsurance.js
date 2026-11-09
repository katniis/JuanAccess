import { staffRequest } from './staffApi.js';

export async function getInsuranceVerificationQueue() {
   const { unverifiedCoverages = [] } = await staffRequest(
      '/staff/insurance/unverified',
   );
   return unverifiedCoverages;
}

export function verifyInsuranceCoverage(coverageId, status) {
   return staffRequest(`/staff/insurance/coverage/${coverageId}/verify`, {
      method: 'PATCH',
      body: { status },
   });
}
