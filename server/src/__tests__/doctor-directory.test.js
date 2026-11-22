import { jest } from '@jest/globals';
import {
   mockQueryQueue,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

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

describe('public Doctor Directory', () => {
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

   it('lists only active physicians without a login', async () => {
      mockQueryQueue.push([
         practitioner({ id: 1 }),
         practitioner({ id: 2, profession: 'nurse' }),
         practitioner({ id: 3, profession: 'medical_technologist' }),
         practitioner({ id: 4, isActive: false }),
         practitioner({ id: 5, firstName: 'Ben', specialty: 'Pediatrics' }),
      ]);
      const res = await fetch(`${ctx.baseUrl}/doctors`);

      expect(res.status).toBe(200);
      const { doctors } = await readJson(res);
      expect(doctors.map((doctor) => doctor.id)).toEqual([1, 5]);
   });

   it('works out years of experience from the practice start year in Manila', async () => {
      mockQueryQueue.push([
         practitioner({ id: 1, practiceStartYear: 2012 }),
         practitioner({ id: 2, practiceStartYear: null }),
      ]);
      const { doctors } = await readJson(await fetch(`${ctx.baseUrl}/doctors`));

      expect(doctors[0].years_of_experience).toBe(15);
      expect(doctors[1].years_of_experience).toBeNull();
   });

   it('shows a Doctor Profile without internal fields', async () => {
      mockQueryQueue.push([practitioner({ id: 7 })]);
      const res = await fetch(`${ctx.baseUrl}/doctors/7`);

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
   });

   it('hides nurses and inactive physicians from the Doctor Profile route', async () => {
      mockQueryQueue.push([practitioner({ id: 2, profession: 'nurse' })]);
      expect((await fetch(`${ctx.baseUrl}/doctors/2`)).status).toBe(404);

      mockQueryQueue.push([practitioner({ id: 4, isActive: false })]);
      expect((await fetch(`${ctx.baseUrl}/doctors/4`)).status).toBe(404);

      mockQueryQueue.push([]);
      expect((await fetch(`${ctx.baseUrl}/doctors/99`)).status).toBe(404);
   });

   it('rejects a malformed doctor id', async () => {
      expect((await fetch(`${ctx.baseUrl}/doctors/abc`)).status).toBe(400);
   });
});
