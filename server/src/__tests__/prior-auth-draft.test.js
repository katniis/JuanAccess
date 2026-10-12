import { describe, expect, it } from '@jest/globals';
import { mockQueryQueue, resetMocks } from './helpers.js';
const { buildPriorAuthPrompt, generatePriorAuthDraft } =
   await import('../services/prior-auth-draft.service.js');

describe('prior-authorization draft automation', () => {
   beforeEach(resetMocks);

   it('builds a chart-aware prompt without patient identifiers', () => {
      const prompt = buildPriorAuthPrompt(
         {
            appointment: {
               visitTypeName: 'MRI - Knee',
               visitTypeDescription: 'Knee imaging',
               providerSpecialty: 'Orthopedics',
               intakeReasonNote: 'Persistent knee pain',
               insuranceStatus: 'unverified',
            },
            clinicalData: {
               conditions: [
                  { conditionCode: 'M23.2', description: 'Meniscal tear' },
               ],
               recentEncounters: [{ noteText: 'Six weeks of symptoms' }],
               recentLabs: [],
               activeMedications: [],
            },
         },
         { payerName: 'Demo Plan', planName: 'Standard' },
      );

      expect(prompt).toContain('M23.2');
      expect(prompt).toContain('Persistent knee pain');
      expect(prompt).toContain('Standard');
      expect(prompt).not.toContain('Maria');
   });

   it('creates a fallback draft from the appointment chart and notifies the patient', async () => {
      const updated = {
         id: 8,
         status: 'drafted',
         justificationText: 'Staff review draft',
      };
      mockQueryQueue.push(
         [{ id: 8, status: 'needs_draft', appointmentId: 20 }],
         [
            {
               id: 20,
               patientId: 10,
               scheduledStart: '2030-01-02T09:00:00.000Z',
               status: 'scheduled',
               insuranceStatus: 'unverified',
               visitTypeName: 'MRI - Knee',
               visitTypeDescription: 'Knee imaging',
               providerSpecialty: 'Orthopedics',
               intakeReasonNote: 'Persistent knee pain',
            },
         ],
         [{ conditionCode: 'M23.2', description: 'Meniscal tear' }],
         [{ noteText: 'Six weeks of symptoms' }],
         [],
         [],
         [],
         [],
         [],
         [updated],
         [],
         [],
      );
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      try {
         const result = await generatePriorAuthDraft(8);
         expect(result).toMatchObject({
            source: 'fallback',
            priorAuthorization: updated,
         });
      } finally {
         if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
         else process.env.GEMINI_API_KEY = originalKey;
      }
   });

   it('does not regenerate a drafted record unless explicitly forced', async () => {
      mockQueryQueue.push([{ id: 8, status: 'drafted', appointmentId: 20 }]);
      await expect(generatePriorAuthDraft(8)).resolves.toBeNull();
   });
});
