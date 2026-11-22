import { staffRequest } from './staffApi.js';

export async function getCancellationReport(filters) {
   const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
   );
   return staffRequest(`/staff/reports/cancellations?${query}`);
}

export async function getReportFilterOptions() {
   const { visitTypes = [], providers = [] } = await staffRequest(
      '/staff/admin/reference-data',
   );
   return { visitTypes, practitioners: providers };
}
