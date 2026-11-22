import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
   mockMutationLog,
   mockQueryQueue,
   postJson,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;
const patientUser = {
   id: 1,
   email: 'pat@example.test',
   role: 'patient',
   patientId: 10,
   providerId: null,
   displayName: 'Pat Sample',
};
const staffUser = {
   id: 2,
   email: 'staff@example.test',
   role: 'staff',
   patientId: null,
   providerId: null,
   displayName: 'Staff Sample',
};
const auth = (user) => ({
   cookie: `token=${jwt.sign({ id: user.id }, secret)}`,
});
// The appointment row deliberately carries identifiers that must never reach the AI.
const appointmentRow = {
   visitTypeName: 'General Checkup',
   patientFirstName: 'Maria',
   patientEmail: 'maria@example.test',
};

const originalFetch = global.fetch;
const originalKey = process.env.GEMINI_API_KEY;
let geminiPrompts;

function mockGemini(response) {
   geminiPrompts = [];
   process.env.GEMINI_API_KEY = 'test-key';
   global.fetch = jest.fn(async (url, init) => {
      if (!String(url).includes('generativelanguage')) {
         return originalFetch(url, init);
      }
      geminiPrompts.push(JSON.parse(init.body).contents[0].parts[0].text);
      return response;
   });
}

let ctx;
beforeAll(async () => {
   ctx = await startServer();
});
afterAll(async () => {
   await ctx.close();
});
beforeEach(() => {
   resetMocks();
   delete process.env.GEMINI_API_KEY;
});
afterEach(() => {
   global.fetch = originalFetch;
   if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
   else process.env.GEMINI_API_KEY = originalKey;
});

const draftAsPatient = (body) =>
   postJson(
      ctx.baseUrl,
      '/appointment/5/cancellation-letter/draft',
      body,
      auth(patientUser),
   );
const draftAsStaff = (body) =>
   postJson(
      ctx.baseUrl,
      '/staff/appointments/5/cancellation-letter/draft',
      body,
      auth(staffUser),
   );

describe('Cancellation Letter drafts', () => {
   it('returns the fallback patient letter when Gemini is off', async () => {
      mockQueryQueue.push([patientUser], [appointmentRow]);

      const res = await draftAsPatient({
         reason: 'other',
         reasonText: 'car broke down',
      });

      expect(res.status).toBe(200);
      const body = await readJson(res);
      expect(body.source).toBe('fallback');
      expect(body.letter).toContain('General Checkup');
      expect(body.letter).toContain('car broke down');
   });

   it('drafts a patient letter with Gemini from the reason only', async () => {
      mockGemini({
         ok: true,
         json: async () => ({
            candidates: [{ content: { parts: [{ text: 'Polite letter' }] } }],
         }),
      });
      mockQueryQueue.push([patientUser], [appointmentRow]);

      const res = await draftAsPatient({ reason: 'transport' });

      expect(await readJson(res)).toEqual({
         letter: 'Polite letter',
         source: 'gemini',
      });
      expect(geminiPrompts).toHaveLength(1);
      expect(geminiPrompts[0]).toContain('General Checkup');
      expect(geminiPrompts[0]).not.toMatch(/Maria|maria@example|Pat Sample/);
   });

   it('returns 404 when the patient does not own a scheduled appointment', async () => {
      mockQueryQueue.push([patientUser], []);

      const res = await draftAsPatient({ reason: 'transport' });

      expect(res.status).toBe(404);
   });

   it('rejects a draft without a valid Cancellation Reason', async () => {
      mockQueryQueue.push([patientUser]);

      const res = await draftAsPatient({ reason: 'clinic_closure' });

      expect(res.status).toBe(400);
   });

   it('drafts a staff letter with the candidate dates and no patient details', async () => {
      mockGemini({
         ok: true,
         json: async () => ({
            candidates: [{ content: { parts: [{ text: 'Sorry letter' }] } }],
         }),
      });
      mockQueryQueue.push([staffUser], [appointmentRow]);

      const res = await draftAsStaff({
         reason: 'practitioner_unavailable',
         candidateDates: ['Dec 3, 9 AM', 'Dec 4, 2 PM'],
      });

      expect(await readJson(res)).toEqual({
         letter: 'Sorry letter',
         source: 'gemini',
      });
      expect(geminiPrompts[0]).toContain('Dec 3, 9 AM');
      expect(geminiPrompts[0]).not.toMatch(/Maria|maria@example/);
   });

   it('falls back to a staff letter when Gemini fails', async () => {
      mockGemini({ ok: false, json: async () => ({}) });
      mockQueryQueue.push([staffUser], [appointmentRow]);

      const res = await draftAsStaff({
         reason: 'clinic_closure',
         candidateDates: ['Dec 3, 9 AM'],
      });

      const body = await readJson(res);
      expect(body.source).toBe('fallback');
      expect(body.letter).toMatch(/apologi/i);
      expect(body.letter).toContain('Dec 3, 9 AM');
   });
});

