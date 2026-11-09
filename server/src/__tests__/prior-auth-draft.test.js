import { describe, expect, it } from '@jest/globals';
import { mockQueryQueue, resetMocks } from './helpers.js';
const {
   buildPriorAuthPrompt,
   generatePriorAuthDraft,
   processPendingPriorAuthDrafts,
} = await import('../services/prior-auth-draft.service.js');

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
      const originalWorkerSetting = process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED;
      delete process.env.GEMINI_API_KEY;
      process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED = 'false';
      try {
         const result = await generatePriorAuthDraft(8);
         expect(result).toMatchObject({
            source: 'fallback',
            priorAuthorization: updated,
         });
      } finally {
         if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
         else process.env.GEMINI_API_KEY = originalKey;
         if (originalWorkerSetting === undefined)
            delete process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED;
         else
            process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED = originalWorkerSetting;
      }
   });

   it('does not regenerate a drafted record unless explicitly forced', async () => {
      mockQueryQueue.push([{ id: 8, status: 'drafted', appointmentId: 20 }]);
      await expect(generatePriorAuthDraft(8)).resolves.toBeNull();
   });

   it('skips queued draft lookup when the background worker is disabled', async () => {
      const originalSetting = process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED;
      process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED = 'false';
      mockQueryQueue.push(new Error('disabled worker queried the database'));

      try {
         await expect(processPendingPriorAuthDrafts()).resolves.toEqual({
            processed: 0,
            pending: 0,
            skipped: true,
         });
         expect(mockQueryQueue).toHaveLength(1);
      } finally {
         if (originalSetting === undefined)
            delete process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED;
         else process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED = originalSetting;
      }
   });

   it('keeps the background worker enabled when the setting is unset', async () => {
      const originalSetting = process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED;
      delete process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED;
      mockQueryQueue.push([]);

      try {
         await expect(processPendingPriorAuthDrafts()).resolves.toEqual({
            processed: 0,
            pending: 0,
         });
         expect(mockQueryQueue).toHaveLength(0);
      } finally {
         if (originalSetting === undefined)
            delete process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED;
         else process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED = originalSetting;
      }
   });
});
