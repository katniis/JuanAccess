import jwt from 'jsonwebtoken';
import { TOTP, Secret } from 'otpauth';
import { jest } from '@jest/globals';
import { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

const mockRecordAudit = jest.fn();
jest.unstable_mockModule('../services/audit.service.js', () => ({
   recordAudit: mockRecordAudit,
}));

const {
   startServer,
   readJson,
   getCookie,
   resetMocks,
   mockQueryQueue,
   mockMutationLog,
   mockWhereLog,
   postJson,
} = await import('./helpers.js');
const { encryptSecret, hashEnrolmentCode } =
   await import('../services/second-factor.service.js');

const enrolmentMessage = 'Ask a staff admin for an enrolment code.';
const testSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const unenrolledStaff = {
   id: 7,
   email: 'staff@example.test',
   role: 'staff',
   patientId: null,
   providerId: null,
   displayName: 'Sam Staff',
   authVersion: 0,
   failedLoginAttempts: 0,
   lockedUntil: null,
   totpSecretEncrypted: null,
   totpEnabledAt: null,
};
const admin = { ...unenrolledStaff, id: 29, role: 'staff_admin' };
const patient = { ...unenrolledStaff, id: 31, role: 'patient', patientId: 10 };

// What login mints for an unenrolled staff member: no enrolment proof.
const passwordOnlySetup = (claims = {}) => ({
   cookie: `second_factor=${jwt.sign(
      { id: 7, authVersion: 0, purpose: 'second_factor_setup', ...claims },
      process.env.JWT_SECRET,
      { expiresIn: '10m' },
   )}`,
});
const sessionFor = (id) => ({
   cookie: `token=${jwt.sign({ id, authVersion: 0 }, process.env.JWT_SECRET)}`,
});
const audited = (action, extra = {}) =>
   expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 7, action, ...extra }),
   );
const loggedCode = () =>
   mockRecordAudit.mock.calls.some(([entry]) =>
      JSON.stringify(entry).match(/[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}/),
   );

