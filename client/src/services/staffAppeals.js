import { staffRequest } from './staffApi.js';

function mapAppeal(appeal) {
   return {
      ...appeal,
      patient: [appeal.patientFirstName, appeal.patientLastName]
         .filter(Boolean)
         .join(' '),
      dateOfBirth: appeal.patientDob,
      visitType: appeal.visitTypeName,
      insurer: appeal.insurerName || appeal.planName || null,
      denialReason: appeal.priorAuthDenialReason || '',
      guideline: appeal.guidelineExcerpt || appeal.guidelineTitle || '',
      guidelineCitation: appeal.guidelineCitation || '',
      chartJustification: appeal.chartJustificationText || '',
      appealLetter: appeal.appealLetterText || '',
   };
}

export async function getStaffAppealsQueue() {
   const { appeals = [] } = await staffRequest('/staff/appeals?status=all');
   return appeals.map(mapAppeal);
}

export async function getStaffAppealDetail(id) {
   const { appeal } = await staffRequest(
      `/staff/appeals/${encodeURIComponent(id)}`,
   );
   return mapAppeal(appeal);
}

export async function saveStaffAppealDraft(
   id,
   appealLetter,
   chartJustification,
) {
   const { appeal } = await staffRequest(
      `/staff/appeals/${encodeURIComponent(id)}`,
      {
         method: 'PATCH',
         body: {
            appeal_letter_text: appealLetter,
            chart_justification_text: chartJustification,
         },
      },
   );
   return appeal;
}

export async function submitStaffAppeal(id) {
   return staffRequest(`/staff/appeals/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      body: {},
   });
}

export async function setStaffAppealDecision(id, status) {
   return staffRequest(`/staff/appeals/${encodeURIComponent(id)}/decision`, {
      method: 'PATCH',
      body: { status },
   });
}
