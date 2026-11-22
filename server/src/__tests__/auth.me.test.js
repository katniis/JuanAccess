import jwt from 'jsonwebtoken';
import {
   startServer,
   readJson,
   resetMocks,
   mockQueryQueue,
   mockMutationLog,
   postJson,
} from './helpers.js';
import { PRIVACY_POLICY_VERSION } from '../utils/privacyPolicy.js';

const secret = process.env.JWT_SECRET;

const staffUser = {
   id: 7,
   email: 'doc@example.com',
   role: 'staff',
   patientId: null,
   providerId: 3,
   displayName: 'Doc Tor',
};

describe('GET /auth/me', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   it('returns 401 when no token cookie is present', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/me`);

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({
         message: 'Not authorized: no token.',
      });
   });

   it('returns 401 when the token is malformed', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: { cookie: 'token=not-a-real-token' },
      });

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({
         message: 'Not authorized: token failed.',
      });
   });

   it('returns 401 when the token id is not a number', async () => {
      const token = jwt.sign({ id: 'not-a-number' }, secret, {
         expiresIn: '30d',
      });

      const res = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: { cookie: `token=${token}` },
      });

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({
         message: 'Not authorized: invalid token.',
      });
   });

   it('returns 401 when the user no longer exists', async () => {
      const token = jwt.sign({ id: 42 }, secret, { expiresIn: '30d' });
      mockQueryQueue.push([]);

      const res = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: { cookie: `token=${token}` },
      });

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({
         message: 'Not authorized: user not found.',
      });
   });

   it('returns 200 with the current user', async () => {
      const token = jwt.sign({ id: 7 }, secret, { expiresIn: '30d' });
      mockQueryQueue.push([staffUser]);

      const res = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: { cookie: `token=${token}` },
      });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ user: staffUser });
   });
});

const patientUser = {
   id: 11,
   email: 'patient@example.com',
   role: 'patient',
   patientId: 101,
   providerId: null,
   displayName: 'Synthetic Patient',
};

describe('Privacy Policy consent', () => {
   let ctx;
   const cookie = () =>
      `token=${jwt.sign({ id: 11 }, secret, { expiresIn: '30d' })}`;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   it('GET /auth/me flags a patient with no Consent Record for the current version', async () => {
      mockQueryQueue.push([patientUser], []);

      const res = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: { cookie: cookie() },
      });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({
         user: patientUser,
         consent: { required: true, currentVersion: PRIVACY_POLICY_VERSION },
      });
   });

   it('GET /auth/me does not flag a patient who accepted the current version', async () => {
      mockQueryQueue.push([patientUser], [{ id: 5 }]);

      const res = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: { cookie: cookie() },
      });

      expect(await readJson(res)).toEqual({
         user: patientUser,
         consent: { required: false, currentVersion: PRIVACY_POLICY_VERSION },
      });
   });

   it('POST /auth/consent records a new Consent Record for the current version', async () => {
      mockQueryQueue.push([patientUser], []);

      const res = await postJson(
         ctx.baseUrl,
         '/auth/consent',
         {},
         { cookie: cookie() },
      );

      expect(res.status).toBe(201);
      expect(await readJson(res)).toEqual({
         consent: { required: false, currentVersion: PRIVACY_POLICY_VERSION },
      });
      expect(mockMutationLog).toContainEqual({
         values: { userId: 11, policyVersion: PRIVACY_POLICY_VERSION },
      });
   });

   it('POST /auth/consent is only for patients', async () => {
      mockQueryQueue.push([staffUser]);

      const res = await postJson(
         ctx.baseUrl,
         '/auth/consent',
         {},
         {
            cookie: `token=${jwt.sign({ id: 7 }, secret, { expiresIn: '30d' })}`,
         },
      );

      expect(res.status).toBe(403);
   });
});
