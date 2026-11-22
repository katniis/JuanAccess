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
const cookieFor = (user) => `token=${jwt.sign({ id: user.id }, secret)}`;

const send = (ctx, method, path, body, user = admin) =>
   fetch(`${ctx.baseUrl}${path}`, {
      method,
      headers: { cookie: cookieFor(user), 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
   });

const validPhysician = {
   first_name: 'Ana',
   last_name: 'Synthetic',
   profession: 'physician',
   specialty: 'Internal Medicine',
   education: 'MD, Example College of Medicine',
   prc_license_number: '0123456',
   board_certifications: 'Diplomate, Example Board of Internal Medicine',
   practice_start_year: 2012,
   background: 'Synthetic background text.',
   consultation_fee: 800,
};

describe('staff_admin Practitioner management', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('creates a physician Practitioner with a Doctor Profile', async () => {
      mockQueryQueue.push([admin], [{ id: 5, profession: 'physician' }]);
      const res = await send(
         ctx,
         'POST',
         '/staff/admin/practitioners',
         validPhysician,
      );

      expect(res.status).toBe(201);
      expect((await readJson(res)).id).toBe(5);
      expect(mockMutationLog[0].values).toMatchObject({
         firstName: 'Ana',
         lastName: 'Synthetic',
         profession: 'physician',
         prcLicenseNumber: '0123456',
         practiceStartYear: 2012,
         consultationFee: '800.00',
      });
   });

   it('creates non-physician Practitioners such as a nurse', async () => {
      mockQueryQueue.push([admin], [{ id: 6, profession: 'nurse' }]);
      const res = await send(ctx, 'POST', '/staff/admin/practitioners', {
         first_name: 'Ben',
         last_name: 'Example',
         profession: 'nurse',
      });

      expect(res.status).toBe(201);
      expect(mockMutationLog[0].values.profession).toBe('nurse');
   });

   it.each([
      ['an unknown profession', { profession: 'surgeon' }, /profession/],
      ['a missing profession', { profession: undefined }, /profession/],
      ['a missing last name', { last_name: ' ' }, /last_name/],
      ['a malformed PRC license', { prc_license_number: '12AB' }, /prc/],
      ['a future practice start year', { practice_start_year: 3000 }, /year/],
      ['a fractional start year', { practice_start_year: 2010.5 }, /year/],
      ['a negative consultation fee', { consultation_fee: -1 }, /fee/],
      ['a fee with sub-centavo digits', { consultation_fee: 1.234 }, /fee/],
      ['a text consultation fee', { consultation_fee: '800' }, /fee/],
   ])('rejects %s', async (_label, override, message) => {
      mockQueryQueue.push([admin]);
      const res = await send(ctx, 'POST', '/staff/admin/practitioners', {
         ...validPhysician,
         ...override,
      });

      expect(res.status).toBe(400);
      expect((await readJson(res)).error).toMatch(message);
      expect(mockMutationLog).toHaveLength(0);
   });

   it('updates a Doctor Profile and can clear optional fields', async () => {
      mockQueryQueue.push([admin], [{ id: 5, consultationFee: '950.00' }]);
      const res = await send(ctx, 'PATCH', '/staff/admin/practitioners/5', {
         consultation_fee: 950,
         prc_license_number: null,
         is_active: false,
      });

      expect(res.status).toBe(200);
      expect(mockMutationLog[0].set).toEqual({
         consultationFee: '950.00',
         prcLicenseNumber: null,
         isActive: false,
      });
   });

   it('rejects an invalid profession on update', async () => {
      mockQueryQueue.push([admin]);
      const res = await send(ctx, 'PATCH', '/staff/admin/practitioners/5', {
         profession: 'doctor',
      });

      expect(res.status).toBe(400);
      expect(mockMutationLog).toHaveLength(0);
   });

   it('returns 404 when updating a missing Practitioner', async () => {
      mockQueryQueue.push([admin], []);
      const res = await send(ctx, 'PATCH', '/staff/admin/practitioners/99', {
         background: 'Updated synthetic text.',
      });

      expect(res.status).toBe(404);
   });

   it('lists Practitioners for staff_admin', async () => {
      mockQueryQueue.push([admin], [{ id: 5, profession: 'physician' }]);
      const res = await send(ctx, 'GET', '/staff/admin/practitioners');

      expect(res.status).toBe(200);
      expect((await readJson(res)).practitioners).toEqual([
         { id: 5, profession: 'physician' },
      ]);
   });

   const uploadPhoto = (type, bytes, user = admin) => {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type }), 'photo.png');
      return fetch(`${ctx.baseUrl}/staff/admin/practitioners/5/photo`, {
         method: 'POST',
         headers: { cookie: cookieFor(user) },
         body: form,
      });
   };

   it('stores a photo inline when Supabase Storage is not configured', async () => {
      delete process.env.SUPABASE_URL;
      const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      mockQueryQueue.push([admin], [{ id: 5 }]);
      const res = await uploadPhoto('image/png', bytes);

      expect(res.status).toBe(200);
      expect(mockMutationLog[0].set).toEqual({
         photoUrl: `data:image/png;base64,${bytes.toString('base64')}`,
      });
   });

   it('rejects a non-image photo upload', async () => {
      mockQueryQueue.push([admin]);
      const res = await uploadPhoto('application/pdf', Buffer.from('%PDF'));

      expect(res.status).toBe(400);
      expect(mockMutationLog).toHaveLength(0);
   });

   it('rejects a photo larger than the inline limit', async () => {
      mockQueryQueue.push([admin]);
      const res = await uploadPhoto(
         'image/jpeg',
         Buffer.alloc(3 * 1024 * 1024),
      );

      expect(res.status).toBe(413);
   });

   it('returns 404 for a photo on a missing Practitioner', async () => {
      mockQueryQueue.push([admin], []);
      const res = await uploadPhoto('image/png', Buffer.from([1, 2, 3]));

      expect(res.status).toBe(404);
   });

   it.each([
      ['GET', '/staff/admin/practitioners', undefined],
      ['POST', '/staff/admin/practitioners', validPhysician],
      ['PATCH', '/staff/admin/practitioners/5', { background: 'x' }],
   ])(
      'returns 403 to non-admin staff for %s %s',
      async (method, path, body) => {
         mockQueryQueue.push([staff]);
         const res = await send(ctx, method, path, body, staff);

         expect(res.status).toBe(403);
         expect(mockMutationLog).toHaveLength(0);
      },
   );
});
