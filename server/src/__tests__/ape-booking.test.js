import jwt from 'jsonwebtoken';
import {
   startServer,
   readJson,
   resetMocks,
   mockQueryQueue,
   mockMutationLog,
   postJson,
} from './helpers.js';
import { manilaDateString } from '../utils/timezone.js';
import {
   computeApeAvailability,
   includedProcedures,
} from '../services/ape-booking.service.js';

// 2030-01-07 is a Monday (day 1), 2030-01-08 a Tuesday (day 2).
const MONDAY = '2030-01-07';
const TUESDAY = '2030-01-08';
const now = new Date('2030-01-01T00:00:00Z');

const cbc = {
   feeScheduleId: 1,
   procedureCode: 'CBC',
   offeredDays: [1, 2],
   capacityPerWindow: 2,
   sexAtBirth: null,
};
const xray = {
   feeScheduleId: 2,
   procedureCode: 'CXR',
   offeredDays: [1],
   capacityPerWindow: 5,
   sexAtBirth: null,
};
const papSmear = {
   feeScheduleId: 3,
   procedureCode: 'PAP',
   offeredDays: [1, 2],
   capacityPerWindow: 1,
   sexAtBirth: 'female',
};
const psa = {
   feeScheduleId: 4,
   procedureCode: 'PSA',
   offeredDays: [1, 2],
   capacityPerWindow: 1,
   sexAtBirth: 'male',
};

const early = {
   id: 1,
   name: 'Early',
   startTime: '07:00:00',
   endTime: '10:00:00',
};
const late = {
   id: 2,
   name: 'Late',
   startTime: '10:00:00',
   endTime: '12:00:00',
};

// A booking of a Procedure in a window on a Manila date (07:00 Manila = 23:00Z the day before).
const booking = (feeScheduleId, arrivalWindowId, scheduledStart) => ({
   feeScheduleId,
   arrivalWindowId,
   scheduledStart: new Date(scheduledStart),
});

const windowIds = (days, date) =>
   days.find((day) => day.date === date)?.windows.map((w) => w.id) ?? [];

describe('includedProcedures', () => {
   it('adds the female-only Procedures for a female patient', () => {
      expect(
         includedProcedures([cbc, papSmear, psa], 'female').map(
            (p) => p.procedureCode,
         ),
      ).toEqual(['CBC', 'PAP']);
   });

   it('adds the male-only Procedures for a male patient', () => {
      expect(
         includedProcedures([cbc, papSmear, psa], 'male').map(
            (p) => p.procedureCode,
         ),
      ).toEqual(['CBC', 'PSA']);
   });
});

describe('computeApeAvailability', () => {
   it('offers every active window on a day all Procedures are offered', () => {
      const days = computeApeAvailability({
         procedures: [cbc, xray],
         windows: [early, late],
         bookings: [],
         dates: [MONDAY],
         now,
      });

      expect(days).toEqual([
         {
            date: MONDAY,
            windows: [
               {
                  id: 1,
                  name: 'Early',
                  startTime: '07:00:00',
                  endTime: '10:00:00',
                  start: '2030-01-06T23:00:00.000Z',
                  end: '2030-01-07T02:00:00.000Z',
                  spotsLeft: 2,
               },
               {
                  id: 2,
                  name: 'Late',
                  startTime: '10:00:00',
                  endTime: '12:00:00',
                  start: '2030-01-07T02:00:00.000Z',
                  end: '2030-01-07T04:00:00.000Z',
                  spotsLeft: 2,
               },
            ],
         },
      ]);
   });

   it('drops a day when any included Procedure is not offered that weekday', () => {
      const days = computeApeAvailability({
         procedures: [cbc, xray],
         windows: [early],
         bookings: [],
         dates: [MONDAY, TUESDAY],
         now,
      });

      expect(days.map((day) => day.date)).toEqual([MONDAY]);
   });

   it('drops a window when any included Procedure is full in it', () => {
      const days = computeApeAvailability({
         procedures: [cbc, xray],
         windows: [early, late],
         bookings: [
            booking(1, 1, '2030-01-06T23:00:00Z'),
            booking(1, 1, '2030-01-06T23:00:00Z'),
            booking(2, 2, '2030-01-07T02:00:00Z'),
         ],
         dates: [MONDAY],
         now,
      });

      expect(windowIds(days, MONDAY)).toEqual([2]);
      expect(days[0].windows[0].spotsLeft).toBe(2);
   });

   it('only counts bookings on the same Manila date', () => {
      const days = computeApeAvailability({
         procedures: [papSmear],
         windows: [early],
         // Early window on Tuesday, not Monday.
         bookings: [booking(3, 1, '2030-01-07T23:00:00Z')],
         dates: [MONDAY, TUESDAY],
         now,
      });

      expect(days.map((day) => day.date)).toEqual([MONDAY]);
   });

   it('drops windows that have already started', () => {
      const days = computeApeAvailability({
         procedures: [cbc],
         windows: [early, late],
         bookings: [],
         dates: [MONDAY],
         now: new Date('2030-01-07T00:30:00Z'),
      });

      expect(windowIds(days, MONDAY)).toEqual([2]);
   });

   it('offers nothing when no Procedure is included', () => {
      expect(
         computeApeAvailability({
            procedures: [],
            windows: [early],
            bookings: [],
            dates: [MONDAY],
            now,
         }),
      ).toEqual([]);
   });
});