describe('Enrolment Code', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(() => {
      resetMocks();
      mockRecordAudit.mockReset();
   });

   describe('POST /auth/second-factor/setup after a password-only sign-in', () => {
      it.each([
         ['missing', {}, [[unenrolledStaff], [{ attempts: 1 }]]],
         [
            'wrong, expired or already used',
            { enrolmentCode: 'abcd-ef01-2345-6789' },
            [[unenrolledStaff], [], [{ attempts: 1 }]],
         ],
      ])(
         'refuses a %s code, counts it toward lockout, and audits',
         async (_label, body, queue) => {
            mockQueryQueue.push(...queue);

            const res = await postJson(
               ctx.baseUrl,
               '/auth/second-factor/setup',
               body,
               passwordOnlySetup(),
            );

            expect(res.status).toBe(401);
            expect(await readJson(res)).toEqual({ message: enrolmentMessage });
            const increments = mockMutationLog.filter(
               (entry) => entry.set?.failedLoginAttempts,
            );
            expect(increments).toHaveLength(1);
            expect(increments[0].set.failedLoginAttempts).toBeInstanceOf(SQL);
            expect(mockMutationLog).not.toContainEqual({
               set: expect.objectContaining({
                  totpSecretEncrypted: expect.anything(),
               }),
            });
            audited('enrolment_code_failed');
         },
      );

      it('locks the account on the fifth bad code', async () => {
         mockQueryQueue.push([unenrolledStaff], [], [{ attempts: 5 }], []);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup',
            { enrolmentCode: 'abcd-ef01-2345-6789' },
            passwordOnlySetup(),
         );

         expect(res.status).toBe(401);
         audited('login_lockout');
      });

      it('ignores a forged enrolment claim', async () => {
         const forged = `second_factor=${jwt.sign(
            { id: 7, purpose: 'second_factor_setup', enrolmentVerified: true },
            'not-the-server-secret',
         )}`;
         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup',
            {},
            { cookie: forged },
         );
         expect(res.status).toBe(401);
         expect(mockMutationLog).toEqual([]);
      });

      it('consumes a valid code once, only while unused and unexpired', async () => {
         mockQueryQueue.push([unenrolledStaff], [{ id: 5 }], []);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup',
            { enrolmentCode: 'ABCD-EF01-2345-6789' },
            passwordOnlySetup(),
         );

         expect(res.status).toBe(200);
         expect((await readJson(res)).otpauthUrl).toMatch(/^otpauth:/);
         expect(mockMutationLog[0]).toEqual({
            set: { usedAt: expect.any(Date) },
         });
         const consume = new PgDialect().sqlToQuery(mockWhereLog[1]);
         expect(consume.sql).toMatch(/"used_at" is null/);
         expect(consume.sql).toMatch(/"expires_at" > now\(\)/);
         expect(consume.params).toContain(
            hashEnrolmentCode('abcd-ef01-2345-6789'),
         );
         // A page reload can restart setup without a second code.
         expect(
            jwt.decode(getCookie(res, 'second_factor')).enrolmentVerified,
         ).toBe(true);
         audited('enrolment_code_used');
      });

      it('refuses to confirm setup without the enrolment proof', async () => {
         mockQueryQueue.push([
            {
               ...unenrolledStaff,
               totpSecretEncrypted: encryptSecret(testSecret),
            },
         ]);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup/confirm',
            {
               code: new TOTP({
                  secret: Secret.fromBase32(testSecret),
               }).generate(),
            },
            passwordOnlySetup(),
         );

         expect(res.status).toBe(401);
         expect(await readJson(res)).toEqual({ message: enrolmentMessage });
         expect(getCookie(res, 'token')).toBeNull();
         expect(mockMutationLog).toEqual([]);
      });

      it('still needs a valid first authenticator code to confirm', async () => {
         mockQueryQueue.push(
            [
               {
                  ...unenrolledStaff,
                  totpSecretEncrypted: encryptSecret(testSecret),
               },
            ],
            [{ attempts: 1 }],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup/confirm',
            { code: 'abcdef' },
            passwordOnlySetup({ enrolmentVerified: true }),
         );

         expect(res.status).toBe(401);
         expect(getCookie(res, 'token')).toBeNull();
      });
   });

   describe('POST /staff/admin/users/:id/enrolment-code', () => {
      const issue = (id, headers) =>
         postJson(
            ctx.baseUrl,
            `/staff/admin/users/${id}/enrolment-code`,
            {},
            headers,
         );

      it.each([
         ['staff', unenrolledStaff],
         ['patient', patient],
      ])('rejects a %s caller with 403', async (_label, user) => {
         mockQueryQueue.push([user]);
         const res = await issue(7, sessionFor(user.id));
         expect(res.status).toBe(403);
         expect(mockMutationLog).toEqual([]);
      });

      it('returns 404 for a non-staff target', async () => {
         mockQueryQueue.push([admin], []);
         const res = await issue(31, sessionFor(admin.id));
         expect(res.status).toBe(404);
         expect(mockMutationLog).toEqual([]);
         expect(mockRecordAudit).not.toHaveBeenCalled();
      });

      it('replaces unused codes, stores only a keyed hash, returns the code once, and audits without it', async () => {
         mockQueryQueue.push([admin], [{ id: 7 }], [], []);

         const res = await issue(7, sessionFor(admin.id));

         expect(res.status).toBe(201);
         const body = await readJson(res);
         expect(body.enrolmentCode).toMatch(
            /^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/,
         );
         const hours = (new Date(body.expiresAt) - Date.now()) / 3_600_000;
         expect(hours).toBeGreaterThan(23.9);
         expect(hours).toBeLessThanOrEqual(24);
         // The earlier unused code is deleted before the new one is stored.
         const replace = new PgDialect().sqlToQuery(mockWhereLog[2]);
         expect(replace.sql).toMatch(/"used_at" is null/);
         const { values } = mockMutationLog.find((entry) => entry.values);
         expect(values).toEqual({
            userId: 7,
            codeHash: hashEnrolmentCode(body.enrolmentCode),
            expiresAt: expect.any(Date),
            issuedByUserId: admin.id,
         });
         audited('enrolment_code_issued', { changedBy: admin.id });
         expect(loggedCode()).toBe(false);
      });
   });

   it('the Second Factor reset also returns a fresh Enrolment Code', async () => {
      mockQueryQueue.push([admin], [{ id: 7 }], [], [], []);

      const res = await postJson(
         ctx.baseUrl,
         '/staff/admin/users/7/second-factor/reset',
         {},
         sessionFor(admin.id),
      );

      expect(res.status).toBe(200);
      const body = await readJson(res);
      expect(body).toMatchObject({
         id: 7,
         secondFactor: 'setup_required',
         enrolmentCode: expect.stringMatching(/^[a-f0-9-]{19}$/),
         expiresAt: expect.any(String),
      });
      expect(mockMutationLog).toContainEqual({
         values: expect.objectContaining({
            userId: 7,
            codeHash: hashEnrolmentCode(body.enrolmentCode),
         }),
      });
      expect(loggedCode()).toBe(false);
   });

   it('invite acceptance goes straight into setup without a code', async () => {
      mockQueryQueue.push(
         [
            {
               id: 4,
               email: 'invitee@example.test',
               role: 'staff',
               firstName: 'Ina',
               lastName: 'Vitee',
            },
         ],
         [],
         [
            {
               id: 40,
               email: 'invitee@example.test',
               role: 'staff',
               authVersion: 0,
            },
         ],
         [],
      );
      const accepted = await postJson(ctx.baseUrl, '/auth/accept-invite', {
         token: 'a'.repeat(64),
         password: 'long-enough-pw',
      });
      const cookie = `second_factor=${getCookie(accepted, 'second_factor')}`;

      resetMocks();
      mockQueryQueue.push([{ ...unenrolledStaff, id: 40 }], []);
      const res = await postJson(
         ctx.baseUrl,
         '/auth/second-factor/setup',
         {},
         { cookie },
      );

      expect(res.status).toBe(200);
      expect(mockRecordAudit).not.toHaveBeenCalledWith(
         expect.objectContaining({ action: 'enrolment_code_failed' }),
      );
   });
});
