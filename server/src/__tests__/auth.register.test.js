import {
   startServer,
   readJson,
   getCookie,
   resetMocks,
   mockQueryQueue,
   postJson,
   mockMutationLog,
} from './helpers.js';
import { PRIVACY_POLICY_VERSION } from '../utils/privacyPolicy.js';

const validBody = {
   email: 'new@example.com',
   password: 'secret123',
   first_name: 'New',
   last_name: 'Patient',
   date_of_birth: '1990-01-01',
   gender: 'female',
   contact_phone: '555-0100',
   address: '123 Main St',
   privacy_consent: true,
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

   it.each(['not-a-date', '2020-02-31'])(
      'returns 400 for invalid date_of_birth %s',
      async (date_of_birth) => {
         const res = await postJson(ctx.baseUrl, '/auth/register', {
            ...validBody,
            date_of_birth,
         });

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            message: 'Invalid date of birth.',
         });
      },
   );

   it('returns 400 when the body is empty', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/register`, {
         method: 'POST',
      });

      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({
         message: 'Missing required fields.',
      });
   });

   it.each([undefined, false, 'yes'])(
      'returns 400 when privacy_consent is %p',
      async (privacy_consent) => {
         const res = await postJson(ctx.baseUrl, '/auth/register', {
            ...validBody,
            privacy_consent,
         });

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            message: 'You must accept the Privacy Policy to register.',
         });
      },
   );

   it('returns 409 when the email is already registered', async () => {
      mockQueryQueue.push([{ id: 9, email: 'new@example.com' }]);

      const res = await postJson(ctx.baseUrl, '/auth/register', validBody);

      expect(res.status).toBe(409);
      expect(await readJson(res)).toEqual({
         message: 'Email is already registered.',
      });
   });

   it('returns 201 with the created user and patient and sets a token cookie', async () => {
      mockQueryQueue.push([], [{ id: 101 }], [createdUser], []);

      const res = await postJson(ctx.baseUrl, '/auth/register', validBody);

      expect(res.status).toBe(201);
      const body = await readJson(res);
      expect(body.message).toBe('User and patient registered successfully.');
      expect(body.user).toEqual(createdUser);
      expect(body.patient).toEqual({ id: 101 });
      expect(getCookie(res, 'token')).toBeTruthy();
   });

   it('stores a Consent Record for the current policy version', async () => {
      mockQueryQueue.push([], [{ id: 101 }], [createdUser], []);

      const res = await postJson(ctx.baseUrl, '/auth/register', validBody);

      expect(res.status).toBe(201);
      expect(mockMutationLog).toContainEqual({
         values: { userId: 1, policyVersion: PRIVACY_POLICY_VERSION },
      });
   });
});