const secret = process.env.JWT_SECRET;
const patientToken = jwt.sign({ id: 1 }, secret, { expiresIn: '30d' });
const authHeader = { cookie: `token=${patientToken}` };
const patientUser = {
   id: 1,
   email: 'ape.patient@example.com',
   role: 'patient',
   patientId: 10,
   providerId: null,
   displayName: 'Ape Patient',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const manilaDay = (offset) =>
   manilaDateString(new Date(Date.now() + offset * DAY_MS));
const everyDay = [0, 1, 2, 3, 4, 5, 6];

const basicPackage = { id: 5, name: 'Basic APE', packagePrice: '1500.00' };
const packageRow = (procedure) => ({
   description: procedure.procedureCode,
   standardCost: '500.00',
   ...procedure,
   offeredDays: everyDay,
});
const packageRows = [packageRow(cbc), packageRow(papSmear), packageRow(psa)];

const getAvailability = (baseUrl, query) =>
   fetch(`${baseUrl}/appointment/ape/availability?${query}`, {
      headers: authHeader,
   });

describe('APE booking routes', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   describe('GET /appointment/ape/availability', () => {
      const query = () =>
         `package_id=5&range_start=${manilaDay(1)}&range_end=${manilaDay(2)}`;

      it('returns the breakdown with Sex at Birth Procedures and open windows', async () => {
         mockQueryQueue.push(
            [patientUser],
            [{ sexAtBirth: 'female' }],
            [basicPackage],
            packageRows,
            [early],
            [],
         );

         const res = await getAvailability(ctx.baseUrl, query());
         const body = await readJson(res);

         expect(res.status).toBe(200);
         expect(body.package).toEqual(basicPackage);
         expect(body.sexAtBirth).toBe('female');
         expect(body.procedures.map((p) => p.procedureCode)).toEqual([
            'CBC',
            'PAP',
         ]);
         expect(body.itemizedSum).toBe('1000.00');
         expect(body.days.map((day) => day.date)).toEqual([
            manilaDay(1),
            manilaDay(2),
         ]);
         // PAP has one spot per window, so that is the window's limit.
         expect(body.days[0].windows[0]).toMatchObject({
            id: 1,
            spotsLeft: 1,
         });
      });

      it('leaves out a window whose sex-specific Procedure is full', async () => {
         const tomorrowEarly = new Date(
            `${manilaDay(1)}T07:00:00+08:00`,
         ).toISOString();
         mockQueryQueue.push(
            [patientUser],
            [{ sexAtBirth: 'male' }],
            [basicPackage],
            packageRows,
            [early],
            [
               {
                  feeScheduleId: 4,
                  arrivalWindowId: 1,
                  scheduledStart: tomorrowEarly,
               },
            ],
         );

         const body = await readJson(
            await getAvailability(ctx.baseUrl, query()),
         );

         expect(body.procedures.map((p) => p.procedureCode)).toEqual([
            'CBC',
            'PSA',
         ]);
         expect(body.days.map((day) => day.date)).toEqual([manilaDay(2)]);
      });

      it('blocks patients with no Sex at Birth and points to Settings', async () => {
         mockQueryQueue.push([patientUser], [{ sexAtBirth: null }]);

         const res = await getAvailability(ctx.baseUrl, query());

         expect(res.status).toBe(409);
         expect((await readJson(res)).error).toMatch(/Settings/);
      });

      it('rejects past dates', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await getAvailability(
            ctx.baseUrl,
            `package_id=5&range_start=${manilaDay(-1)}&range_end=${manilaDay(1)}`,
         );

         expect(res.status).toBe(400);
      });

      it('returns 404 for an inactive or unknown package', async () => {
         mockQueryQueue.push([patientUser], [{ sexAtBirth: 'female' }], []);

         const res = await getAvailability(ctx.baseUrl, query());

         expect(res.status).toBe(404);
      });
   });

   describe('POST /appointment/ape', () => {
      const book = (body = {}) =>
         postJson(
            ctx.baseUrl,
            '/appointment/ape',
            {
               package_id: 5,
               arrival_window_id: 1,
               date: manilaDay(3),
               ...body,
            },
            authHeader,
         );

      // Queries up to and including the capacity recheck.
      const queueUpToCapacity = (bookings = []) =>
         mockQueryQueue.push(
            [patientUser],
            [{ sexAtBirth: 'female' }],
            [basicPackage],
            [early],
            packageRows,
            bookings,
         );

      it('books with no Practitioner or room and records the included Procedures', async () => {
         const date = manilaDay(3);
         const created = { id: 77, patientId: 10, visitTypeId: 9 };
         queueUpToCapacity();
         mockQueryQueue.push(
            [], // patient conflict
            [{ id: 9 }], // APE visit type
            [], // coverage for insurance status
            [created],
            [], // ape_booking_procedures insert
            [], // prior-auth coverage
            [], // prior-auth rules
            [{ id: 3, status: 'not_required' }],
            [], // pre-visit summary
            [], // notify patient
         );

         const res = await book();
         const body = await readJson(res);

         expect(res.status).toBe(201);
         expect(body).toMatchObject({
            id: 77,
            priorAuthorizationStatus: 'not_required',
         });
         expect(mockQueryQueue).toHaveLength(0);
         const appointment = mockMutationLog.find(
            (entry) => entry.values?.apePackageId,
         ).values;
         expect(appointment).toMatchObject({
            patientId: 10,
            providerId: null,
            roomId: null,
            equipmentId: null,
            visitTypeId: 9,
            apePackageId: 5,
            arrivalWindowId: 1,
            insuranceStatus: 'unverified',
         });
         expect(appointment.scheduledStart.toISOString()).toBe(
            new Date(`${date}T07:00:00+08:00`).toISOString(),
         );
         expect(appointment.scheduledEnd.toISOString()).toBe(
            new Date(`${date}T10:00:00+08:00`).toISOString(),
         );
         const procedures = mockMutationLog.find((entry) =>
            Array.isArray(entry.values),
         ).values;
         expect(procedures).toEqual([
            { appointmentId: 77, feeScheduleId: 1, procedureCode: 'CBC' },
            { appointmentId: 77, feeScheduleId: 3, procedureCode: 'PAP' },
         ]);
      });

      it('creates the APE visit type when it does not exist yet', async () => {
         queueUpToCapacity();
         mockQueryQueue.push(
            [],
            [], // no APE visit type
            [{ id: 12 }], // inserted
            [],
            [{ id: 78, patientId: 10, visitTypeId: 12 }],
            [],
            [],
            [],
            [{ id: 4, status: 'not_required' }],
            [],
            [],
         );

         const res = await book();

         expect(res.status).toBe(201);
         expect(mockMutationLog[0].values).toMatchObject({
            name: 'Annual Physical Examination',
         });
      });

      it('rejects the booking when the recheck finds a Procedure full', async () => {
         const date = manilaDay(3);
         queueUpToCapacity([
            {
               feeScheduleId: 3,
               arrivalWindowId: 1,
               scheduledStart: new Date(`${date}T07:00:00+08:00`).toISOString(),
            },
         ]);

         const res = await book();

         expect(res.status).toBe(409);
         expect(mockMutationLog).toHaveLength(0);
      });

      it('returns 409 when a concurrent booking takes the last spot', async () => {
         const serializationFailure = Object.assign(new Error('conflict'), {
            code: '40001',
         });
         mockQueryQueue.push(
            [patientUser],
            [{ sexAtBirth: 'female' }],
            [basicPackage],
            [early],
            serializationFailure,
         );

         const res = await book();

         expect(res.status).toBe(409);
         expect((await readJson(res)).error).toMatch(/just filled/);
      });

      it('rejects a patient who already has an appointment in the window', async () => {
         queueUpToCapacity();
         mockQueryQueue.push([{ id: 40 }]);

         const res = await book();

         expect(res.status).toBe(409);
      });

      it('blocks patients with no Sex at Birth', async () => {
         mockQueryQueue.push([patientUser], [{ sexAtBirth: null }]);

         const res = await book();

         expect(res.status).toBe(409);
         expect((await readJson(res)).error).toMatch(/Settings/);
      });

      it('rejects a past date', async () => {
         mockQueryQueue.push([patientUser]);

         const res = await book({ date: manilaDay(-1) });

         expect(res.status).toBe(400);
      });
   });

   it('keeps the APE visit type out of slot booking', async () => {
      const start = new Date(Date.now() + 3 * DAY_MS);
      mockQueryQueue.push(
         [patientUser],
         [{ id: 9, name: 'Annual Physical Examination', durationMinutes: 30 }],
      );

      const res = await postJson(
         ctx.baseUrl,
         '/appointment',
         {
            visit_type_id: 9,
            provider_id: 1,
            start: start.toISOString(),
            end: new Date(start.getTime() + 30 * 60000).toISOString(),
         },
         authHeader,
      );

      expect(res.status).toBe(400);
      expect((await readJson(res)).error).toMatch(/APE booking/);
   });

   describe('DELETE /appointment/:id for an APE Booking', () => {
      it('cancels with a reason and makes no waitlist offer', async () => {
         const apeBooking = {
            id: 77,
            patientId: 10,
            providerId: null,
            roomId: null,
            visitTypeId: 9,
            apePackageId: 5,
            status: 'scheduled',
         };
         mockQueryQueue.push(
            [patientUser],
            [apeBooking],
            [{ id: 77 }],
            [], // notify patient
            [], // waitlist offer on this appointment
         );

         const res = await fetch(`${ctx.baseUrl}/appointment/77`, {
            method: 'DELETE',
            headers: { 'content-type': 'application/json', ...authHeader },
            body: JSON.stringify({ reason: 'schedule_conflict' }),
         });

         expect(res.status).toBe(204);
         expect(mockQueryQueue).toHaveLength(0);
      });
   });
});
