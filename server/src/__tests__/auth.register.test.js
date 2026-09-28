import {
   startServer,
   readJson,
   getCookie,
   resetMocks,
   mockSelectQueue,
   mockTxReturnQueue,
   postJson,
} from './helpers.js';

const validBody = {
   email: 'new@example.com',
   password: 'secret123',
   first_name: 'New',
   last_name: 'Patient',
   date_of_birth: '1990-01-01',
   gender: 'female',
   contact_phone: '555-0100',
   address: '123 Main St',
};

const createdUser = {
   id: 1,
   email: 'new@example.com',
   role: 'patient',
   patientId: 101,
   providerId: null,
   displayName: 'New Patient',
};

describe('POST /auth/register', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   it('returns 400 when email is missing', async () => {
      const { email, ...withoutEmail } = validBody;

      const res = await postJson(ctx.baseUrl, '/auth/register', withoutEmail);

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Missing required fields.',
      });
   });

   it('returns 400 when password is missing', async () => {
      const { password, ...withoutPassword } = validBody;

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register',
         withoutPassword,
      );

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Missing required fields.',
      });
   });

   it('returns 400 when first_name is missing', async () => {
      const { first_name, ...withoutFirstName } = validBody;

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register',
         withoutFirstName,
      );

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Missing required fields.',
      });
   });

   it('returns 400 when last_name is missing', async () => {
      const { last_name, ...withoutLastName } = validBody;

      const res = await postJson(
         ctx.baseUrl,
         '/auth/register',
         withoutLastName,
      );

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Missing required fields.',
      });
   });

   it('returns 400 when date_of_birth is missing', async () => {
      const { date_of_birth, ...withoutDob } = validBody;

      const res = await postJson(ctx.baseUrl, '/auth/register', withoutDob);

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Missing required fields.',
      });
   });

   it('returns 400 when the body is empty', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/register`, {
         method: 'POST',
      });

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Missing required fields.',
      });
   });

   it('returns 409 when the email is already registered', async () => {
      mockSelectQueue.push([{ id: 9, email: 'new@example.com' }]);

      const res = await postJson(ctx.baseUrl, '/auth/register', validBody);

      expect(res.status).toBe(409);
      expect(await readJson(res)).toEqual({
         message: 'Email is already registered.',
      });
   });

   it('returns 201 with the created user and patient and sets a token cookie', async () => {
      mockSelectQueue.push([]);
      mockTxReturnQueue.push([{ id: 101 }], [createdUser]);

      const res = await postJson(ctx.baseUrl, '/auth/register', validBody);

      expect(res.status).toBe(201);
      const body = await readJson(res);
      expect(body.message).toBe('User and patient registered successfully.');
      expect(body.user).toEqual(createdUser);
      expect(body.patient).toEqual({ id: 101 });
      expect(getCookie(res, 'token')).toBeTruthy();
   });
});
