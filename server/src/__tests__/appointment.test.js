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

const visitType = {
   id: 1,
   name: 'General Checkup',
   durationMinutes: 30,
   requiredSpecialty: null,
   requiredEquipmentId: null,
};

const futureDay = () => {
   const day = new Date();
   day.setDate(day.getDate() + 2);
   day.setHours(0, 0, 0, 0);
   return day;
};

const get = (baseUrl, path, token) =>
   fetch(`${baseUrl}${path}`, {
      headers: token ? authHeader(token) : {},
   });

describe('appointment routes', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   describe('GET /appointment/visit-type', () => {
      it('returns 401 without a token', async () => {
         const res = await get(ctx.baseUrl, '/appointment/visit-type');

         expect(res.status).toBe(401);
      });

      it('returns 200 with the list of visit types', async () => {
         mockQueryQueue.push([patientUser], [visitType]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/visit-type',
            patientToken,
         );

         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual({ visitTypes: [visitType] });
      });
   });

   describe('GET /appointment/visit-type/:id', () => {
      it('returns 401 without a token', async () => {
         const res = await get(ctx.baseUrl, '/appointment/visit-type/1');

         expect(res.status).toBe(401);
      });

      it('returns 400 when the ID is not a positive integer', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/visit-type/abc',
            patientToken,
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            message: 'Visit type ID must be a positive integer.',
         });
      });

      it('returns 400 when the ID is zero', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/visit-type/0',
            patientToken,
         );

         expect(res.status).toBe(400);
      });

      it('returns 404 when the visit type does not exist', async () => {
         mockQueryQueue.push([patientUser], []);

         const res = await get(
            ctx.baseUrl,
            '/appointment/visit-type/999',
            patientToken,
         );

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({
            message: 'Visit type not found.',
         });
      });

      it('returns 200 with the visit type', async () => {
         mockQueryQueue.push([patientUser], [visitType]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/visit-type/1',
            patientToken,
         );

         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual({ visitType });
      });
   });

   describe('GET /appointment/available-slots', () => {
      it('returns 401 without a token', async () => {
         const res = await get(ctx.baseUrl, '/appointment/available-slots');

         expect(res.status).toBe(401);
      });

      it('returns 400 when required query parameters are missing', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/available-slots?visit_type_id=1',
            patientToken,
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'visit_type_id, range_start, and range_end are required',
         });
      });

      it('returns 400 when the visit type or date range is invalid', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/available-slots?visit_type_id=abc&range_start=not-a-date&range_end=also-bad',
            patientToken,
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'Invalid visit type or date range',
         });
      });

      it('returns 400 when start is after end', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/available-slots?visit_type_id=1&range_start=2026-08-02&range_end=2026-08-01',
            patientToken,
         );

         expect(res.status).toBe(400);
      });

      it('returns 400 when time preferences are invalid', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/available-slots?visit_type_id=1&range_start=2026-08-01&range_end=2026-08-02&time_start=25:00&time_end=26:00',
            patientToken,
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'Invalid time preference',
         });
      });

      it('returns 400 when only one of time_start/time_end is provided', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/available-slots?visit_type_id=1&range_start=2026-08-01&range_end=2026-08-02&time_start=09:00',
            patientToken,
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'time_start and time_end must be provided together',
         });
      });

      it('returns 400 when time_start is not before time_end', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await get(
            ctx.baseUrl,
            '/appointment/available-slots?visit_type_id=1&range_start=2026-08-01&range_end=2026-08-02&time_start=12:00&time_end=09:00',
            patientToken,
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'time_start must be before time_end',
         });
      });

      it('returns 404 when the visit type does not exist', async () => {
         mockQueryQueue.push([patientUser], []);

         const res = await get(
            ctx.baseUrl,
            '/appointment/available-slots?visit_type_id=1&range_start=2026-08-01&range_end=2026-08-02',
            patientToken,
         );

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({ error: 'Visit type not found' });
      });

      it('returns 200 with available slots', async () => {
         const day = futureDay();
         const rangeStart = day.toISOString();
         const provider = {
            providerId: 7,
            firstName: 'Doc',
            lastName: 'Tor',
            dayOfWeek: day.getDay(),
            startTime: '09:00:00',
            endTime: '17:00:00',
         };
         mockQueryQueue.push(
            [patientUser],
            [visitType],
            [provider],
            [],
            [{ id: 5 }],
         );

         const params = new URLSearchParams({
            visit_type_id: '1',
            range_start: rangeStart,
            range_end: rangeStart,
         });
         const res = await get(
            ctx.baseUrl,
            `/appointment/available-slots?${params}`,
            patientToken,
         );

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.visit_type).toBe('General Checkup');
         expect(Array.isArray(body.slots)).toBe(true);
         expect(body.slots.length).toBeGreaterThan(0);
         expect(body.slots[0]).toHaveProperty('provider_id', 7);
      });
   });

   describe('POST /appointment', () => {
      it('returns 401 without a token', async () => {
         const res = await postJson(ctx.baseUrl, '/appointment', {});

         expect(res.status).toBe(401);
      });

      it('returns 403 when the user is not a patient', async () => {
         mockQueryQueue.push([staffUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/appointment',
            {},
            authHeader(staffToken),
         );

         expect(res.status).toBe(403);
         expect(await readJson(res)).toEqual({
            error: 'Only patient accounts can book appointments',
         });
      });

      it('returns 400 when the payload is invalid', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await postJson(
            ctx.baseUrl,
            '/appointment',
            { visit_type_id: 1, provider_id: 2, start: 'bad', end: 'worse' },
            authHeader(patientToken),
         );

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'Valid visit_type_id, provider_id, start, and end are required',
         });
      });

      it('returns 404 when the visit type does not exist', async () => {
         const start = futureDay();
         start.setHours(10, 0, 0, 0);
         const end = new Date(start.getTime() + 30 * 60000);
         mockQueryQueue.push([patientUser], []);

         const res = await postJson(
            ctx.baseUrl,
            '/appointment',
            {
               visit_type_id: 1,
               provider_id: 11,
               start: start.toISOString(),
               end: end.toISOString(),
            },
            authHeader(patientToken),
         );

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({
            error: 'Visit type not found',
         });
      });

      it('returns 409 when the provider is unavailable', async () => {
         const start = futureDay();
         start.setHours(10, 0, 0, 0);
         const end = new Date(start.getTime() + 30 * 60000);
         mockQueryQueue.push([patientUser], [visitType], []);

         const res = await postJson(
            ctx.baseUrl,
            '/appointment',
            {
               visit_type_id: 1,
               provider_id: 11,
               start: start.toISOString(),
               end: end.toISOString(),
            },
            authHeader(patientToken),
         );

         expect(res.status).toBe(409);
         expect(await readJson(res)).toEqual({
            error: 'Provider is unavailable for this visit type or day',
         });
      });

      it('returns 201 and creates the appointment', async () => {
         const start = futureDay();
         start.setHours(10, 0, 0, 0);
         const end = new Date(start.getTime() + 30 * 60000);
         const created = {
            id: 99,
            patientId: 10,
            providerId: 11,
            roomId: 5,
            equipmentId: null,
            visitTypeId: 1,
            scheduledStart: start.toISOString(),
            scheduledEnd: end.toISOString(),
            status: 'scheduled',
            insuranceStatus: 'unverified',
         };
         mockQueryQueue.push(
            [patientUser],
            [visitType],
            [{ id: 11 }],
            [{ startTime: '09:00:00', endTime: '17:00:00' }],
            [{ id: 5 }],
            [],
            [],
            [],
            [created],
            [],
            [],
            [{ id: 101, status: 'not_required' }],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/appointment',
            {
               visit_type_id: 1,
               provider_id: 11,
               start: start.toISOString(),
               end: end.toISOString(),
            },
            authHeader(patientToken),
         );

         expect(res.status).toBe(201);
         expect(await readJson(res)).toEqual({
            ...created,
            priorAuthorizationStatus: 'not_required',
         });
      });
   });

   describe('GET /appointment/mine', () => {
      it('returns 401 without a token', async () => {
         const res = await get(ctx.baseUrl, '/appointment/mine');

         expect(res.status).toBe(401);
      });

      it('returns 403 when the user is not a patient', async () => {
         mockQueryQueue.push([staffUser]);

         const res = await get(ctx.baseUrl, '/appointment/mine', staffToken);

         expect(res.status).toBe(403);
      });

      it('returns 200 with the patient appointments', async () => {
         const rows = [{ id: 1, status: 'scheduled' }];
         mockQueryQueue.push([patientUser], rows);

         const res = await get(ctx.baseUrl, '/appointment/mine', patientToken);

         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual(rows);
      });
   });

   describe('DELETE /appointment/:id', () => {
      it('returns 401 without a token', async () => {
         const res = await fetch(`${ctx.baseUrl}/appointment/1`, {
            method: 'DELETE',
         });

         expect(res.status).toBe(401);
      });

      it('returns 400 when the ID is invalid', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await fetch(`${ctx.baseUrl}/appointment/abc`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'Invalid appointment ID',
         });
      });

      it('returns 404 when the appointment cannot be found', async () => {
         mockQueryQueue.push([patientUser], []);

         const res = await fetch(`${ctx.baseUrl}/appointment/1`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(404);
         expect(await readJson(res)).toEqual({
            error: 'Appointment not found or cannot be cancelled',
         });
      });

      it('returns 404 when the booking is not in a cancellable state', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ id: 1, status: 'completed' }],
            [],
         );

         const res = await fetch(`${ctx.baseUrl}/appointment/1`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(404);
      });

      it('returns 204 when the appointment is cancelled', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ id: 1, status: 'scheduled', providerId: 11 }],
            [{ id: 1 }],
            [],
            [null],
         );

         const res = await fetch(`${ctx.baseUrl}/appointment/1`, {
            method: 'DELETE',
            headers: authHeader(patientToken),
         });

         expect(res.status).toBe(204);
      });
   });
});
