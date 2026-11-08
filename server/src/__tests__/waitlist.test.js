import jwt from 'jsonwebtoken';
import {
   startServer,
   readJson,
   resetMocks,
   mockQueryQueue,
   postJson,
} from './helpers.js';

const secret = process.env.JWT_SECRET;

const patientUser = {
   id: 1,
   email: 'pat@example.com',
   role: 'patient',
   patientId: 10,
   providerId: null,
   displayName: 'Pat Patient',
};

const staffUser = {
   id: 2,
   email: 'doc@example.com',
   role: 'staff',
   patientId: null,
   providerId: 3,
   displayName: 'Doc Tor',
};

const patientToken = jwt.sign({ id: 1 }, secret, { expiresIn: '30d' });
const staffToken = jwt.sign({ id: 2 }, secret, { expiresIn: '30d' });
const authHeader = (token) => ({ cookie: `token=${token}` });

const futureDate = (offsetDays = 2) => {
   const day = new Date();
   day.setDate(day.getDate() + offsetDays);
   return day.toISOString().slice(0, 10);
};

const validBody = {
   visit_type_id: 1,
   preferred_date_start: futureDate(2),
   preferred_date_end: futureDate(5),
};

const entry = {
   id: 1,
   patientId: 10,
   providerId: null,
   visitTypeId: 1,
   preferredDateStart: validBody.preferred_date_start,
   preferredDateEnd: validBody.preferred_date_end,
   preferredTimeStart: null,
   preferredTimeEnd: null,
   status: 'waiting',
};

const get = (baseUrl, path, token) =>
   fetch(`${baseUrl}${path}`, {
      headers: token ? authHeader(token) : {},
   });

