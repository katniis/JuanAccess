import jwt from 'jsonwebtoken';
import {
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
});

const cancelled = (overrides) => ({
   appointmentId: 1,
   reason: 'schedule_conflict',
   reasonText: null,
   cancelledByRole: 'patient',
   cancelledAt: new Date('2026-11-10T02:00:00.000Z'),
   visitTypeName: 'General Consultation',
   ...overrides,
});

describe('Cancellation report', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   const getReport = async (user, query = '') => {
      const res = await fetch(
         `${ctx.baseUrl}/staff/reports/cancellations${query}`,
         { headers: authHeader(user) },
      );
      return { status: res.status, body: await readJson(res) };
   };

   it('is only available to staff_admin', async () => {
      mockQueryQueue.push([staffUser]);
      expect((await getReport(staffUser)).status).toBe(403);
   });

   it('counts Cancellation Reasons by category and by who cancelled', async () => {
      mockQueryQueue.push(
         [adminUser],
         [
            cancelled({ appointmentId: 1 }),
            cancelled({ appointmentId: 2 }),
            cancelled({ appointmentId: 3, reason: 'cost' }),
            cancelled({
               appointmentId: 4,
               reason: 'clinic_closure',
               cancelledByRole: 'staff_admin',
            }),
            cancelled({
               appointmentId: 5,
               reason: 'other',
               reasonText: 'Typhoon signal no. 2',
               cancelledByRole: 'staff',
            }),
            cancelled({
               appointmentId: 6,
               reason: null,
               cancelledByRole: null,
            }),
         ],
      );

      const { status, body } = await getReport(adminUser);

      expect(status).toBe(200);
      expect(body.total).toBe(6);
      expect(body.byReason).toEqual([
         { reason: 'schedule_conflict', count: 2 },
         { reason: 'clinic_closure', count: 1 },
         { reason: 'cost', count: 1 },
         { reason: 'other', count: 1 },
         { reason: 'unspecified', count: 1 },
      ]);
      expect(body.byCancelledBy).toEqual([
         { cancelledBy: 'patient', count: 3 },
         { cancelledBy: 'staff', count: 2 },
         { cancelledBy: 'unknown', count: 1 },
      ]);
      expect(body.byReasonAndCancelledBy).toContainEqual({
         reason: 'schedule_conflict',
         cancelledBy: 'patient',
         count: 2,
      });
   });

   it('lists "Other" free-text entries with date and visit type', async () => {
      mockQueryQueue.push(
         [adminUser],
         [
            cancelled({ appointmentId: 7 }),
            cancelled({
               appointmentId: 8,
               reason: 'other',
               reasonText: 'Car broke down',
               cancelledAt: new Date('2026-11-09T17:30:00.000Z'),
               visitTypeName: 'Follow-up',
            }),
         ],
      );

      const { body } = await getReport(adminUser);

      expect(body.otherEntries).toEqual([
         {
            appointmentId: 8,
            reasonText: 'Car broke down',
            date: '2026-11-10',
            visitType: 'Follow-up',
            cancelledBy: 'patient',
         },
      ]);
   });

   it('uses Manila day bounds for the date range filter', async () => {
      mockQueryQueue.push([adminUser], []);
      const { status, body } = await getReport(
         adminUser,
         '?from=2026-11-01&to=2026-11-30&visitTypeId=4&practitionerId=7',
      );
      expect(status).toBe(200);
      expect(body.filters).toEqual({
         from: '2026-10-31T16:00:00.000Z',
         to: '2026-11-30T15:59:59.999Z',
         visitTypeId: 4,
         practitionerId: 7,
      });
      expect(body.total).toBe(0);
   });

   it.each([
      ['?from=2026-13-40', 'from'],
      ['?from=2026-11-30&to=2026-11-01', 'range'],
      ['?visitTypeId=abc', 'visitTypeId'],
      ['?practitionerId=0', 'practitionerId'],
   ])('rejects an invalid filter %s', async (query) => {
      mockQueryQueue.push([adminUser]);
      expect((await getReport(adminUser, query)).status).toBe(400);
   });
});
