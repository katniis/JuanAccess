/**
 * Mock Insurer Service
 *
 * Provides mock insurer adjudication for prior-authorizations and appeals,
 * per the project specifications in docs.md (reliably demoable denial -> appeal path).
 */

export const mockInsurerService = {
   /**
    * Submit a prior authorization to the mock insurer.
    * By default, returns a denial to enable the denial -> appeal workflow demonstration,
    * unless explicit mockOutcome ('approved' | 'submitted' | 'denied') is requested.
    */
   adjudicatePriorAuth({ mockOutcome } = {}) {
      const outcome = mockOutcome || 'denied';

      if (outcome === 'submitted') {
         return {
            status: 'submitted',
            decisionAt: null,
            denialReason: null,
         };
      }

      if (outcome === 'approved') {
         return {
            status: 'approved',
            decisionAt: new Date(),
            denialReason: null,
         };
      }

      // Default: denied with clinical justification reason
      const defaultReason =
         'Initial review determination: documentation provided does not satisfy clinical policy requirements. Insufficient trial of conservative outpatient therapy (minimum 6 weeks) documented prior to authorizing advanced imaging/procedure.';

      return {
         status: 'denied',
         decisionAt: new Date(),
         denialReason: defaultReason,
      };
   },

   /**
    * Submit an appeal to the mock insurer.
    * Since the appeal cites the relevant clinical guideline, by default it can overturn
    * the denial or stay submitted for adjudication.
    */
   adjudicateAppeal({ mockOutcome } = {}) {
      const outcome = mockOutcome || 'approved';

      if (outcome === 'submitted') {
         return {
            status: 'submitted',
            decisionAt: null,
         };
      }

      if (outcome === 'denied') {
         return {
            status: 'denied',
            decisionAt: new Date(),
            denialReason:
               'Appeal denied: additional peer-to-peer physician review required.',
         };
      }

      return {
         status: 'approved',
         decisionAt: new Date(),
         notes: 'Appeal overturned based on applicable clinical practice guideline criteria.',
      };
   },
};