describe('Submitting a Cancellation Letter with the cancellation', () => {
   it('stores the patient letter on the appointment', async () => {
      mockQueryQueue.push(
         [patientUser],
         [{ id: 5, status: 'scheduled', providerId: null }],
         [{ id: 5 }],
         [],
         [null],
      );

      const res = await fetch(`${ctx.baseUrl}/appointment/5`, {
         method: 'DELETE',
         headers: { 'content-type': 'application/json', ...auth(patientUser) },
         body: JSON.stringify({
            reason: 'transport',
            letter: '  Dear clinic, I cannot make it.  ',
         }),
      });

      expect(res.status).toBe(204);
      const { set } = mockMutationLog.find(
         (entry) => entry.set?.status === 'cancelled',
      );
      expect(set.cancellationLetter).toBe('Dear clinic, I cannot make it.');
   });

   it('stores the staff letter and delivers it to the patient as a notification', async () => {
      mockQueryQueue.push(
         [staffUser],
         [{ id: 5, status: 'scheduled', providerId: null, patientId: 10 }],
         [{ id: 5, status: 'cancelled' }],
         [], // audit entry
         [{ id: 1, emailNotificationsEnabled: true }], // patient user
         [{ id: 99 }], // notification insert
         [], // waitlist offer
      );

      const res = await fetch(`${ctx.baseUrl}/staff/appointments/5/cancel`, {
         method: 'PATCH',
         headers: { 'content-type': 'application/json', ...auth(staffUser) },
         body: JSON.stringify({
            reason: 'clinic_closure',
            letter: 'We are sorry, the clinic is closed that day.',
         }),
      });

      expect(res.status).toBe(200);
      const { set } = mockMutationLog.find(
         (entry) => entry.set?.status === 'cancelled',
      );
      expect(set.cancellationLetter).toBe(
         'We are sorry, the clinic is closed that day.',
      );
      const notification = mockMutationLog.find(
         (entry) => entry.values?.type === 'appointment_cancelled',
      );
      expect(notification.values).toMatchObject({
         userId: 1,
         message: 'We are sorry, the clinic is closed that day.',
      });
   });

   it('keeps the default notification when staff send no letter', async () => {
      mockQueryQueue.push(
         [staffUser],
         [{ id: 5, status: 'scheduled', providerId: null, patientId: 10 }],
         [{ id: 5, status: 'cancelled' }],
         [],
         [{ id: 1, emailNotificationsEnabled: true }],
         [{ id: 99 }],
         [],
      );

      const res = await fetch(`${ctx.baseUrl}/staff/appointments/5/cancel`, {
         method: 'PATCH',
         headers: { 'content-type': 'application/json', ...auth(staffUser) },
         body: JSON.stringify({ reason: 'clinic_closure' }),
      });

      expect(res.status).toBe(200);
      const { set } = mockMutationLog.find(
         (entry) => entry.set?.status === 'cancelled',
      );
      expect(set.cancellationLetter).toBeNull();
      const notification = mockMutationLog.find(
         (entry) => entry.values?.type === 'appointment_cancelled',
      );
      expect(notification.values.message).toBe(
         'Your appointment was cancelled by clinic staff.',
      );
   });
});
