import jwt from 'jsonwebtoken';
import {
   mockQueryQueue,
   postJson,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';
import { getCoverageStatusForAppointment } from '../services/insurance.service.js';

const secret = process.env.JWT_SECRET;
const patientUser = {
   id: 2,
   email: 'patient@example.test',
   role: 'patient',
   patientId: 10,
   providerId: null,
   displayName: 'Test Patient',
};
const staffUser = {
   id: 3,
   email: 'staff@example.test',
   role: 'staff',
   patientId: null,
   providerId: 4,
   displayName: 'Test Staff',
};
const patientToken = jwt.sign({ id: patientUser.id }, secret);
const staffToken = jwt.sign({ id: staffUser.id }, secret);
const authHeader = (token) => ({ cookie: `token=${token}` });

describe('insurance routes', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('requires authentication to read own coverage', async () => {
      const res = await fetch(`${ctx.baseUrl}/insurance/mine`);
      expect(res.status).toBe(401);
   });

   it('returns only the patient account coverage', async () => {
      const entries = [{ id: 5, status: 'unverified' }];
      mockQueryQueue.push([patientUser], entries);
      const res = await fetch(`${ctx.baseUrl}/insurance/mine`, {
         headers: authHeader(patientToken),
      });
      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ coverages: entries });
   });

   it('rejects coverage writes from staff', async () => {
      mockQueryQueue.push([staffUser]);
      const res = await postJson(
         ctx.baseUrl,
         '/insurance/mine',
         {},
         authHeader(staffToken),
      );
      expect(res.status).toBe(403);
   });

   it('creates patient coverage as unverified', async () => {
      const entry = { id: 5, status: 'unverified' };
      mockQueryQueue.push([patientUser], [], [{ id: 2 }], [entry]);
      const res = await postJson(
         ctx.baseUrl,
         '/insurance/mine',
         {
            insurer_name: 'Mock Health',
            plan_name: 'Test Plan',
            policy_number: 'TEST-10',
         },
         authHeader(patientToken),
      );
      expect(res.status).toBe(201);
      expect(await readJson(res)).toEqual({ coverage: entry });
   });

   it('allows staff to read a patient coverage record', async () => {
      const patient = { id: 10, firstName: 'Test', lastName: 'Patient' };
      const entries = [{ id: 5, status: 'active' }];
      mockQueryQueue.push([staffUser], [patient], entries);
      const res = await fetch(`${ctx.baseUrl}/insurance/patients/10`, {
         headers: authHeader(staffToken),
      });
      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ patient, coverages: entries });
   });

   it('records staff verification and refreshes future appointments', async () => {
      const updated = {
         id: 5,
         patientId: 10,
         verifiedAt: new Date().toISOString(),
      };
      mockQueryQueue.push([staffUser], [updated], []);
      const res = await fetch(`${ctx.baseUrl}/insurance/coverage/5/verify`, {
         method: 'PATCH',
         headers: {
            ...authHeader(staffToken),
            'content-type': 'application/json',
         },
         body: JSON.stringify({ status: 'active' }),
      });
      expect(res.status).toBe(200);
      expect((await readJson(res)).coverage).toMatchObject({
         id: 5,
         status: 'active',
      });
   });
});

describe('appointment coverage status resolution', () => {
   const appointmentDate = new Date('2026-10-05T10:00:00+08:00');
   const transactionFor = (rows) => {
      const query = {
         from: () => query,
         where: () => query,
         orderBy: () => query,
         then: (resolve) => Promise.resolve(rows).then(resolve),
      };
      return { select: () => query };
   };

   it('does not treat expired unverified coverage as current', async () => {
      const status = await getCoverageStatusForAppointment(
         transactionFor([
            {
               status: 'unverified',
               coverageStart: '2026-09-01',
               coverageEnd: '2026-10-04',
            },
         ]),
         10,
         appointmentDate,
      );
      expect(status).toBe('inactive');
   });

   it('returns active for coverage effective on the appointment date', async () => {
      const status = await getCoverageStatusForAppointment(
         transactionFor([
            {
               status: 'active',
               coverageStart: '2026-10-01',
               coverageEnd: null,
            },
         ]),
         10,
         appointmentDate,
      );
      expect(status).toBe('active');
   });
});
