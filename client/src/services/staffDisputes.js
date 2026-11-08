import { staffRequest } from './staffApi.js';

export async function getStaffDisputes() {
   const data = await staffRequest('/staff/disputes');
   return data.disputes || [];
}

export async function getStaffDisputeDetail(disputeId) {
   const data = await staffRequest('/staff/disputes/' + disputeId);
   return data.dispute || null;
}
