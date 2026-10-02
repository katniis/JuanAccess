import bcrypt from 'bcryptjs';
import {
   startServer,
   readJson,
   getCookie,
   resetMocks,
   mockQueryQueue,
   postJson,
} from './helpers.js';

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

   beforeEach(resetMocks);

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
      expect(getCookie(res, 'token')).toBeTruthy();
   });
});
