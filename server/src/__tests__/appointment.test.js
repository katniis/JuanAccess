import jwt from 'jsonwebtoken';
import {
   startServer,
   readJson,
   resetMocks,
   mockQueryQueue,
   mockMutationLog,
   mockWhereLog,
   postJson,
} from './helpers.js';
import { PgDialect } from 'drizzle-orm/pg-core';
import { manilaDateString, manilaDayOfWeek } from '../utils/timezone.js';

const secret = process.env.JWT_SECRET;

// True when some .where() filtered on providers.profession = 'physician'.
const filteredToPhysicians = () =>
   mockWhereLog.some((condition) => {
      if (!condition) return false;
      const { sql, params } = new PgDialect().sqlToQuery(condition);
      return (
         /"providers"\."profession" = \$\d+/.test(sql) &&
         params.includes('physician')
      );
   });

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

// Clinic times are Manila wall-clock times, whatever the test process's time zone.
const manilaDate = (offsetDays = 2) =>
   manilaDateString(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));
const manilaAt = (date, time) => new Date(`${date}T${time}+08:00`);

const validReason = { reason: 'schedule_conflict' };

const cancel = (baseUrl, id, body) =>
   fetch(`${baseUrl}/appointment/${id}`, {
      method: 'DELETE',
      headers: {
         'content-type': 'application/json',
         ...authHeader(patientToken),
      },
      body: JSON.stringify(body),
   });

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

      const slotDate = manilaDate();
      const weeklyPractitioner = {
         providerId: 7,
         firstName: 'Doc',
         lastName: 'Tor',
         consultationFee: '800.00',
         dayOfWeek: manilaDayOfWeek(manilaAt(slotDate, '12:00:00')),
         startTime: '09:00:00',
         endTime: '17:00:00',
      };
      const searchSlots = () =>
         get(
            ctx.baseUrl,
            `/appointment/available-slots?${new URLSearchParams({
               visit_type_id: '1',
               range_start: slotDate,
               range_end: slotDate,
            })}`,
            patientToken,
         );

      it('returns no slots on a Duty Schedule day off', async () => {
         mockQueryQueue.push(
            [patientUser],
            [visitType],
            [weeklyPractitioner],
            [],
            [{ id: 5 }],
            [
               {
                  providerId: 7,
                  overrideDate: slotDate,
                  isDayOff: true,
                  startTime: null,
                  endTime: null,
               },
            ],
         );

         const res = await searchSlots();

         expect(res.status).toBe(200);
         expect((await readJson(res)).slots).toEqual([]);
      });

      it('uses Duty Schedule custom hours instead of the weekly hours', async () => {
         mockQueryQueue.push(
            [patientUser],
            [visitType],
            [weeklyPractitioner],
            [],
            [{ id: 5 }],
            [
               {
                  providerId: 7,
                  overrideDate: slotDate,
                  isDayOff: false,
                  startTime: '13:00:00',
                  endTime: '14:00:00',
               },
            ],
         );

         const res = await searchSlots();

         expect(res.status).toBe(200);
         // 30-minute visits plus a 15-minute grace fit once in 13:00-14:00 Manila.
         expect(
            (await readJson(res)).slots.map((slot) => [slot.start, slot.end]),
         ).toEqual([
            [
               manilaAt(slotDate, '13:00:00').toISOString(),
               manilaAt(slotDate, '13:30:00').toISOString(),
            ],
         ]);
      });

      it('returns 200 with available slots', async () => {
         mockQueryQueue.push(
            [patientUser],
            [visitType],
            [weeklyPractitioner],
            [],
            [{ id: 5 }],
            [],
         );

         const res = await searchSlots();

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.visit_type).toBe('General Checkup');
         // Weekly hours are Manila wall-clock times.
         expect(body.slots[0].start).toBe(
            manilaAt(slotDate, '09:00:00').toISOString(),
         );
         expect(Array.isArray(body.slots)).toBe(true);
         expect(body.slots.length).toBeGreaterThan(0);
         expect(body.slots[0]).toHaveProperty('provider_id', 7);
         expect(body.slots[0]).toHaveProperty('consultation_fee', '800.00');
         // Only physicians are consult doctors.
         expect(filteredToPhysicians()).toBe(true);
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
         expect(filteredToPhysicians()).toBe(true);
      });

      it('returns 409 on a Duty Schedule day off despite weekly hours', async () => {
         const date = manilaDate();
         mockQueryQueue.push(
            [patientUser],
            [visitType],
            [{ id: 11 }],
            [{ isDayOff: true, startTime: null, endTime: null }],
            [{ startTime: '09:00:00', endTime: '17:00:00' }],
         );

         const res = await postJson(
            ctx.baseUrl,
            '/appointment',
            {
               visit_type_id: 1,
               provider_id: 11,
               start: manilaAt(date, '10:00:00').toISOString(),
               end: manilaAt(date, '10:30:00').toISOString(),
            },
            authHeader(patientToken),
         );

         expect(res.status).toBe(409);
         expect(await readJson(res)).toEqual({
            error: 'Appointment falls outside provider availability',
         });
         expect(mockMutationLog).toHaveLength(0);
      });

      it('returns 201 and creates the appointment', async () => {
         // 10:00 Manila sits inside weekly 09:00-17:00 Manila hours.
         const date = manilaDate();
         const start = manilaAt(date, '10:00:00');
         const end = manilaAt(date, '10:30:00');
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
            [],
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

      it('returns an appointment with no practitioner or room', async () => {
         const rows = [
            {
               id: 2,
               status: 'scheduled',
               providerId: null,
               roomId: null,
               providerFirst: null,
               providerLast: null,
            },
         ];
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

      it('returns 400 when a patient gives no Cancellation Reason', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await cancel(ctx.baseUrl, 1, {});

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'A valid cancellation reason is required',
         });
      });

      it('returns 400 when the Cancellation Reason is unknown', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await cancel(ctx.baseUrl, 1, { reason: 'bored' });

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'A valid cancellation reason is required',
         });
      });

      it('returns 400 when a patient gives a staff-only category', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await cancel(ctx.baseUrl, 1, { reason: 'clinic_closure' });

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'A valid cancellation reason is required',
         });
      });

      it('returns 400 when the reason is Other without text', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await cancel(ctx.baseUrl, 1, {
            reason: 'other',
            reasonText: '   ',
         });

         expect(res.status).toBe(400);
         expect(await readJson(res)).toEqual({
            error: 'Please describe your reason for cancelling',
         });
      });

      it('returns 404 when the appointment cannot be found', async () => {
         mockQueryQueue.push([patientUser], []);

         const res = await cancel(ctx.baseUrl, 1, validReason);

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

         const res = await cancel(ctx.baseUrl, 1, validReason);

         expect(res.status).toBe(404);
      });

      it('stores the Cancellation Reason, who cancelled and when', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ id: 1, status: 'scheduled', providerId: 11 }],
            [{ id: 1 }],
            [],
            [null],
         );

         const res = await cancel(ctx.baseUrl, 1, {
            reason: 'other',
            reasonText: '  Moving to another city  ',
         });

         expect(res.status).toBe(204);
         const { set } = mockMutationLog.find(
            (entry) => entry.set?.status === 'cancelled',
         );
         expect(set).toMatchObject({
            cancellationReason: 'other',
            cancellationReasonText: 'Moving to another city',
            cancelledByUserId: patientUser.id,
         });
         expect(set.cancelledAt).toBeInstanceOf(Date);
      });

      it('releases the waitlist offer in the same transaction', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ id: 1, status: 'scheduled', providerId: 11 }],
            [{ id: 1 }],
            [],
            [{ id: 7 }],
            [],
         );

         const res = await cancel(ctx.baseUrl, 1, validReason);

         expect(res.status).toBe(204);
         expect(mockMutationLog).toContainEqual({
            set: { status: 'cancelled', offerExpiresAt: null },
         });
      });

      it('returns 204 when the appointment is cancelled', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ id: 1, status: 'scheduled', providerId: 11 }],
            [{ id: 1 }],
            [],
            [null],
         );

         const res = await cancel(ctx.baseUrl, 1, validReason);

         expect(res.status).toBe(204);
         const { set } = mockMutationLog.find(
            (entry) => entry.set?.status === 'cancelled',
         );
         expect(set.cancellationReasonText).toBeNull();
      });

      it('cancels an appointment with no practitioner without offering a waitlist slot', async () => {
         const unused = [{ specialty: 'must not be read' }];
         mockQueryQueue.push(
            [patientUser],
            [{ id: 1, status: 'scheduled', providerId: null, roomId: null }],
            [{ id: 1 }],
            [],
            [null],
            unused,
         );

         const res = await cancel(ctx.baseUrl, 1, validReason);

         expect(res.status).toBe(204);
         // Only waitlist offers read the practitioner; there is none here.
         expect(mockQueryQueue).toEqual([unused]);
      });
   });
});
