import { staffRequest } from './staffApi.js';

const stages = [
   'needs_draft',
   'drafted',
   'submitted',
   'manual_review',
   'approved',
   'denied',
];

function mapRecord(record) {
   return {
      ...record,
      patient: [record.patientFirstName, record.patientLastName]
         .filter(Boolean)
         .join(' '),
      dateOfBirth: record.patientDob,
      visitType: record.visitTypeName,
      insurer: record.insurerName || record.planName || 'Not on file',
      justification: record.justificationText || '',
   };
}

export async function getStaffPriorAuthQueue() {
   const { priorAuthorizations = [] } = await staffRequest(
      '/staff/prior-auth?status=all',
   );
   return priorAuthorizations.map(mapRecord);
}

export async function getStaffPriorAuthDetail(id) {
   const data = await staffRequest(
      `/staff/prior-auth/${encodeURIComponent(id)}`,
   );
   return { ...data, priorAuthorization: mapRecord(data.priorAuthorization) };
}

export async function savePriorAuthDraft(id, justificationText) {
   const { priorAuthorization } = await staffRequest(
      `/staff/prior-auth/${encodeURIComponent(id)}/draft`,
      {
         method: 'PATCH',
         body: justificationText
            ? { justification_text: justificationText }
            : {},
      },
   );
   return priorAuthorization;
}

export async function submitPriorAuth(id, planDecision) {
   return staffRequest(`/staff/prior-auth/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      body: planDecision ? { plan_decision: planDecision } : {},
   });
}

export async function setPriorAuthDecision(id, status, denialReason) {
   return staffRequest(`/staff/prior-auth/${encodeURIComponent(id)}/decision`, {
      method: 'PATCH',
      body: { status, ...(denialReason && { denial_reason: denialReason }) },
   });
}

export async function createAppealFromPriorAuth(id) {
   return staffRequest('/staff/appeals', {
      method: 'POST',
      body: { prior_authorization_id: Number(id) },
   });
}

export { stages };
