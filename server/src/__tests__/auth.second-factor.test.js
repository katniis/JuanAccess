import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TOTP, Secret } from 'otpauth';
import { jest } from '@jest/globals';

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
   postJson,
} = await import('./helpers.js');
const { encryptSecret } = await import('../services/second-factor.service.js');

const testSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const codeFor = (secret, timestamp = Date.now()) =>
   new TOTP({ secret: Secret.fromBase32(secret) }).generate({ timestamp });

const staffRow = {
   id: 7,
   email: 'staff@example.com',
   passwordHash: bcrypt.hashSync('correct-horse', 10),
   role: 'staff',
   patientId: null,
   providerId: null,
   displayName: 'Sam Staff',
   authVersion: 0,
   failedLoginAttempts: 0,
   lockedUntil: null,
   totpSecretEncrypted: encryptSecret(testSecret),
   totpEnabledAt: new Date('2026-01-01T00:00:00Z'),
};
const unenrolledStaff = {
   ...staffRow,
   totpSecretEncrypted: null,
   totpEnabledAt: null,
};

const pendingCookie = (purpose, overrides = {}) =>
   `second_factor=${jwt.sign(
      { id: 7, authVersion: 0, purpose, ...overrides },
      process.env.JWT_SECRET,
      { expiresIn: '10m' },
   )}`;

const audited = (action) =>
   expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 7, action }),
   );

