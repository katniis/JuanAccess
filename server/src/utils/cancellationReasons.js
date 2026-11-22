// Cancellation Reason categories (GLOSSARY.md): patients and staff choose from separate lists.
export const PATIENT_CANCELLATION_REASONS = [
   'schedule_conflict',
   'feeling_better',
   'cost',
   'found_another_clinic',
   'transport',
   'other',
];

export const STAFF_CANCELLATION_REASONS = [
   'practitioner_unavailable',
   'patient_request',
   'clinic_closure',
   'other',
];

// Returns { reason, reasonText } or { error } for the caller's role list.
export function parseCancellationReason(role, body) {
   const { reason, reasonText } = body ?? {};
   const allowed =
      role === 'patient'
         ? PATIENT_CANCELLATION_REASONS
         : STAFF_CANCELLATION_REASONS;
   const text =
      typeof reasonText === 'string' ? reasonText.trim().slice(0, 1000) : '';
   if (!allowed.includes(reason)) {
      return { error: 'A valid cancellation reason is required' };
   }
   if (reason === 'other' && !text) {
      return { error: 'Please describe your reason for cancelling' };
   }
   return { reason, reasonText: text || null };
}
