import jwt from 'jsonwebtoken';
import {
   mockQueryQueue,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;

const patientUser = {
   id: 1,
   email: 'patient@example.test',
   role: 'patient',
   patientId: 10,
   providerId: null,
   displayName: 'Patient User',
};

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
   providerId: 1,
   displayName: 'Staff Admin User',
};

const token = (user) => jwt.sign({ id: user.id }, secret);
const authHeader = (user) => ({ cookie: `token=${token(user)}` });

describe('Staff Backend Routes & Controller', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   // ==========================================
   // 1. Role Guards & Authentication
   // ==========================================
   describe('Authentication & Role Guards', () => {
      it('blocks unauthenticated requests to staff routes', async () => {
         const res = await fetch(`${ctx.baseUrl}/staff/dashboard`);
         expect(res.status).toBe(401);
      });

      it('blocks patient accounts from accessing staff routes', async () => {
         mockQueryQueue.push([patientUser]);
         const res = await fetch(`${ctx.baseUrl}/staff/dashboard`, {
            headers: authHeader(patientUser),
         });
         expect(res.status).toBe(403);
         const body = await readJson(res);
         expect(body.error).toMatch(/staff access required/i);
      });

      it('blocks basic staff from endpoints requiring staff_admin', async () => {
         mockQueryQueue.push([staffUser]);
         const res = await fetch(`${ctx.baseUrl}/staff/prior-auth/1/submit`, {
            method: 'POST',
            headers: {
               ...authHeader(staffUser),
               'content-type': 'application/json',
            },
         });
         expect(res.status).toBe(403);
         const body = await readJson(res);
         expect(body.error).toMatch(/staff administrator access required/i);
      });
   });

   // ==========================================
   // 2. Dashboard
   // ==========================================
   describe('Staff Dashboard', () => {
      it('returns daily snapshot counts and appointments list', async () => {
         mockQueryQueue.push(
            [staffUser], // auth
            [{ count: 5 }], // today appointments
            [{ count: 2 }], // pending prior auths
            [{ count: 1 }], // pending appeals
            [{ count: 3 }], // open waitlist
            [
               {
                  id: 101,
                  scheduledStart: new Date().toISOString(),
                  patientFirstName: 'John',
                  patientLastName: 'Doe',
               },
            ], // today appointments list
         );

         const res = await fetch(`${ctx.baseUrl}/staff/dashboard`, {
            headers: authHeader(staffUser),
         });
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.snapshot.todayAppointmentsCount).toBe(5);
         expect(body.snapshot.pendingPriorAuthsCount).toBe(2);
         expect(body.snapshot.pendingAppealsCount).toBe(1);
         expect(body.snapshot.openWaitlistSlotsCount).toBe(3);
         expect(body.todayAppointments).toHaveLength(1);
      });
   });

   // ==========================================
   // 3. Doctors & Schedules
   // ==========================================
   describe('Doctor Search & Schedule', () => {
      it('lists doctors with weekly availability', async () => {
         const doctors = [
            {
               id: 1,
               firstName: 'Amanda',
               lastName: 'Torres',
               specialty: 'Internal Medicine',
            },
         ];
         const avail = [
            {
               providerId: 1,
               dayOfWeek: 1,
               startTime: '08:00',
               endTime: '16:00',
            },
         ];

         mockQueryQueue.push([staffUser], doctors, avail);
         const res = await fetch(`${ctx.baseUrl}/staff/doctors?search=Torres`, {
            headers: authHeader(staffUser),
         });
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.doctors).toHaveLength(1);
         expect(body.doctors[0].availability).toHaveLength(1);
      });

      it('fetches schedule for a provider', async () => {
         const schedule = [
            {
               id: 201,
               scheduledStart: '2026-10-04T09:00:00.000Z',
               visitTypeName: 'Follow-up',
               patientFirstName: 'Alice',
            },
         ];

         mockQueryQueue.push([staffUser], schedule);
         const res = await fetch(
            `${ctx.baseUrl}/staff/doctors/1/schedule?date=2026-10-04`,
            {
               headers: authHeader(staffUser),
            },
         );
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.schedule).toHaveLength(1);
         expect(body.schedule[0].visitTypeName).toBe('Follow-up');
      });
   });

   // ==========================================
   // 4. Patient Search & Pre-Visit Clinical Data
   // ==========================================
   describe('Patient Search & Pre-Visit Clinical Data', () => {
      it('searches patients by name or ID', async () => {
         const patientsList = [{ id: 10, firstName: 'Bob', lastName: 'Smith' }];
         mockQueryQueue.push([staffUser], patientsList);
         const res = await fetch(`${ctx.baseUrl}/staff/patients?search=Bob`, {
            headers: authHeader(staffUser),
         });
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.patients).toEqual(patientsList);
      });

      it('fetches pre-visit clinical data with fallback message for new patient', async () => {
         const appt = {
            id: 301,
            patientId: 20,
            isNewPatient: true,
            intakeReasonNote: 'Knee pain after running',
            visitTypeName: 'MRI - Knee',
            patientFirstName: 'Charlie',
         };

         mockQueryQueue.push(
            [staffUser],
            [appt], // appointment query
            [], // conditions
            [], // chartNotes
            [], // labs
            [], // medications
         );

         const res = await fetch(
            `${ctx.baseUrl}/staff/appointments/301/pre-visit-data`,
            {
               headers: authHeader(staffUser),
            },
         );
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.isFallbackNotice).toBe(true);
         expect(body.fallbackSummary).toContain(
            'New patient — no prior chart history available',
         );
         expect(body.fallbackSummary).toContain('Knee pain after running');
      });

      it('fetches pre-visit clinical data with raw medical records for established patient', async () => {
         const appt = {
            id: 302,
            patientId: 21,
            isNewPatient: false,
            intakeReasonNote: null,
            visitTypeName: 'Follow-up',
         };
         const conditionsList = [
            { id: 1, conditionCode: 'M23.2', description: 'Meniscus tear' },
         ];
         const notesList = [
            {
               id: 1,
               noteText: 'Patient recovering well',
               encounterDate: new Date(),
            },
         ];

         mockQueryQueue.push(
            [staffUser],
            [appt],
            conditionsList,
            notesList,
            [],
            [],
         );

         const res = await fetch(
            `${ctx.baseUrl}/staff/appointments/302/pre-visit-data`,
            {
               headers: authHeader(staffUser),
            },
         );
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.isFallbackNotice).toBe(false);
         expect(body.clinicalData.conditions).toHaveLength(1);
         expect(body.clinicalData.recentEncounters).toHaveLength(1);
      });
   });

   // ==========================================
   // 5. Slots, Utilization & Cancellation
   // ==========================================
   describe('Slot Management & Utilization', () => {
      it('fetches resource utilization summary', async () => {
         const roomsList = [{ id: 1, name: 'Exam 1', roomType: 'exam' }];
         const eqList = [{ id: 1, name: 'MRI Machine' }];
         const provList = [{ id: 1, firstName: 'Amanda', lastName: 'Torres' }];
         const apptsList = [
            {
               id: 401,
               roomId: 1,
               equipmentId: 1,
               providerId: 1,
               scheduledStart: '2026-10-04T09:00:00.000Z',
               scheduledEnd: '2026-10-04T09:45:00.000Z',
               status: 'scheduled',
               visitTypeName: 'MRI - Knee',
            },
         ];
         const avail = [
            {
               providerId: 1,
               dayOfWeek: 0,
               startTime: '08:00',
               endTime: '16:00',
            },
         ];

         mockQueryQueue.push(
            [staffUser],
            roomsList,
            eqList,
            provList,
            apptsList,
            avail,
         );
         const res = await fetch(
            `${ctx.baseUrl}/staff/slots/utilization?date=2026-10-04`,
            {
               headers: authHeader(staffUser),
            },
         );
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.totalBookedAppointments).toBe(1);
         expect(body.rooms[0].bookedMinutes).toBe(45);
      });

      it('cancels appointment as staff override', async () => {
         const appt = {
            id: 401,
            status: 'scheduled',
            providerId: 1,
            visitTypeId: 1,
            roomId: 1,
            equipmentId: null,
            scheduledStart: new Date(),
            scheduledEnd: new Date(),
         };

         mockQueryQueue.push(
            [staffUser],
            [appt], // select appointment
            [{ id: 401, status: 'cancelled' }], // update appointment
            [], // select waitlist offer
            [{ specialty: 'Internal Medicine' }], // provider
            [{ id: 1, durationMinutes: 30 }], // visitType
            [], // waitlist candidates
         );

         const res = await fetch(
            `${ctx.baseUrl}/staff/appointments/401/cancel`,
            {
               method: 'PATCH',
               headers: authHeader(staffUser),
            },
         );
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.message).toMatch(/cancelled successfully/i);
      });

      it('monitors waitlist entries', async () => {
         const waitlist = [
            { id: 1, patientFirstName: 'Dan', status: 'waiting' },
         ];
         mockQueryQueue.push([staffUser], waitlist);
         const res = await fetch(
            `${ctx.baseUrl}/staff/waitlist?status=waiting`,
            {
               headers: authHeader(staffUser),
            },
         );
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.waitlist).toHaveLength(1);
      });
   });

   // ==========================================
   // 6. Prior Authorization Queue
   // ==========================================
   describe('Prior Authorization Queue', () => {
      it('fetches prior authorization queue items', async () => {
         const items = [
            { id: 10, status: 'needs_draft', visitTypeName: 'MRI - Knee' },
         ];
         mockQueryQueue.push([staffUser], items);
         const res = await fetch(
            `${ctx.baseUrl}/staff/prior-auth?status=needs_draft`,
            {
               headers: authHeader(staffUser),
            },
         );
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.priorAuthorizations).toHaveLength(1);
      });

      it('allows basic staff to edit prior authorization justification', async () => {
         const existing = { id: 10, status: 'needs_draft' };
         const updated = {
            id: 10,
            status: 'drafted',
            justificationText: 'Clinical symptoms persistent for 6 weeks.',
         };

         mockQueryQueue.push([staffUser], [existing], [updated]);
         const res = await fetch(`${ctx.baseUrl}/staff/prior-auth/10/draft`, {
            method: 'PATCH',
            headers: {
               ...authHeader(staffUser),
               'content-type': 'application/json',
            },
            body: JSON.stringify({
               justification_text: 'Clinical symptoms persistent for 6 weeks.',
            }),
         });

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.priorAuthorization.status).toBe('drafted');
      });

      it('allows staff_admin to submit prior authorization to mock insurer', async () => {
         const priorAuth = {
            id: 10,
            status: 'drafted',
            justificationText: 'Chart justification',
            appointmentId: 100,
            visitTypeId: 3,
            patientId: 25,
         };
         const updatedAuth = {
            id: 10,
            status: 'denied',
            denialReason: 'Documentation does not satisfy criteria',
         };

         mockQueryQueue.push([adminUser], [priorAuth], [updatedAuth]);
         const res = await fetch(`${ctx.baseUrl}/staff/prior-auth/10/submit`, {
            method: 'POST',
            headers: {
               ...authHeader(adminUser),
               'content-type': 'application/json',
            },
            body: JSON.stringify({ mock_outcome: 'denied' }),
         });

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.message).toContain('outcome is denied');
         expect(body.priorAuthorization.status).toBe('denied');
      });

      it('allows staff_admin to manually record prior-auth decision', async () => {
         const existing = { id: 10, status: 'submitted' };
         const updated = { id: 10, status: 'approved' };
         mockQueryQueue.push([adminUser], [existing], [updated]);

         const res = await fetch(
            `${ctx.baseUrl}/staff/prior-auth/10/decision`,
            {
               method: 'PATCH',
               headers: {
                  ...authHeader(adminUser),
                  'content-type': 'application/json',
               },
               body: JSON.stringify({ status: 'approved' }),
            },
         );

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.priorAuthorization.status).toBe('approved');
      });
   });

   // ==========================================
   // 7. Appeals Queue
   // ==========================================
   describe('Appeals Queue Workflow', () => {
      it('creates appeal for denied prior authorization', async () => {
         const priorAuth = {
            id: 12,
            status: 'denied',
            justificationText: 'Original justification',
            appointmentId: 50,
            visitTypeId: 3,
            patientId: 10,
         };
         const guideline = {
            id: 1,
            title: 'Knee Pain Imaging Appropriateness',
         };
         const createdAppeal = {
            id: 1,
            priorAuthorizationId: 12,
            guidelineId: 1,
            status: 'drafted',
            appealLetterText: 'Draft letter citing ACR criteria.',
         };

         mockQueryQueue.push(
            [staffUser],
            [priorAuth],
            [], // existing appeal check
            [guideline], // auto-match guideline
            [createdAppeal], // insert appeal
            [{ id: 12, status: 'appealed' }], // update prior auth
         );

         const res = await fetch(`${ctx.baseUrl}/staff/appeals`, {
            method: 'POST',
            headers: {
               ...authHeader(staffUser),
               'content-type': 'application/json',
            },
            body: JSON.stringify({
               prior_authorization_id: 12,
               appeal_letter_text: 'Draft letter citing ACR criteria.',
            }),
         });

         expect(res.status).toBe(201);
         const body = await readJson(res);
         expect(body.appeal.status).toBe('drafted');
      });

      it('fetches appeal details with guideline excerpt and chart justification', async () => {
         const appealDetail = {
            id: 1,
            status: 'drafted',
            guidelineTitle: 'Knee Pain Imaging Appropriateness',
            guidelineExcerpt: 'MRI is appropriate after 6 weeks...',
            priorAuthDenialReason: 'Insufficient trial period',
            priorAuthJustification: 'Symptoms persist for 6 weeks',
            appealLetterText: 'Appeal letter text...',
         };

         mockQueryQueue.push([staffUser], [appealDetail]);
         const res = await fetch(`${ctx.baseUrl}/staff/appeals/1`, {
            headers: authHeader(staffUser),
         });

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.appeal.guidelineTitle).toBe(
            'Knee Pain Imaging Appropriateness',
         );
         expect(body.appeal.priorAuthDenialReason).toBe(
            'Insufficient trial period',
         );
      });

      it('allows basic staff to update appeal draft letter', async () => {
         const existing = { id: 1, status: 'drafted' };
         const updated = {
            id: 1,
            status: 'drafted',
            appealLetterText: 'Updated clinical appeal letter.',
         };

         mockQueryQueue.push([staffUser], [existing], [updated]);
         const res = await fetch(`${ctx.baseUrl}/staff/appeals/1`, {
            method: 'PATCH',
            headers: {
               ...authHeader(staffUser),
               'content-type': 'application/json',
            },
            body: JSON.stringify({
               appeal_letter_text: 'Updated clinical appeal letter.',
            }),
         });

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.appeal.appealLetterText).toBe(
            'Updated clinical appeal letter.',
         );
      });

      it('allows staff_admin to submit appeal to mock insurer', async () => {
         const appealRecord = {
            id: 1,
            status: 'drafted',
            priorAuthorizationId: 12,
            appealLetterText: 'Comprehensive appeal letter.',
         };
         const updatedAppeal = { id: 1, status: 'approved' };

         mockQueryQueue.push(
            [adminUser],
            [appealRecord],
            [updatedAppeal], // update appeal
            [{ id: 12, status: 'approved' }], // update prior auth
         );

         const res = await fetch(`${ctx.baseUrl}/staff/appeals/1/submit`, {
            method: 'POST',
            headers: {
               ...authHeader(adminUser),
               'content-type': 'application/json',
            },
            body: JSON.stringify({ mock_outcome: 'approved' }),
         });

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.message).toContain('outcome is approved');
         expect(body.appeal.status).toBe('approved');
      });
   });

   // ==========================================
   // 8. Clinical Guidelines
   // ==========================================
   describe('Clinical Guidelines', () => {
      it('lists clinical guidelines', async () => {
         const guidelines = [
            {
               id: 1,
               title: 'Knee Pain Imaging Appropriateness',
               applicableVisitTypeId: 3,
            },
         ];
         mockQueryQueue.push([staffUser], guidelines);

         const res = await fetch(`${ctx.baseUrl}/staff/guidelines`, {
            headers: authHeader(staffUser),
         });
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.guidelines).toHaveLength(1);
      });

      it('allows staff_admin to create guideline', async () => {
         const newGuide = {
            id: 2,
            title: 'Cardiology Consult Appropriateness',
            excerptText: 'Symptomatic arrhythmia requires prompt consult.',
         };

         mockQueryQueue.push([adminUser], [newGuide]);
         const res = await fetch(`${ctx.baseUrl}/staff/guidelines`, {
            method: 'POST',
            headers: {
               ...authHeader(adminUser),
               'content-type': 'application/json',
            },
            body: JSON.stringify({
               title: 'Cardiology Consult Appropriateness',
               excerpt_text: 'Symptomatic arrhythmia requires prompt consult.',
            }),
         });

         expect(res.status).toBe(201);
         const body = await readJson(res);
         expect(body.guideline.title).toBe(
            'Cardiology Consult Appropriateness',
         );
      });
   });

   // ==========================================
   // 9. New Patient Insurance Verification
   // ==========================================
   describe('New Patient Insurance Verification', () => {
      it('lists unverified patient coverages', async () => {
         const unverified = [
            {
               id: 5,
               patientFirstName: 'Emma',
               status: 'unverified',
               insurerName: 'PhilHealth',
            },
         ];
         mockQueryQueue.push([staffUser], unverified);

         const res = await fetch(`${ctx.baseUrl}/staff/insurance/unverified`, {
            headers: authHeader(staffUser),
         });
         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.unverifiedCoverages).toHaveLength(1);
      });

      it('allows staff to verify insurance coverage and cascades to upcoming appointments', async () => {
         const updatedCoverage = {
            id: 5,
            patientId: 10,
            verifiedAt: new Date(),
         };

         mockQueryQueue.push(
            [staffUser],
            [updatedCoverage], // update coverage
            [], // select upcoming appointments
         );

         const res = await fetch(
            `${ctx.baseUrl}/staff/insurance/coverage/5/verify`,
            {
               method: 'PATCH',
               headers: {
                  ...authHeader(staffUser),
                  'content-type': 'application/json',
               },
               body: JSON.stringify({ status: 'active' }),
            },
         );

         expect(res.status).toBe(200);
         const body = await readJson(res);
         expect(body.message).toMatch(/verified as active/i);
      });
   });
});
