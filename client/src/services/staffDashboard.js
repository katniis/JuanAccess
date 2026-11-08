import { staffRequest } from './staffApi.js';

export async function getStaffDashboard() {
   return staffRequest('/staff/dashboard');
}

export async function searchStaffProviders(search = '') {
   const query = new URLSearchParams({ search });
   const { doctors = [] } = await staffRequest('/staff/doctors?' + query);
   return doctors;
}

export async function searchStaffPatients(query = '') {
   const params = new URLSearchParams({ query });
   const { patients = [] } = await staffRequest('/staff/patients?' + params);
   return patients;
}

export async function getStaffPatientRecord(patientId) {
   return staffRequest('/staff/patients/' + encodeURIComponent(patientId));
}

export async function getStaffAttentionData() {
   const [dashboard, priorAuth, appeals, waitlist] = await Promise.all([
      staffRequest('/staff/dashboard'),
      staffRequest('/staff/prior-auth?status=all'),
      staffRequest('/staff/appeals?status=all'),
      staffRequest('/staff/waitlist?status=all'),
   ]);
   return {
      dashboard,
      priorAuth: priorAuth.priorAuthorizations || [],
      appeals: appeals.appeals || [],
      waitlist: waitlist.waitlist || [],
   };
}
