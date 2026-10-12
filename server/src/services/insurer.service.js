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

const manualOutcome = (operation) => ({
   status: 'manual_review',
   decisionAt: null,
   denialReason: null,
   notes: `${operation} requires staff review because no supported insurer endpoint is configured.`,
});

async function philHealthEligibility(request) {
   const baseUrl = process.env.PHILHEALTH_BASE_URL?.trim();
   const username = process.env.PHILHEALTH_USERNAME?.trim();
   const password = process.env.PHILHEALTH_PASSWORD?.trim();
   const path = process.env.PHILHEALTH_ELIGIBILITY_PATH?.trim();
   if (!baseUrl || !username || !password || !path) {
      return manualOutcome('Eligibility');
   }

   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 10_000);
   try {
      const response = await fetch(
         `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`,
         {
            method: 'POST',
            headers: {
               'content-type': 'application/json',
               authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
               ...(process.env.PHILHEALTH_ACCOUNT_KEY
                  ? { 'x-account-key': process.env.PHILHEALTH_ACCOUNT_KEY }
                  : {}),
            },
            body: JSON.stringify(request),
            signal: controller.signal,
         },
      );
      if (!response.ok) return manualOutcome('Eligibility');
      const data = await response.json();
      return {
         status: data?.eligible === true ? 'approved' : 'denied',
         decisionAt: new Date(),
         denialReason:
            data?.eligible === true
               ? null
               : 'PhilHealth eligibility was not confirmed.',
         response: { eligible: data?.eligible === true },
      };
   } catch {
      return manualOutcome('Eligibility');
   } finally {
      clearTimeout(timeout);
   }
}

export const insurerService = {
   async verifyEligibility(request) {
      if (process.env.INSURER_MODE === 'philhealth')
         return philHealthEligibility(request);
      return manualOutcome('Eligibility');
   },

   submitPriorAuthorization({ mockOutcome, planDecision } = {}) {
      return mockInsurerService.adjudicatePriorAuth({
         mockOutcome: mockOutcome || planDecision,
      });
   },

   getPriorAuthorizationStatus() {
      return manualOutcome('Prior authorization status lookup');
   },

   submitAppeal({ mockOutcome } = {}) {
      return mockInsurerService.adjudicateAppeal({ mockOutcome });
   },

   getAppealStatus() {
      return manualOutcome('Appeal status lookup');
   },
};
