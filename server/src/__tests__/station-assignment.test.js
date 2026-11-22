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
const patient = { ...admin, id: 31, role: 'patient', patientId: 7 };
const cookieFor = (user) => `token=${jwt.sign({ id: user.id }, secret)}`;

describe('Station Assignment', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   const send = (user, method, path, body) =>
      fetch(`${ctx.baseUrl}${path}`, {
         method,
         headers: {
            cookie: cookieFor(user),
            'content-type': 'application/json',
         },
         body: body === undefined ? undefined : JSON.stringify(body),
      });

   describe('allowed Professions per Procedure', () => {
      const edit = (user, body) =>
         send(user, 'PATCH', '/staff/admin/reference/fee-schedule/3', body);

      it('lets a staff_admin set the Professions allowed for a Procedure', async () => {
         mockQueryQueue.push([admin], [{ id: 3 }]);
         const res = await edit(admin, {
            allowedProfessions: ['nurse', 'medical_technologist'],
         });

         expect(res.status).toBe(200);
         expect(mockMutationLog[0].set).toEqual({
            allowedProfessions: ['nurse', 'medical_technologist'],
         });
      });

      it.each([
         ['an unknown Profession', ['surgeon']],
         ['a repeated Profession', ['nurse', 'nurse']],
         ['a non-list value', 'nurse'],
      ])('rejects %s', async (_label, allowedProfessions) => {
         mockQueryQueue.push([admin]);
         const res = await edit(admin, { allowedProfessions });

         expect(res.status).toBe(400);
         expect(mockMutationLog).toHaveLength(0);
      });

      it('returns 403 when staff sets allowed Professions', async () => {
         mockQueryQueue.push([staff]);
         const res = await edit(staff, { allowedProfessions: ['nurse'] });

         expect(res.status).toBe(403);
      });
   });

   describe("today's APE queue", () => {
      const morning = {
         id: 1,
         name: 'Early',
         startTime: '07:00:00',
         endTime: '10:00:00',
      };
      const booking = (appointmentId, patientName, gender, window) => ({
         appointmentId,
         patientFirstName: patientName,
         patientLastName: 'Sample',
         gender,
         packageName: 'Basic APE',
         arrivalWindowId: window.id,
         arrivalWindowName: window.name,
         arrivalWindowStart: window.startTime,
         arrivalWindowEnd: window.endTime,
      });
      const procedure = (id, appointmentId, code, extra = {}) => ({
         id,
         appointmentId,
         procedureCode: code,
         description: `${code} test`,
         allowedProfessions: ['nurse'],
         practitionerId: null,
         practitionerFirstName: null,
         practitionerLastName: null,
         assignedAt: null,
         ...extra,
      });

      it('groups bookings by Arrival Window with the Procedures each patient still needs', async () => {
         mockQueryQueue.push(
            [staff],
            [
               booking(10, 'Ana', 'Female', morning),
               booking(11, 'Ben', null, morning),
            ],
            [
               procedure(100, 10, 'CBC'),
               procedure(101, 10, 'XRAY', {
                  practitionerId: 5,
                  practitionerFirstName: 'Nora',
                  practitionerLastName: 'Nurse',
                  assignedAt: '2026-11-22T00:00:00.000Z',
               }),
               procedure(102, 11, 'CBC'),
               procedure(103, 11, 'ECG'),
            ],
            [{ appointmentId: 11, procedureCode: 'ECG' }],
         );
         const res = await send(staff, 'GET', '/staff/ape-queue');
         const body = await readJson(res);

         expect(res.status).toBe(200);
         expect(body.windows).toHaveLength(1);
         const [window] = body.windows;
         expect(window).toMatchObject({ id: 1, name: 'Early' });
         expect(window.patients.map((p) => p.gender)).toEqual(['Female', null]);
         expect(
            window.patients.map((p) => p.remaining.map((r) => r.procedureCode)),
         ).toEqual([['CBC'], ['CBC']]);
         expect(window.patients[0].assigned).toEqual([
            expect.objectContaining({
               id: 101,
               procedureCode: 'XRAY',
               practitioner: { id: 5, name: 'Nora Nurse' },
            }),
         ]);
      });

      it('returns no windows when nobody is booked today', async () => {
         mockQueryQueue.push([staff], []);
         const res = await send(staff, 'GET', '/staff/ape-queue');

         expect(res.status).toBe(200);
         expect(await readJson(res)).toEqual({ windows: [] });
      });

      it('returns 403 for a patient', async () => {
         mockQueryQueue.push([patient]);
         const res = await send(patient, 'GET', '/staff/ape-queue');

         expect(res.status).toBe(403);
      });
   });

   describe('assigning a Practitioner to a booking Procedure', () => {
      const bookingProcedure = (extra = {}) => ({
         id: 100,
         appointmentId: 10,
         procedureCode: 'CBC',
         allowedProfessions: ['medical_technologist'],
         scheduledStart: new Date(),
         status: 'scheduled',
         ...extra,
      });
      const medTech = {
         id: 5,
         profession: 'medical_technologist',
         isActive: true,
      };
      // isOnDuty reads the date override first; these replace weekly hours.
      const onDuty = [
         { isDayOff: false, startTime: '00:00', endTime: '24:00' },
      ];
      const dayOff = [{ isDayOff: true, startTime: null, endTime: null }];
      const assign = (user, body = { practitioner_id: 5 }) =>
         send(user, 'POST', '/staff/ape-queue/procedures/100/assignment', body);

      it('assigns an on-duty Practitioner whose Profession is allowed', async () => {
         mockQueryQueue.push(
            [staff],
            [bookingProcedure()],
            [medTech],
            onDuty,
            [],
            [{ id: 1, bookingProcedureId: 100, practitionerId: 5 }],
         );
         const res = await assign(staff);

         expect(res.status).toBe(201);
         expect(mockMutationLog).toEqual([
            {
               values: {
                  bookingProcedureId: 100,
                  practitionerId: 5,
                  assignedByUserId: 30,
               },
            },
         ]);
      });

      it('replaces the current assignment when reassigning', async () => {
         mockQueryQueue.push(
            [admin],
            [bookingProcedure()],
            [medTech],
            onDuty,
            [{ id: 1, bookingProcedureId: 100, practitionerId: 4 }],
            [{ id: 2, bookingProcedureId: 100, practitionerId: 5 }],
         );
         const res = await assign(admin);

         expect(res.status).toBe(200);
         expect(await readJson(res)).toMatchObject({ practitionerId: 5 });
      });

      it.each([
         [
            'a Practitioner whose Profession is not allowed',
            [[{ ...medTech, profession: 'nurse' }]],
            /nurse may not perform CBC/,
         ],
         ['an off-duty Practitioner', [[medTech], dayOff], /not on duty/],
         [
            'an inactive Practitioner',
            [[{ ...medTech, isActive: false }]],
            /inactive/,
         ],
      ])('rejects %s', async (_label, queued, message) => {
         mockQueryQueue.push([staff], [bookingProcedure()], ...queued);
         const res = await assign(staff);

         expect(res.status).toBe(409);
         expect((await readJson(res)).error).toMatch(message);
         expect(mockMutationLog).toHaveLength(0);
      });

      it('rejects a booking that is not today', async () => {
         mockQueryQueue.push(
            [staff],
            [
               bookingProcedure({
                  scheduledStart: new Date(Date.now() + 2 * 864e5),
               }),
            ],
         );
         const res = await assign(staff);

         expect(res.status).toBe(409);
         expect(mockMutationLog).toHaveLength(0);
      });

      it('rejects a missing practitioner_id', async () => {
         mockQueryQueue.push([staff]);
         const res = await assign(staff, {});

         expect(res.status).toBe(400);
      });

      it('returns 403 for a patient', async () => {
         mockQueryQueue.push([patient]);
         const res = await assign(patient);

         expect(res.status).toBe(403);
         expect(mockMutationLog).toHaveLength(0);
      });

      it('offers only on-duty Practitioners with an allowed Profession', async () => {
         mockQueryQueue.push(
            [staff],
            [bookingProcedure()],
            [
               {
                  id: 5,
                  firstName: 'Mia',
                  lastName: 'Tech',
                  profession: 'medical_technologist',
               },
               {
                  id: 6,
                  firstName: 'Leo',
                  lastName: 'Tech',
                  profession: 'medical_technologist',
               },
            ],
            onDuty,
            dayOff,
         );
         const res = await send(
            staff,
            'GET',
            '/staff/ape-queue/procedures/100/practitioners',
         );

         expect(res.status).toBe(200);
         expect((await readJson(res)).practitioners.map((p) => p.id)).toEqual([
            5,
         ]);
      });
   });

   it('refuses to attach a Practitioner or room to an APE Booking on staff reschedule', async () => {
      mockQueryQueue.push(
         [staff],
         [
            {
               id: 10,
               apePackageId: 2,
               providerId: null,
               roomId: null,
               equipmentId: null,
               status: 'scheduled',
            },
         ],
      );
      const res = await send(
         staff,
         'PATCH',
         '/staff/appointments/10/reschedule',
         {
            new_start: '2026-12-01T00:00:00.000Z',
            new_end: '2026-12-01T03:00:00.000Z',
            provider_id: 5,
         },
      );

      expect(res.status).toBe(409);
      expect((await readJson(res)).error).toMatch(/APE Booking/);
      expect(mockMutationLog).toHaveLength(0);
   });
});
