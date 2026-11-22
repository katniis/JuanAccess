import jwt from 'jsonwebtoken';
import {
   mockMutationLog,
   mockQueryQueue,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;
const admin = {
   id: 29,
   email: 'admin@example.test',
   role: 'staff_admin',
   patientId: null,
   providerId: null,
};
const staff = { ...admin, id: 30, role: 'staff' };
const cookieFor = (user) => `token=${jwt.sign({ id: user.id }, secret)}`;

describe('Procedure offered days and capacity', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   const editProcedure = (user, body) =>
      fetch(`${ctx.baseUrl}/staff/admin/reference/fee-schedule/3`, {
         method: 'PATCH',
         headers: {
            cookie: cookieFor(user),
            'content-type': 'application/json',
         },
         body: JSON.stringify(body),
      });

   it('lets a staff_admin set offered days and capacity per Arrival Window', async () => {
      mockQueryQueue.push([admin], [{ id: 3 }]);
      const res = await editProcedure(admin, {
         offeredDays: [1, 3, 5],
         capacityPerWindow: 20,
      });

      expect(res.status).toBe(200);
      expect(mockMutationLog[0].set).toEqual({
         offeredDays: [1, 3, 5],
         capacityPerWindow: 20,
      });
   });

   it('accepts zero capacity and no offered days', async () => {
      mockQueryQueue.push([admin], [{ id: 3 }]);
      const res = await editProcedure(admin, {
         offeredDays: [],
         capacityPerWindow: 0,
      });

      expect(res.status).toBe(200);
   });

   it.each([
      ['a negative capacity', { capacityPerWindow: -1 }],
      ['a fractional capacity', { capacityPerWindow: 2.5 }],
      ['a text capacity', { capacityPerWindow: '10' }],
      ['a day outside 0-6', { offeredDays: [7] }],
      ['a repeated day', { offeredDays: [1, 1] }],
      ['offered days that are not a list', { offeredDays: 'Mon' }],
   ])('rejects %s', async (_label, body) => {
      mockQueryQueue.push([admin]);
      const res = await editProcedure(admin, body);

      expect(res.status).toBe(400);
      expect(mockMutationLog).toHaveLength(0);
   });

   it('returns 403 when staff edits Procedure capacity', async () => {
      mockQueryQueue.push([staff]);
      const res = await editProcedure(staff, { capacityPerWindow: 5 });

      expect(res.status).toBe(403);
      expect(mockMutationLog).toHaveLength(0);
   });
});
