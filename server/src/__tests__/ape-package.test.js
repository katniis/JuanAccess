import jwt from 'jsonwebtoken';
import {
   mockMutationLog,
   mockQueryQueue,
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

const packageRow = (procedureCode, description, standardCost, sexAtBirth) => ({
   packageId: 1,
   name: 'Basic',
   packagePrice: '1500.00',
   procedureCode,
   description,
   standardCost,
   sexAtBirth,
});

describe('APE Packages', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('shows active APE Packages on the Price List with the itemized sum and savings per Sex at Birth', async () => {
      mockQueryQueue.push(
         [],
         [],
         [
            packageRow('CBC', 'Complete blood count', '350.00', null),
            packageRow('CXR', 'Chest X-ray', '500.00', null),
            packageRow('PAP', 'Pap smear', '800.00', 'female'),
            packageRow('PSA', 'Prostate-specific antigen', '1200.00', 'male'),
         ],
      );
      const res = await fetch(`${ctx.baseUrl}/price-list`);

      expect(res.status).toBe(200);
      const { apePackages } = await readJson(res);
      expect(apePackages).toHaveLength(1);
      expect(apePackages[0]).toMatchObject({
         id: 1,
         name: 'Basic',
         packagePrice: '1500.00',
         itemizedSum: { female: '1650.00', male: '2050.00' },
         savings: { female: '150.00', male: '550.00' },
      });
      expect(apePackages[0].procedures).toEqual([
         {
            procedureCode: 'CBC',
            description: 'Complete blood count',
            standardCost: '350.00',
            sexAtBirth: null,
         },
         {
            procedureCode: 'CXR',
            description: 'Chest X-ray',
            standardCost: '500.00',
            sexAtBirth: null,
         },
         {
            procedureCode: 'PAP',
            description: 'Pap smear',
            standardCost: '800.00',
            sexAtBirth: 'female',
         },
         {
            procedureCode: 'PSA',
            description: 'Prostate-specific antigen',
            standardCost: '1200.00',
            sexAtBirth: 'male',
         },
      ]);
   });

   it('sums centavo prices without floating-point drift', async () => {
      mockQueryQueue.push(
         [],
         [],
         [
            { ...packageRow('A', 'A', '0.10', null), packagePrice: '0.25' },
            { ...packageRow('B', 'B', '0.20', null), packagePrice: '0.25' },
         ],
      );
      const res = await fetch(`${ctx.baseUrl}/price-list`);
      const { apePackages } = await readJson(res);

      expect(apePackages[0].itemizedSum).toEqual({
         female: '0.30',
         male: '0.30',
      });
      expect(apePackages[0].savings).toEqual({ female: '0.05', male: '0.05' });
   });

   const adminRequest = (user, method, path = '', body) =>
      fetch(`${ctx.baseUrl}/staff/admin/ape-packages${path}`, {
         method,
         headers: {
            cookie: cookieFor(user),
            'content-type': 'application/json',
         },
         body: body && JSON.stringify(body),
      });

   const basic = {
      name: 'Basic',
      packagePrice: '1500.00',
      procedures: [
         { feeScheduleId: 1 },
         { feeScheduleId: 4, sexAtBirth: 'female' },
         { feeScheduleId: 5, sexAtBirth: 'male' },
      ],
   };

   it('lets a staff_admin create an APE Package with sex-specific Procedures', async () => {
      mockQueryQueue.push(
         [admin],
         [{ id: 7, name: 'Basic', packagePrice: '1500.00', isActive: true }],
      );
      const res = await adminRequest(admin, 'POST', '', basic);

      expect(res.status).toBe(201);
      expect(await readJson(res)).toEqual({
         id: 7,
         name: 'Basic',
         packagePrice: '1500.00',
         isActive: true,
         procedures: [
            { feeScheduleId: 1, sexAtBirth: null },
            { feeScheduleId: 4, sexAtBirth: 'female' },
            { feeScheduleId: 5, sexAtBirth: 'male' },
         ],
      });
      expect(mockMutationLog).toEqual([
         { values: { name: 'Basic', packagePrice: '1500.00', isActive: true } },
         {
            values: [
               { packageId: 7, feeScheduleId: 1, sexAtBirth: null },
               { packageId: 7, feeScheduleId: 4, sexAtBirth: 'female' },
               { packageId: 7, feeScheduleId: 5, sexAtBirth: 'male' },
            ],
         },
      ]);
   });

   it.each([
      ['no name', { ...basic, name: ' ' }],
      ['a negative Package Price', { ...basic, packagePrice: '-1' }],
      ['a sub-centavo Package Price', { ...basic, packagePrice: '1.234' }],
      ['no Procedures', { ...basic, procedures: [] }],
      [
         'a repeated Procedure',
         { ...basic, procedures: [{ feeScheduleId: 1 }, { feeScheduleId: 1 }] },
      ],
      [
         'an unknown Sex at Birth',
         { ...basic, procedures: [{ feeScheduleId: 1, sexAtBirth: 'other' }] },
      ],
      ['a non-boolean active flag', { ...basic, isActive: 'yes' }],
   ])('rejects an APE Package with %s', async (_label, body) => {
      mockQueryQueue.push([admin]);
      const res = await adminRequest(admin, 'POST', '', body);

      expect(res.status).toBe(400);
      expect(mockMutationLog).toHaveLength(0);
   });

   it('returns 400 for a Procedure that is not in the fee schedule', async () => {
      mockQueryQueue.push(
         [admin],
         [{ id: 7 }],
         Object.assign(new Error('fk'), { cause: { code: '23503' } }),
      );
      const res = await adminRequest(admin, 'POST', '', basic);

      expect(res.status).toBe(400);
   });

   it('returns 409 for a duplicate package name', async () => {
      mockQueryQueue.push(
         [admin],
         Object.assign(new Error('dup'), { cause: { code: '23505' } }),
      );
      const res = await adminRequest(admin, 'POST', '', basic);

      expect(res.status).toBe(409);
   });

   it('lists every APE Package, inactive included, for a staff_admin', async () => {
      mockQueryQueue.push(
         [admin],
         [
            { id: 7, name: 'Basic', packagePrice: '1500.00', isActive: true },
            {
               id: 8,
               name: 'Executive',
               packagePrice: '4000.00',
               isActive: false,
            },
         ],
         [
            { packageId: 7, feeScheduleId: 1, sexAtBirth: null },
            { packageId: 8, feeScheduleId: 4, sexAtBirth: 'female' },
         ],
      );
      const res = await adminRequest(admin, 'GET');

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({
         apePackages: [
            {
               id: 7,
               name: 'Basic',
               packagePrice: '1500.00',
               isActive: true,
               procedures: [{ feeScheduleId: 1, sexAtBirth: null }],
            },
            {
               id: 8,
               name: 'Executive',
               packagePrice: '4000.00',
               isActive: false,
               procedures: [{ feeScheduleId: 4, sexAtBirth: 'female' }],
            },
         ],
      });
   });

   it('deactivates an APE Package without touching its Procedures', async () => {
      mockQueryQueue.push(
         [admin],
         [{ id: 7, name: 'Basic', packagePrice: '1500.00', isActive: false }],
      );
      const res = await adminRequest(admin, 'PATCH', '/7', { isActive: false });

      expect(res.status).toBe(200);
      expect(mockMutationLog).toEqual([{ set: { isActive: false } }]);
   });

   it('replaces the Procedures of an APE Package', async () => {
      mockQueryQueue.push(
         [admin],
         [{ id: 7, name: 'Basic', packagePrice: '1200.00', isActive: true }],
         [],
         [],
      );
      const res = await adminRequest(admin, 'PATCH', '/7', {
         packagePrice: '1200.00',
         procedures: [{ feeScheduleId: 2 }],
      });

      expect(res.status).toBe(200);
      expect((await readJson(res)).procedures).toEqual([
         { feeScheduleId: 2, sexAtBirth: null },
      ]);
      expect(mockMutationLog).toEqual([
         { set: { packagePrice: '1200.00' } },
         { values: [{ packageId: 7, feeScheduleId: 2, sexAtBirth: null }] },
      ]);
   });

   it('returns 404 when updating a missing APE Package', async () => {
      mockQueryQueue.push([admin], []);
      const res = await adminRequest(admin, 'PATCH', '/99', { isActive: true });

      expect(res.status).toBe(404);
   });

   it('rejects an empty update', async () => {
      mockQueryQueue.push([admin]);
      const res = await adminRequest(admin, 'PATCH', '/7', {});

      expect(res.status).toBe(400);
   });

   it('deletes an APE Package', async () => {
      mockQueryQueue.push([admin], [{ id: 7 }]);
      const res = await adminRequest(admin, 'DELETE', '/7');

      expect(res.status).toBe(200);
   });

   it('returns 404 when deleting a missing APE Package', async () => {
      mockQueryQueue.push([admin], []);
      const res = await adminRequest(admin, 'DELETE', '/99');

      expect(res.status).toBe(404);
   });

   it.each([
      ['staff', staff, 'GET', ''],
      ['staff', staff, 'POST', ''],
      ['staff', staff, 'PATCH', '/7'],
      ['staff', staff, 'DELETE', '/7'],
      ['patient', patient, 'GET', ''],
      ['patient', patient, 'POST', ''],
      ['patient', patient, 'PATCH', '/7'],
      ['patient', patient, 'DELETE', '/7'],
   ])('returns 403 when %s calls %s', async (_label, user, method, path) => {
      mockQueryQueue.push([user]);
      const body = method === 'GET' ? undefined : basic;
      const res = await adminRequest(user, method, path, body);

      expect(res.status).toBe(403);
      expect(mockMutationLog).toHaveLength(0);
   });
});
