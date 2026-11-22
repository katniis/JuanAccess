import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
   mockQueryQueue,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const patient = {
   id: 31,
   email: 'patient@example.test',
   role: 'patient',
   patientId: 4,
   providerId: null,
};
const staff = { ...patient, id: 30, role: 'staff', patientId: null };
const cookieFor = (user) =>
   `token=${jwt.sign({ id: user.id }, process.env.JWT_SECRET)}`;

const practitioner = (overrides) => ({
   id: 1,
   firstName: 'Ana',
   lastName: 'Synthetic',
   profession: 'physician',
   specialty: 'Internal Medicine',
   npiNumber: '9990001111',
   education: 'MD, Example College of Medicine',
   prcLicenseNumber: '0123456',
   boardCertifications: 'Diplomate, Example Board',
   practiceStartYear: 2012,
   background: 'Synthetic background text.',
   photoUrl: 'https://example.test/ana.jpg',
   consultationFee: '800.00',
   isActive: true,
   ...overrides,
});

describe('Doctor Profile (signed-in only)', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(() => {
      resetMocks();
      // 2026-12-31 17:00 UTC is already 2027-01-01 in Manila; only Date is faked.
      jest.useFakeTimers({
         now: new Date('2026-12-31T17:00:00Z'),
         doNotFake: [
            'hrtime',
            'nextTick',
            'performance',
            'queueMicrotask',
            'requestAnimationFrame',
            'cancelAnimationFrame',
            'requestIdleCallback',
            'cancelIdleCallback',
            'setImmediate',
            'clearImmediate',
            'setInterval',
            'clearInterval',
            'setTimeout',
            'clearTimeout',
         ],
      });
   });
   afterEach(() => {
      jest.useRealTimers();
   });

   // Signed in as `user`; verifyToken loads the user before the profile query.
   const getProfile = (id, user = patient) =>
      fetch(`${ctx.baseUrl}/doctors/${id}`, {
         headers: { cookie: cookieFor(user) },
      });

   it('requires sign-in to see a Doctor Profile', async () => {
      const res = await fetch(`${ctx.baseUrl}/doctors/7`);

      expect(res.status).toBe(401);
      expect(mockQueryQueue).toHaveLength(0);
   });

   it('no longer lists doctors publicly', async () => {
      expect((await fetch(`${ctx.baseUrl}/doctors`)).status).toBe(404);
      mockQueryQueue.push([patient]);
      expect(
         (
            await fetch(`${ctx.baseUrl}/doctors`, {
               headers: { cookie: cookieFor(patient) },
            })
         ).status,
      ).toBe(404);
   });

   it('shows a Doctor Profile to signed-in staff too', async () => {
      mockQueryQueue.push([staff], [practitioner({ id: 7 })]);
      expect((await getProfile(7, staff)).status).toBe(200);
   });

   it('shows a Doctor Profile without internal fields', async () => {
      mockQueryQueue.push([patient], [practitioner({ id: 7 })]);
      const res = await getProfile(7);

      expect(res.status).toBe(200);
      const { doctor } = await readJson(res);
      expect(doctor).toEqual({
         id: 7,
         first_name: 'Ana',
         last_name: 'Synthetic',
         specialty: 'Internal Medicine',
         education: 'MD, Example College of Medicine',
         prc_license_number: '0123456',
         board_certifications: 'Diplomate, Example Board',
         practice_start_year: 2012,
         years_of_experience: 15,
         background: 'Synthetic background text.',
         photo_url: 'https://example.test/ana.jpg',
         consultation_fee: '800.00',
      });
      expect(JSON.stringify(doctor)).not.toContain('9990001111');
   });

   it('works out years of experience from the practice start year in Manila', async () => {
      mockQueryQueue.push(
         [patient],
         [practitioner({ practiceStartYear: null })],
      );
      const { doctor } = await readJson(await getProfile(1));

      expect(doctor.years_of_experience).toBeNull();
   });

   it('hides nurses and inactive physicians from the Doctor Profile route', async () => {
      mockQueryQueue.push(
         [patient],
         [practitioner({ id: 2, profession: 'nurse' })],
      );
      expect((await getProfile(2)).status).toBe(404);

      mockQueryQueue.push(
         [patient],
         [practitioner({ id: 4, isActive: false })],
      );
      expect((await getProfile(4)).status).toBe(404);

      mockQueryQueue.push([patient], []);
      expect((await getProfile(99)).status).toBe(404);
   });

   it('rejects a malformed doctor id', async () => {
      mockQueryQueue.push([patient]);
      expect((await getProfile('abc')).status).toBe(400);
   });
});