describe('Staff Second Factor', () => {
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

   describe('POST /auth/login for staff', () => {
      it('returns a pending Second Factor step instead of a session', async () => {
         mockQueryQueue.push([staffRow]);

         const res = await postJson(ctx.baseUrl, '/auth/login', {
            email: 'staff@example.com',
            password: 'correct-horse',
         });

         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual({ secondFactor: 'required' });
         expect(getCookie(res, 'token')).toBeNull();
         expect(jwt.decode(getCookie(res, 'second_factor')).purpose).toBe(
            'second_factor',
         );
         expect(mockMutationLog).toEqual([]);
      });

      it('sends staff without a Second Factor to setup', async () => {
         mockQueryQueue.push([unenrolledStaff]);

         const res = await postJson(ctx.baseUrl, '/auth/login', {
            email: 'staff@example.com',
            password: 'correct-horse',
         });

         expect(await readJson(res)).toEqual({
            secondFactor: 'setup_required',
         });
         expect(getCookie(res, 'token')).toBeNull();
         expect(jwt.decode(getCookie(res, 'second_factor')).purpose).toBe(
            'second_factor_setup',
         );
      });

      it('does not clear earlier failures until the Second Factor passes', async () => {
         mockQueryQueue.push([{ ...staffRow, failedLoginAttempts: 3 }]);

         await postJson(ctx.baseUrl, '/auth/login', {
            email: 'staff@example.com',
            password: 'correct-horse',
         });

         expect(mockMutationLog).toEqual([]);
      });
   });

   it('rejects a pending token used as a session on staff routes', async () => {
      mockQueryQueue.push([staffRow]);

      const res = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: {
            cookie: pendingCookie('second_factor').replace(
               'second_factor=',
               'token=',
            ),
         },
      });

      expect(res.status).toBe(401);
   });

   describe('POST /auth/second-factor/verify', () => {
      it('completes login with a valid code: 12-hour session, notification, audit', async () => {
         mockQueryQueue.push([staffRow], [{ id: 99 }]);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { code: codeFor(testSecret) },
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(200);
         expect((await readJson(res)).user).toEqual(
            expect.objectContaining({ id: 7, role: 'staff' }),
         );
         const { iat, exp, purpose } = jwt.decode(getCookie(res, 'token'));
         expect(purpose).toBeUndefined();
         expect(exp - iat).toBe(12 * 60 * 60);
         expect(res.headers.get('set-cookie')).toMatch(/max-age=43200/i);
         expect(mockMutationLog).toContainEqual({
            values: expect.objectContaining({ userId: 7, type: 'new_login' }),
         });
         audited('login_success');
      });

      it('rejects a wrong code and counts it toward lockout', async () => {
         mockQueryQueue.push([{ ...staffRow, failedLoginAttempts: 1 }], []);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { code: '000000' === codeFor(testSecret) ? '111111' : '000000' },
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(401);
         expect(getCookie(res, 'token')).toBeNull();
         expect(mockMutationLog).toContainEqual({
            set: { failedLoginAttempts: 2, lockedUntil: null },
         });
         audited('second_factor_failed');
      });

      it('rejects an expired code', async () => {
         mockQueryQueue.push([staffRow], []);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { code: codeFor(testSecret, Date.now() - 10 * 60 * 1000) },
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(401);
      });

      it('locks the account on the fifth wrong code', async () => {
         mockQueryQueue.push([{ ...staffRow, failedLoginAttempts: 4 }], []);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { code: 'abcdef' },
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(401);
         const { set } = mockMutationLog.find((entry) => entry.set);
         expect(set.lockedUntil.getTime()).toBeGreaterThan(Date.now());
         audited('login_lockout');
      });

      it('refuses even a valid code while the account is locked', async () => {
         mockQueryQueue.push([
            { ...staffRow, lockedUntil: new Date(Date.now() + 60_000) },
         ]);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { code: codeFor(testSecret) },
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(423);
         expect(getCookie(res, 'token')).toBeNull();
      });

      it('accepts an unused Recovery Code once', async () => {
         mockQueryQueue.push([staffRow], [{ id: 3 }], [{ id: 99 }]);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { recoveryCode: 'abcd-ef01-2345' },
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(200);
         expect(getCookie(res, 'token')).toBeTruthy();
         expect(mockMutationLog).toContainEqual({
            set: { usedAt: expect.any(Date) },
         });
         audited('login_success');
      });

      it('rejects a Recovery Code that was already used', async () => {
         mockQueryQueue.push([staffRow], [], []);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { recoveryCode: 'abcd-ef01-2345' },
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(401);
         expect(getCookie(res, 'token')).toBeNull();
         audited('second_factor_failed');
      });

      it('requires a pending token from the password step', async () => {
         const res = await postJson(ctx.baseUrl, '/auth/second-factor/verify', {
            code: codeFor(testSecret),
         });

         expect(res.status).toBe(401);
      });

      it('rejects a setup token', async () => {
         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { code: codeFor(testSecret) },
            { cookie: pendingCookie('second_factor_setup') },
         );

         expect(res.status).toBe(401);
      });

      it('rejects a pending token from before an auth version bump', async () => {
         mockQueryQueue.push([{ ...staffRow, authVersion: 1 }]);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/verify',
            { code: codeFor(testSecret) },
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(401);
      });
   });

   describe('Second Factor setup', () => {
      it('returns a QR code and otpauth URI, storing the secret encrypted', async () => {
         mockQueryQueue.push([unenrolledStaff], []);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup',
            {},
            { cookie: pendingCookie('second_factor_setup') },
         );

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.otpauthUrl).toMatch(/^otpauth:\/\/totp\/JuanAccess:/);
         expect(body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
         const secret = new URL(body.otpauthUrl).searchParams.get('secret');
         const { set } = mockMutationLog.find((entry) => entry.set);
         expect(set.totpEnabledAt).toBeNull();
         expect(set.totpSecretEncrypted).toBeTruthy();
         expect(set.totpSecretEncrypted).not.toContain(secret);
         expect(getCookie(res, 'token')).toBeNull();
      });

      it('refuses setup for staff who already have a Second Factor', async () => {
         mockQueryQueue.push([staffRow]);

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup',
            {},
            { cookie: pendingCookie('second_factor_setup') },
         );

         expect(res.status).toBe(409);
      });

      it('refuses setup with a sign-in token', async () => {
         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup',
            {},
            { cookie: pendingCookie('second_factor') },
         );

         expect(res.status).toBe(401);
      });

      it('does not activate on a wrong first code', async () => {
         mockQueryQueue.push(
            [
               {
                  ...unenrolledStaff,
                  totpSecretEncrypted: encryptSecret(testSecret),
               },
            ],
            [],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup/confirm',
            { code: 'abcdef' },
            { cookie: pendingCookie('second_factor_setup') },
         );

         expect(res.status).toBe(401);
         expect(getCookie(res, 'token')).toBeNull();
         expect(mockMutationLog).toContainEqual({
            set: { failedLoginAttempts: 1, lockedUntil: null },
         });
         audited('second_factor_failed');
      });

      it('activates on a valid first code and returns Recovery Codes once, stored hashed', async () => {
         mockQueryQueue.push(
            [
               {
                  ...unenrolledStaff,
                  totpSecretEncrypted: encryptSecret(testSecret),
               },
            ],
            [{ id: 7 }],
            [],
            [],
            [{ id: 99 }],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/auth/second-factor/setup/confirm',
            { code: codeFor(testSecret) },
            { cookie: pendingCookie('second_factor_setup') },
         );

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.recoveryCodes).toHaveLength(10);
         expect(new Set(body.recoveryCodes).size).toBe(10);
         const { values: stored } = mockMutationLog.find((entry) =>
            Array.isArray(entry.values),
         );
         expect(stored).toHaveLength(10);
         for (const row of stored) {
            expect(row.userId).toBe(7);
            expect(body.recoveryCodes).not.toContain(row.codeHash);
            expect(row.codeHash).toMatch(/^[a-f0-9]{64}$/);
         }
         expect(mockMutationLog).toContainEqual({
            set: expect.objectContaining({ totpEnabledAt: expect.any(Date) }),
         });
         const { exp, iat } = jwt.decode(getCookie(res, 'token'));
         expect(exp - iat).toBe(12 * 60 * 60);
         audited('second_factor_enrolled');
         audited('login_success');
      });
   });
});
