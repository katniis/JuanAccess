/**
 * Local insurance-plan simulation
 *
 * Provides deterministic plan decisions for prior-authorizations. There is no
 * external payer appeal workflow in this project.
 */

export const mockInsurerService = {
   /**
    * Submit a prior authorization to the local plan simulation.
    * The caller may choose approved, denied, or submitted for a demo flow.
    * Approved is the default so the workflow completes without an external payer.
    */
   adjudicatePriorAuth({ mockOutcome } = {}) {
      const outcome = ['approved', 'denied', 'submitted'].includes(mockOutcome)
         ? mockOutcome
         : 'approved';

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

      // Explicit denial with a synthetic plan reason.
      const defaultReason =
         'Local insurance-plan simulation denied the request for demonstration purposes.';

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

function simulateEligibility({ eligibilityStatus, mockOutcome } = {}) {
   const status = ['active', 'inactive'].includes(eligibilityStatus)
      ? eligibilityStatus
      : mockOutcome === 'inactive'
        ? 'inactive'
        : 'active';
   return {
      status,
      eligible: status === 'active',
      decisionAt: new Date(),
      denialReason:
         status === 'inactive'
            ? 'Local insurance-plan simulation marked coverage inactive.'
            : null,
      source: 'local_plan',
   };
}

export const insurerService = {
   async verifyEligibility(request = {}) {
      return simulateEligibility(request);
   },

   submitPriorAuthorization({ mockOutcome, planDecision } = {}) {
      return mockInsurerService.adjudicatePriorAuth({
         mockOutcome: mockOutcome || planDecision,
      });
   },

   getPriorAuthorizationStatus() {
      return { status: 'approved', source: 'local_plan' };
   },

   submitAppeal({ mockOutcome } = {}) {
      return mockInsurerService.adjudicateAppeal({ mockOutcome });
   },

   getAppealStatus() {
      return { status: 'approved', source: 'local_plan' };
   },
};
