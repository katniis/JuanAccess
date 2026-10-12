import { afterEach, describe, expect, it } from '@jest/globals';
import { insurerService } from '../services/insurer.service.js';

const originalMode = process.env.INSURER_MODE;

afterEach(() => {
   if (originalMode === undefined) delete process.env.INSURER_MODE;
   else process.env.INSURER_MODE = originalMode;
});

describe('insurer adapter', () => {
   it('keeps prior authorization in manual review by default', () => {
      delete process.env.INSURER_MODE;
      expect(insurerService.submitPriorAuthorization().status).toBe(
         'manual_review',
      );
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

   it('does not call PhilHealth without configured credentials', async () => {
      process.env.INSURER_MODE = 'philhealth';
      delete process.env.PHILHEALTH_BASE_URL;
      delete process.env.PHILHEALTH_USERNAME;
      delete process.env.PHILHEALTH_PASSWORD;
      expect(
         (await insurerService.verifyEligibility({ member_id: 'synthetic' }))
            .status,
      ).toBe('manual_review');
   });
});
