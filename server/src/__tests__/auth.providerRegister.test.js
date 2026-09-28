import jwt from 'jsonwebtoken';
import {
   startServer,
   readJson,
   getCookie,
   resetMocks,
   mockSelectQueue,
   mockTxReturnQueue,
   postJson,
} from './helpers.js';

const secret = process.env.JWT_SECRET;

const staffAdmin = {
   id: 5,
   email: 'admin@example.com',
   role: 'staff_admin',
   patientId: null,
   providerId: null,
   displayName: 'Admin User',
};

const patientUser = {
   id: 6,
   email: 'pat@example.com',
   role: 'patient',
   patientId: 10,
   providerId: null,
   displayName: 'Pat Patient',
};

const staffUser = {
   id: 7,
   email: 'doc@example.com',
   role: 'staff',
   patientId: null,
   providerId: 3,
   displayName: 'Doc Tor',
};

const validBody = {
   email: 'doc@example.com',
   password: 'secret123',
   first_name: 'Doc',
   last_name: 'Tor',
   specialty: 'Cardiology',
   npi_number: '1234567890',
};

const createdUser = {
   id: 2,
   email: 'doc@example.com',
   role: 'staff',
   patientId: null,
   providerId: 201,
   displayName: 'Doc Tor',
};

const authHeader = (token) => ({ cookie: `token=${token}` });

describe('POST /auth/register/provider', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   it('returns 401 when no token cookie is present', async () => {
      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         validBody,
      );

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({
         message: 'Not authorized: no token.',
      });
   });

   it('returns 401 when the token is malformed', async () => {
      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         validBody,
         authHeader('not-a-real-token'),
      );

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({
         message: 'Not authorized: token failed.',
      });
   });

   it('returns 401 when the token is expired', async () => {
      const expiredToken = jwt.sign(
         { id: 5, exp: Math.floor(Date.now() / 1000) - 60 },
         secret,
      );

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         validBody,
         authHeader(expiredToken),
      );

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({
         message: 'Not authorized: token failed.',
      });
   });

   it('returns 401 when the user no longer exists', async () => {
      const token = jwt.sign({ id: 42 }, secret, { expiresIn: '30d' });
      mockSelectQueue.push([]);

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         validBody,
         authHeader(token),
      );

      expect(res.status).toBe(401);
      expect(await readJson(res)).toEqual({
         message: 'Not authorized: user not found.',
      });
   });

   it('returns 403 when the user is a patient', async () => {
      const token = jwt.sign({ id: 6 }, secret, { expiresIn: '30d' });
      mockSelectQueue.push([patientUser]);

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         validBody,
         authHeader(token),
      );

      expect(res.status).toBe(403);
      expect(await readJson(res)).toEqual({
         message: 'Staff administrator access required.',
      });
   });

   it('returns 403 when the user is staff but not staff_admin', async () => {
      const token = jwt.sign({ id: 7 }, secret, { expiresIn: '30d' });
      mockSelectQueue.push([staffUser]);

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         validBody,
         authHeader(token),
      );

      expect(res.status).toBe(403);
      expect(await readJson(res)).toEqual({
         message: 'Staff administrator access required.',
      });
   });

   it('returns 400 when required fields are missing', async () => {
      const token = jwt.sign({ id: 5 }, secret, { expiresIn: '30d' });
      mockSelectQueue.push([staffAdmin]);
      const { first_name, ...withoutFirstName } = validBody;

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         withoutFirstName,
         authHeader(token),
      );

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Missing required fields.',
      });
   });

   it('returns 409 when the email is already registered', async () => {
      const token = jwt.sign({ id: 5 }, secret, { expiresIn: '30d' });
      mockSelectQueue.push([staffAdmin], [{ id: 9, email: 'doc@example.com' }]);

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         validBody,
         authHeader(token),
      );

      expect(res.status).toBe(409);
      expect(await readJson(res)).toEqual({
         message: 'Email is already registered.',
      });
   });

   it('returns 201 with the created user and provider and sets a token cookie', async () => {
      const token = jwt.sign({ id: 5 }, secret, { expiresIn: '30d' });
      mockSelectQueue.push([staffAdmin], []);
      mockTxReturnQueue.push([{ id: 201 }], [createdUser]);

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register/provider',
         validBody,
         authHeader(token),
      );

      expect(res.status).toBe(201);
      const body = await readJson(res);
      expect(body.message).toBe('User and provider registered successfully.');
      expect(body.user).toEqual(createdUser);
      expect(body.provider).toEqual({ id: 201 });
      expect(getCookie(res, 'token')).toBeTruthy();
   });
});
