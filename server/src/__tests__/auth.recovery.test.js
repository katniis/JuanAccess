import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
   mockQueryQueue,
   mockSendEmail,
   postJson,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;
const patient = {
   id: 7,
   email: 'patient@example.test',
   role: 'patient',
   patientId: 12,
   providerId: null,
   displayName: 'Test Patient',
   passwordHash: '$2a$10$existing-hash',
   authVersion: 0,
};
const resetToken = 'one-time-reset-token';
const resetTokenHash = crypto
   .createHash('sha256')
   .update(resetToken)
   .digest('hex');

describe('password recovery', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   it('returns the same response for an unknown email without sending email', async () => {
      mockQueryQueue.push([]);
      const res = await postJson(ctx.baseUrl, '/auth/forgot-password', {
         email: 'unknown@example.test',
      });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({
         message:
            'If an account matches that email, a reset link will be sent.',
      });
      expect(mockSendEmail).not.toHaveBeenCalled();
   });

   it('sends a reset link for an existing account with the same public response', async () => {
      mockQueryQueue.push([patient], [], [{ id: 31 }]);
      const res = await postJson(ctx.baseUrl, '/auth/forgot-password', {
         email: patient.email,
      });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({
         message:
            'If an account matches that email, a reset link will be sent.',
      });
      expect(mockSendEmail).toHaveBeenCalledWith(
         expect.objectContaining({
            to: patient.email,
            subject: expect.stringMatching(/reset/i),
            text: expect.stringContaining('/reset-password?token='),
            idempotencyKey: 'account-action/31',
         }),
      );
   });

   it('rate limits repeated reset requests from the same source', async () => {
      const statuses = [];
      for (let index = 0; index < 4; index += 1) {
         resetMocks();
         mockQueryQueue.push([]);
         const res = await postJson(ctx.baseUrl, '/auth/forgot-password', {
            email: `unknown-${index}@example.test`,
         });
         statuses.push(res.status);
      }
      expect(statuses).toEqual([200, 200, 200, 429]);
   });

   it('consumes a valid token, changes the password, and revokes old sessions', async () => {
      const action = {
         id: 31,
         userId: patient.id,
         purpose: 'password_reset',
         tokenHash: resetTokenHash,
         expiresAt: new Date(Date.now() + 60_000),
         consumedAt: null,
      };
      mockQueryQueue.push([action], [{ id: action.id }], [{ id: patient.id }]);
      const res = await postJson(ctx.baseUrl, '/auth/reset-password', {
         token: resetToken,
         password: 'new-secure-password',
      });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toMatchObject({
         message: expect.any(String),
      });

      mockQueryQueue.push([{ ...patient, authVersion: 1 }]);
      const oldSession = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: {
            cookie: `token=${jwt.sign({ id: patient.id, authVersion: 0 }, secret)}`,
         },
      });
      expect(oldSession.status).toBe(401);

      mockQueryQueue.push([]);
      const reusedToken = await postJson(ctx.baseUrl, '/auth/reset-password', {
         token: resetToken,
         password: 'another-new-password',
      });
      expect(reusedToken.status).toBe(400);
   });

   it('rejects expired or already-used reset tokens', async () => {
      mockQueryQueue.push([]);
      const res = await postJson(ctx.baseUrl, '/auth/reset-password', {
         token: resetToken,
         password: 'new-secure-password',
      });

      expect(res.status).toBe(400);
      expect(await readJson(res)).toMatchObject({ error: expect.any(String) });
   });
});