describe('waitlist routes', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   describe('POST /waitlist', () => {
      it('returns 401 without a token', async () => {
         const res = await postJson(ctx.baseUrl, '/waitlist', validBody);

         expect(res.status).toBe(401);
      });

      it('returns 403 when the user is not a patient', async () => {
         mockQueryQueue.push([staffUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist',
            validBody,
            authHeader(staffToken),
         );

         expect(res.status).toBe(403);
         expect(await readJson(res)).toEqual({
            error: 'Patient access required',
         });
      });

      it('returns 400 when the criteria are invalid', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist',
            { visit_type_id: 'abc' },
            authHeader(patientToken),
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'Invalid waitlist criteria',
         });
      });

      it('returns 400 when the preferred date is in the past', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist',
            {
               visit_type_id: 1,
               preferred_date_start: '2000-01-01',
               preferred_date_end: '2000-01-05',
            },
            authHeader(patientToken),
         );

         expect(res.status).toBe(400);
      });

      it('returns 400 when only one preferred time is provided', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist',
            {
               ...validBody,
               preferred_time_start: '09:00',
            },
            authHeader(patientToken),
         );

         expect(res.status).toBe(400);
      });

      it('returns 404 when the visit type does not exist', async () => {
         mockQueryQueue.push([patientUser], []);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist',
            validBody,
            authHeader(patientToken),
         );

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({
            error: 'Visit type not found',
         });
      });

      it('returns 404 when the provider does not exist', async () => {
         mockQueryQueue.push([patientUser], [{ id: 1 }], []);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist',
            { ...validBody, provider_id: 99 },
            authHeader(patientToken),
         );

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({
            error: 'Provider not found',
         });
      });

      it('returns 409 when matching active waitlist criteria already exist', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ id: 1 }],
            [{ id: 2, status: 'waiting' }],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist',
            validBody,
            authHeader(patientToken),
         );

         expect(res.status).toBe(409);
         expect(await readJson(res)).toEqual({
            error: 'An active waitlist entry already matches these criteria.',
         });
      });

      it('returns 201 with the created waitlist entry', async () => {
         mockQueryQueue.push([patientUser], [{ id: 1 }], [], [entry]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist',
            validBody,
            authHeader(patientToken),
         );

         expect(res.status).toBe(201);
         expect(await readJson(res)).toEqual({ waitlistEntry: entry });
      });
   });

   describe('GET /waitlist/mine', () => {
      it('returns 401 without a token', async () => {
         const res = await get(ctx.baseUrl, '/waitlist/mine');

         expect(res.status).toBe(401);
      });

      it('returns 403 when the user is not a patient', async () => {
         mockQueryQueue.push([staffUser]);

         const res = await get(ctx.baseUrl, '/waitlist/mine', staffToken);

         expect(res.status).toBe(403);
      });

      it('returns 200 with the waitlist entries', async () => {
         const entries = [{ id: 1, status: 'waiting' }];
         mockQueryQueue.push([patientUser], entries);

         const res = await get(ctx.baseUrl, '/waitlist/mine', patientToken);

         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual({ waitlistEntries: entries });
      });
   });

   describe('DELETE /waitlist/:id', () => {
      it('returns 401 without a token', async () => {
         const res = await fetch(`${ctx.baseUrl}/waitlist/1`, {
            method: 'DELETE',
         });

         expect(res.status).toBe(401);
      });

      it('returns 400 when the ID is invalid', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await fetch(`${ctx.baseUrl}/waitlist/abc`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'Invalid waitlist entry ID',
         });
      });

      it('returns 404 when the entry does not exist', async () => {
         mockQueryQueue.push([patientUser], []);

         const res = await fetch(`${ctx.baseUrl}/waitlist/1`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({
            error: 'Waitlist entry not found',
         });
      });

      it('returns 409 when the entry is already closed', async () => {
         mockQueryQueue.push([patientUser], [{ status: 'confirmed' }]);

         const res = await fetch(`${ctx.baseUrl}/waitlist/1`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(409);
         expect(await readJson(res)).toEqual({
            error: 'This waitlist entry is already closed',
         });
      });

      it('returns 204 when a waiting entry is cancelled', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ status: 'waiting' }],
            [{ id: 1 }],
         );

         const res = await fetch(`${ctx.baseUrl}/waitlist/1`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(204);
      });

      it('returns 204 when an offered entry is cancelled', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ status: 'offered' }],
            [{ id: 1, offerExpiresAt: new Date(Date.now() + 3600000) }],
            [],
            [{ id: 1 }],
         );

         const res = await fetch(`${ctx.baseUrl}/waitlist/1`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(204);
      });
   });

   describe('POST /waitlist/:id/confirm', () => {
      it('returns 401 without a token', async () => {
         const res = await postJson(ctx.baseUrl, '/waitlist/1/confirm', {});

         expect(res.status).toBe(401);
      });

      it('returns 403 when the user is not a patient', async () => {
         mockQueryQueue.push([staffUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/1/confirm',
            {},
            authHeader(staffToken),
         );

         expect(res.status).toBe(403);
      });

      it('returns 400 when the ID is invalid', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/abc/confirm',
            {},
            authHeader(patientToken),
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'Invalid waitlist entry ID',
         });
      });

      it('returns 404 when the offer does not exist', async () => {
         mockQueryQueue.push([patientUser], []);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/1/confirm',
            {},
            authHeader(patientToken),
         );

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({
            error: 'Waitlist offer not found',
         });
      });

      it('returns 409 when the offer has expired', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ id: 1, offerExpiresAt: new Date(Date.now() - 60000) }],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/1/confirm',
            {},
            authHeader(patientToken),
         );

         expect(res.status).toBe(409);
         expect(await readJson(res)).toEqual({
            error: 'Waitlist offer expired',
         });
      });

      it('returns 409 when the reserved appointment is gone', async () => {
         mockQueryQueue.push(
            [patientUser],
            [
               {
                  id: 1,
                  offeredAppointmentId: 55,
                  offerExpiresAt: new Date(Date.now() + 3600000),
               },
            ],
            [{ status: 'cancelled' }],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/1/confirm',
            {},
            authHeader(patientToken),
         );

         expect(res.status).toBe(409);
         expect(await readJson(res)).toEqual({
            error: 'Reserved appointment is no longer available',
         });
      });

      it('returns 200 when the offer is confirmed', async () => {
         mockQueryQueue.push(
            [patientUser],
            [
               {
                  id: 1,
                  offeredAppointmentId: 55,
                  offerExpiresAt: new Date(Date.now() + 3600000),
               },
            ],
            [{ status: 'scheduled' }],
            [{ id: 1 }],
            [{ id: 1 }],
            [{ id: 7 }],
            [{}],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/1/confirm',
            {},
            authHeader(patientToken),
         );

         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual({ status: 'confirmed' });
      });
   });

   describe('POST /waitlist/:id/decline', () => {
      it('returns 401 without a token', async () => {
         const res = await postJson(ctx.baseUrl, '/waitlist/1/decline', {});

         expect(res.status).toBe(401);
      });

      it('returns 403 when the user is not a patient', async () => {
         mockQueryQueue.push([staffUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/1/decline',
            {},
            authHeader(staffToken),
         );

         expect(res.status).toBe(403);
      });

      it('returns 400 when the ID is invalid', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/0/decline',
            {},
            authHeader(patientToken),
         );

         expect(res.status).toBe(400);
      });

      it('returns 404 when the offer does not exist', async () => {
         mockQueryQueue.push([patientUser], []);

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/1/decline',
            {},
            authHeader(patientToken),
         );

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({
            error: 'Waitlist offer not found',
         });
      });

      it('returns 200 with the declined outcome', async () => {
         mockQueryQueue.push(
            [patientUser],
            [
               {
                  id: 1,
                  offeredAppointmentId: null,
                  offerExpiresAt: new Date(Date.now() + 3600000),
               },
            ],
            [{ id: 1 }],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/waitlist/1/decline',
            {},
            authHeader(patientToken),
         );

         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual({ status: 'cancelled' });
      });
   });
});
