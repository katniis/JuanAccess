import { describe, expect, it } from '@jest/globals';
import { insurerService } from '../services/insurer.service.js';

describe('insurer adapter', () => {
   it('uses a local approved plan decision by default', () => {
      expect(insurerService.submitPriorAuthorization().status).toBe('approved');
   });

   it('allows the staff flow to choose a synthetic plan decision', () => {
      expect(
         insurerService.submitPriorAuthorization({ planDecision: 'denied' })
            .status,
      ).toBe('denied');
   });

   it('retains the deterministic mock for test submissions', () => {
      expect(
         insurerService.submitPriorAuthorization({ mockOutcome: 'denied' })
            .status,
      ).toBe('denied');
      expect(
         insurerService.submitAppeal({ mockOutcome: 'approved' }).status,
      ).toBe('approved');
   });

   it('simulates active eligibility by default and supports staff inactive decisions', async () => {
      await expect(insurerService.verifyEligibility()).resolves.toMatchObject({
         status: 'active',
         eligible: true,
         source: 'local_plan',
      });
      await expect(
         insurerService.verifyEligibility({ eligibilityStatus: 'inactive' }),
      ).resolves.toMatchObject({
         status: 'inactive',
         eligible: false,
         source: 'local_plan',
      });
   });
});
