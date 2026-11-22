import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { SQL } from 'drizzle-orm';

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

const passwordHash = bcrypt.hashSync('correct-horse', 10);

const userRow = {
   id: 1,
   email: 'patient@example.com',
   passwordHash,
   role: 'patient',
   patientId: 10,
   providerId: null,
   displayName: 'Pat Patient',
};

describe('POST /auth/login', () => {
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

   it('returns 400 when email is missing', async () => {
      const res = await postJson(ctx.baseUrl, '/auth/login', {
         password: 'correct-horse',
      });

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Email and password are required.',
      });
   });

   it('returns 400 when password is missing', async () => {
      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
      });

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Email and password are required.',
      });
   });

   it('returns 400 when the body is empty', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/login`, { method: 'POST' });

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Email and password are required.',
      });
   });

   it('returns 401 when the user does not exist', async () => {
      mockQueryQueue.push([]);

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'nobody@example.com',
         password: 'correct-horse',
      });

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({ message: 'Invalid credentials.' });
   });

   it('returns 401 when the password is wrong', async () => {
      mockQueryQueue.push([userRow]);

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
         password: 'wrong-password',
      });

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({ message: 'Invalid credentials.' });
   });

   it('returns 200 with the safe user and sets a token cookie', async () => {
      mockQueryQueue.push([userRow]);

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
         password: 'correct-horse',
      });

      expect(res.status).toBe(200);
      const body = await readJson(res);
      expect(body.user).toEqual({
         id: 1,
         email: 'patient@example.com',
         role: 'patient',
         patientId: 10,
         providerId: null,
         displayName: 'Pat Patient',
      });
      expect(body.user).not.toHaveProperty('passwordHash');
      const token = getCookie(res, 'token');
      expect(token).toBeTruthy();
      expect(res.headers.get('set-cookie')).not.toMatch(/max-age=/i);
      expect(jwt.decode(token).rememberMe).toBe(false);
   });

   it('persists the cookie for 30 days when Remember Me is selected', async () => {
      mockQueryQueue.push([userRow]);

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
         password: 'correct-horse',
         rememberMe: true,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toMatch(/max-age=2592000/i);
      expect(jwt.decode(getCookie(res, 'token')).rememberMe).toBe(true);
   });

   it('locks the account when the atomic counter reaches the fifth failed attempt', async () => {
      // The row read says 0; the database's incremented value decides.
      mockQueryQueue.push(
         [{ ...userRow, failedLoginAttempts: 0 }],
         [{ attempts: 5 }],
         [],
      );

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
         password: 'wrong-password',
      });

      expect(res.status).toBe(401);
      const [increment, lock] = mockMutationLog.filter((entry) => entry.set);
      expect(increment.set.failedLoginAttempts).toBeInstanceOf(SQL);
      expect(lock.set.failedLoginAttempts).toBe(0);
      expect(lock.set.lockedUntil.getTime()).toBeGreaterThan(Date.now());
      expect(mockRecordAudit).toHaveBeenCalledWith(
         expect.objectContaining({ entityId: 1, action: 'login_lockout' }),
      );
   });

   it('counts a failed attempt below the threshold without locking', async () => {
      mockQueryQueue.push(
         [{ ...userRow, failedLoginAttempts: 0 }],
         [{ attempts: 2 }],
      );

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
         password: 'wrong-password',
      });

      expect(res.status).toBe(401);
      const sets = mockMutationLog.filter((entry) => entry.set);
      expect(sets).toHaveLength(1);
      expect(sets[0].set.failedLoginAttempts).toBeInstanceOf(SQL);
      expect(mockRecordAudit).toHaveBeenCalledWith(
         expect.objectContaining({
            entityId: 1,
            action: 'login_failed',
            newValue: expect.objectContaining({ attempts: 2 }),
         }),
      );
   });

   it('refuses correct credentials while the account is locked', async () => {
      mockQueryQueue.push([
         { ...userRow, lockedUntil: new Date(Date.now() + 60_000) },
      ]);

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
         password: 'correct-horse',
      });

      expect(res.status).toBe(423);
      expect(getCookie(res, 'token')).toBeNull();
      expect(mockRecordAudit).toHaveBeenCalledWith(
         expect.objectContaining({ entityId: 1, action: 'login_locked' }),
      );
   });

   it('allows login once the lock has expired and clears it', async () => {
      mockQueryQueue.push(
         [{ ...userRow, lockedUntil: new Date(Date.now() - 60_000) }],
         [],
      );

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
         password: 'correct-horse',
      });

      expect(res.status).toBe(200);
      expect(mockMutationLog).toContainEqual({
         set: { failedLoginAttempts: 0, lockedUntil: null },
      });
   });

   it('gives a patient a 30-day token and audits the login without notifying', async () => {
      mockQueryQueue.push([userRow]);

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'patient@example.com',
         password: 'correct-horse',
      });

      expect(res.status).toBe(200);
      const { iat, exp } = jwt.decode(getCookie(res, 'token'));
      expect(exp - iat).toBe(30 * 24 * 60 * 60);
      expect(mockMutationLog).toEqual([]);
      expect(mockRecordAudit).toHaveBeenCalledWith(
         expect.objectContaining({ entityId: 1, action: 'login_success' }),
      );
   });

   // The staff 12-hour session and new-login notification are issued after the
   // Second Factor; see auth.second-factor.test.js.
   it('gives staff no session from the password alone', async () => {
      mockQueryQueue.push([
         {
            ...userRow,
            id: 7,
            email: 'staff@example.com',
            role: 'staff',
            patientId: null,
         },
      ]);

      const res = await postJson(ctx.baseUrl, '/auth/login', {
         email: 'staff@example.com',
         password: 'correct-horse',
      });

      expect(res.status).toBe(200);
      expect(getCookie(res, 'token')).toBeNull();
      expect(mockRecordAudit).not.toHaveBeenCalledWith(
         expect.objectContaining({ action: 'login_success' }),
      );
   });
});
