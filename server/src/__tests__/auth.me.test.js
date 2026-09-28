import jwt from 'jsonwebtoken';
import {
   startServer,
   readJson,
   resetMocks,
   mockSelectQueue,
} from './helpers.js';

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
      mockSelectQueue.push([]);

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
      mockSelectQueue.push([staffUser]);

      const res = await fetch(`${ctx.baseUrl}/auth/me`, {
         headers: { cookie: `token=${token}` },
      });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ user: staffUser });
   });
});
