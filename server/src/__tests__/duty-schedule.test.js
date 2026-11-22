import jwt from 'jsonwebtoken';
import {
   mockMutationLog,
   mockQueryQueue,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;

const staffUser = {
   id: 2,
   email: 'staff@example.test',
   role: 'staff',
   patientId: null,
   providerId: null,
   displayName: 'Staff User',
};

const adminUser = {
   id: 3,
   email: 'admin@example.test',
   role: 'staff_admin',
   patientId: null,
   providerId: null,
   displayName: 'Staff Admin User',
};

const authHeader = (user) => ({
   cookie: `token=${jwt.sign({ id: user.id }, secret)}`,
   'content-type': 'application/json',
});

// Monday 2026-11-23 in Manila (UTC+8)
const MONDAY_9AM = '2026-11-23T01:00:00.000Z';
const MONDAY_2PM = '2026-11-23T06:00:00.000Z';
const MONDAY_5PM = '2026-11-23T09:00:00.000Z';
const weeklyHours = [{ startTime: '08:00:00', endTime: '16:00:00' }];

describe('Duty Schedule', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   const onDuty = async (at) => {
      const res = await fetch(
         `${ctx.baseUrl}/staff/practitioners/7/on-duty?at=${encodeURIComponent(at)}`,
         { headers: authHeader(staffUser) },
      );
      return { status: res.status, body: await readJson(res) };
   };

   describe('on-duty check', () => {
      it('uses the weekly hours when there is no override', async () => {
         mockQueryQueue.push([staffUser], [], weeklyHours);
         expect(await onDuty(MONDAY_9AM)).toEqual({
            status: 200,
            body: { onDuty: true },
         });

         mockQueryQueue.push([staffUser], [], weeklyHours);
         expect((await onDuty(MONDAY_5PM)).body.onDuty).toBe(false);
      });

      it('is off duty on a day-off override even inside weekly hours', async () => {
         mockQueryQueue.push(
            [staffUser],
            [{ isDayOff: true, startTime: null, endTime: null }],
         );
         expect((await onDuty(MONDAY_9AM)).body.onDuty).toBe(false);
      });

      it('uses custom hours from an override instead of the weekly hours', async () => {
         const custom = [
            { isDayOff: false, startTime: '13:00:00', endTime: '18:00:00' },
         ];
         mockQueryQueue.push([staffUser], custom);
         expect((await onDuty(MONDAY_9AM)).body.onDuty).toBe(false);

         mockQueryQueue.push([staffUser], custom);
         expect((await onDuty(MONDAY_2PM)).body.onDuty).toBe(true);

         mockQueryQueue.push([staffUser], custom);
         expect((await onDuty(MONDAY_5PM)).body.onDuty).toBe(true);
      });

      it('rejects a missing or invalid time', async () => {
         mockQueryQueue.push([staffUser]);
         expect((await onDuty('not-a-date')).status).toBe(400);
      });
   });

   describe('override management', () => {
      it('lets a staff_admin create a day-off override', async () => {
         const created = {
            id: 1,
            providerId: 7,
            overrideDate: '2026-11-23',
            isDayOff: true,
            startTime: null,
            endTime: null,
         };
         mockQueryQueue.push([adminUser], [created]);
         const res = await fetch(
            `${ctx.baseUrl}/staff/admin/reference/duty-overrides`,
            {
               method: 'POST',
               headers: authHeader(adminUser),
               body: JSON.stringify({
                  providerId: 7,
                  overrideDate: '2026-11-23',
                  isDayOff: true,
               }),
            },
         );
         expect(res.status).toBe(201);
         expect(await readJson(res)).toEqual(created);
         expect(mockMutationLog[0].values).toEqual({
            providerId: 7,
            overrideDate: '2026-11-23',
            isDayOff: true,
         });
      });

      it('blocks staff without staff_admin from managing overrides', async () => {
         mockQueryQueue.push([staffUser]);
         const res = await fetch(
            `${ctx.baseUrl}/staff/admin/reference/duty-overrides/1`,
            { method: 'DELETE', headers: authHeader(staffUser) },
         );
         expect(res.status).toBe(403);
      });

      it('lists a practitioner overrides for staff', async () => {
         const rows = [
            {
               id: 1,
               providerId: 7,
               overrideDate: '2026-11-23',
               isDayOff: true,
               startTime: null,
               endTime: null,
            },
         ];
         mockQueryQueue.push([staffUser], rows);
         const res = await fetch(
            `${ctx.baseUrl}/staff/practitioners/7/duty-overrides`,
            { headers: authHeader(staffUser) },
         );
         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual({ overrides: rows });
      });
   });
});
