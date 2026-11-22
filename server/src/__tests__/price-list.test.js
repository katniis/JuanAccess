import jwt from 'jsonwebtoken';
import {
   mockMutationLog,
   mockQueryQueue,
   mockSelectLog,
   readJson,
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
const patient = { ...admin, id: 31, role: 'patient', patientId: 4 };
const cookieFor = (user) => `token=${jwt.sign({ id: user.id }, secret)}`;

describe('Price List', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('lists Procedure prices and Consultation Fees without signing in', async () => {
      mockQueryQueue.push(
         [
            {
               procedureCode: 'CBC',
               description: 'Complete blood count',
               standardCost: '350.00',
            },
         ],
         [
            {
               id: 5,
               firstName: 'Ana',
               lastName: 'Synthetic',
               specialty: 'Internal Medicine',
               consultationFee: '800.00',
            },
         ],
      );
      const res = await fetch(`${ctx.baseUrl}/price-list`);

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({
         procedures: [
            {
               procedureCode: 'CBC',
               description: 'Complete blood count',
               standardCost: '350.00',
            },
         ],
         consultationFees: [
            {
               id: 5,
               firstName: 'Ana',
               lastName: 'Synthetic',
               specialty: 'Internal Medicine',
               consultationFee: '800.00',
            },
         ],
      });
   });

   it('selects only public columns', async () => {
      await fetch(`${ctx.baseUrl}/price-list`);

      expect(mockSelectLog).toEqual([
         ['procedureCode', 'description', 'standardCost'],
         ['id', 'firstName', 'lastName', 'specialty', 'consultationFee'],
      ]);
   });

   const editPrice = (user, body) =>
      fetch(`${ctx.baseUrl}/staff/admin/reference/fee-schedule/3`, {
         method: 'PATCH',
         headers: {
            cookie: cookieFor(user),
            'content-type': 'application/json',
         },
         body: JSON.stringify(body),
      });

   it('lets a staff_admin edit a Procedure price', async () => {
      mockQueryQueue.push([admin], [{ id: 3, standardCost: '400.00' }]);
      const res = await editPrice(admin, { standardCost: '400.00' });

      expect(res.status).toBe(200);
      expect(mockMutationLog[0].set).toEqual({ standardCost: '400.00' });
   });

   it.each([
      ['a negative', '-1'],
      ['a non-numeric', 'free'],
      ['a sub-centavo', '1.234'],
   ])('rejects %s Procedure price', async (_label, standardCost) => {
      mockQueryQueue.push([admin]);
      const res = await editPrice(admin, { standardCost });

      expect(res.status).toBe(400);
      expect(mockMutationLog).toHaveLength(0);
   });

   it.each([
      ['staff', staff],
      ['patient', patient],
   ])('returns 403 when %s edits a Procedure price', async (_label, user) => {
      mockQueryQueue.push([user]);
      const res = await editPrice(user, { standardCost: '1.00' });

      expect(res.status).toBe(403);
      expect(mockMutationLog).toHaveLength(0);
   });
});
