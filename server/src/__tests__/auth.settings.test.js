import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
   mockMutationLog,
   mockQueryQueue,
   mockSendEmail,
   postJson,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;
const patient = {
   id: 21,
   email: 'patient@example.test',
   role: 'patient',
   patientId: 31,
   providerId: null,
   displayName: 'Pat Patient',
};
const token = jwt.sign({ id: patient.id, authVersion: 0 }, secret);
const authHeader = { cookie: `token=${token}` };
const passwordHash = bcrypt.hashSync('current-password', 10);

describe('account settings', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   it('returns role-specific profile data and email preferences', async () => {
      mockQueryQueue.push(
         [patient],
         [
            {
               id: patient.id,
               email: patient.email,
               role: patient.role,
               displayName: patient.displayName,
               emailNotificationsEnabled: true,
               firstName: 'Pat',
               lastName: 'Patient',
               dateOfBirth: '1990-01-02',
               gender: 'female',
               contactPhone: '09170000000',
               address: 'Test address',
            },
         ],
      );
      const res = await fetch(`${ctx.baseUrl}/auth/settings`, {
         headers: authHeader,
      });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({
         settings: {
            email: patient.email,
            role: 'patient',
            displayName: 'Pat Patient',
            emailNotificationsEnabled: true,
            profile: {
               firstName: 'Pat',
               lastName: 'Patient',
               dateOfBirth: '1990-01-02',
               gender: 'female',
               contactPhone: '09170000000',
               address: 'Test address',
            },
         },
      });
   });

   it('requires email changes to use the confirmation flow', async () => {
      mockQueryQueue.push([patient]);
      const res = await fetch(`${ctx.baseUrl}/auth/settings`, {
         method: 'PATCH',
         headers: { ...authHeader, 'content-type': 'application/json' },
         body: JSON.stringify({ email: 'new-address@example.test' }),
      });

      expect(res.status).toBe(400);
      expect(await readJson(res)).toMatchObject({ error: expect.any(String) });
   });

   it('rejects changes without an authenticated account', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/settings`, {
         method: 'PATCH',
         headers: { 'content-type': 'application/json' },
         body: JSON.stringify({ emailNotificationsEnabled: false }),
      });
      expect(res.status).toBe(401);
   });

   it('stores email preference changes and leaves in-app notices enabled', async () => {
      mockQueryQueue.push(
         [patient],
         [],
         [],
         [{ ...patient, emailNotificationsEnabled: false }],
      );
      const res = await fetch(`${ctx.baseUrl}/auth/settings`, {
         method: 'PATCH',
         headers: { ...authHeader, 'content-type': 'application/json' },
         body: JSON.stringify({ emailNotificationsEnabled: false }),
      });

      expect(res.status).toBe(200);
      expect((await readJson(res)).settings.emailNotificationsEnabled).toBe(
         false,
      );
      expect(mockMutationLog).toContainEqual({
         set: { emailNotificationsEnabled: false },
      });
      expect(mockMutationLog).toContainEqual({
         set: {
            emailStatus: 'skipped',
            emailNextAttemptAt: null,
            emailLastError: null,
         },
      });
   });

   it('requires a current password and confirmation before changing login email', async () => {
      mockQueryQueue.push(
         [patient],
         [{ email: patient.email, passwordHash }],
         [],
         [],
         [{ id: 55 }],
      );
      const res = await fetch(`${ctx.baseUrl}/auth/email-change/request`, {
         method: 'POST',
         headers: { ...authHeader, 'content-type': 'application/json' },
         body: JSON.stringify({
            newEmail: 'new-address@example.test',
            password: 'current-password',
         }),
      });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toMatchObject({
         message: expect.any(String),
      });
      expect(mockSendEmail).toHaveBeenCalledWith(
         expect.objectContaining({
            to: 'new-address@example.test',
            text: expect.stringContaining('/confirm-email?token='),
            idempotencyKey: 'account-action/55',
         }),
      );

      const tokenRow = mockMutationLog.find(
         (mutation) => mutation.values?.purpose === 'email_change',
      ).values;
      expect(tokenRow.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(tokenRow.tokenHash).not.toContain('email-change-token-value');
   });

   it('confirms a one-time email change and notifies the old address', async () => {
      const tokenValue = 'email-change-token-value';
      const action = {
         id: 57,
         userId: patient.id,
         pendingEmail: 'new-address@example.test',
         expiresAt: new Date(Date.now() + 60_000),
         consumedAt: null,
         currentEmail: patient.email,
         patientId: patient.patientId,
      };
      mockQueryQueue.push(
         [action],
         [{ id: action.id }],
         [{ id: patient.id }],
         [],
      );
      const res = await postJson(ctx.baseUrl, '/auth/email-change/confirm', {
         token: tokenValue,
      });

      expect(res.status).toBe(200);
      expect(mockMutationLog).toContainEqual({
         set: { email: action.pendingEmail },
      });
      expect(mockSendEmail).toHaveBeenCalledWith(
         expect.objectContaining({
            to: patient.email,
            subject: expect.stringMatching(/changed/i),
            idempotencyKey: 'email-change-confirmed/57',
         }),
      );

      mockQueryQueue.push([]);
      const reused = await postJson(ctx.baseUrl, '/auth/email-change/confirm', {
         token: tokenValue,
      });
      expect(reused.status).toBe(400);
   });

   it('changes the current password and invalidates other remembered sessions', async () => {
      const rememberedToken = jwt.sign(
         { id: patient.id, authVersion: 0, rememberMe: true },
         secret,
      );
      mockQueryQueue.push(
         [{ ...patient, authVersion: 0 }],
         [{ passwordHash, authVersion: 0 }],
         [{ authVersion: 1 }],
      );
      const res = await fetch(`${ctx.baseUrl}/auth/password`, {
         method: 'PATCH',
         headers: {
            cookie: `token=${rememberedToken}`,
            'content-type': 'application/json',
         },
         body: JSON.stringify({
            currentPassword: 'current-password',
            newPassword: 'replacement-password',
         }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toMatch(/max-age=2592000/i);
      const currentToken = res.headers
         .get('set-cookie')
         .match(/token=([^;]+)/)[1];
      expect(jwt.decode(currentToken)).toMatchObject({
         authVersion: 1,
         rememberMe: true,
      });

      mockQueryQueue.push([{ ...patient, authVersion: 1 }]);
      const oldSession = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: { cookie: `token=${token}` },
      });
      expect(oldSession.status).toBe(401);
   });
});
