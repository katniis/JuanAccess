import { patientRequest } from './patientApi.js';
import { staffRequest } from './staffApi.js';

const peso = new Intl.NumberFormat('en-PH', {
   style: 'currency',
   currency: 'PHP',
});

export const HMO_NOTE = 'Cash price; HMO coverage may lower what you pay.';

export const formatPeso = (amount) => peso.format(Number(amount));

// Public Price List: { procedures, consultationFees }. No sign-in needed.
export function getPriceList() {
   return patientRequest('/price-list');
}

// staff_admin only: fee schedule rows with ids, for editing Procedure prices.
export async function getFeeSchedule() {
   const { feeSchedule = [] } = await staffRequest('/staff/fee-schedule');
   return feeSchedule;
}

export function saveProcedurePrice(id, standardCost) {
   return staffRequest(`/staff/admin/reference/fee-schedule/${id}`, {
      method: 'PATCH',
      body: { standardCost },
   });
}
