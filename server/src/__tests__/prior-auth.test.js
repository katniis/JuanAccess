import jwt from 'jsonwebtoken';
import {
   mockQueryQueue,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

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
const adminUser = { ...staffUser, id: 4, role: 'staff_admin' };
const token = (user) => jwt.sign({ id: user.id }, secret);
const authHeader = (value) => ({ cookie: `token=${value}` });

describe('prior authorization routes', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('requires authentication for patient status', async () => {
      const res = await fetch(`${ctx.baseUrl}/prior-auth/mine`);
      expect(res.status).toBe(401);
   });

   it('returns the authenticated patient appointment statuses', async () => {
      const rows = [{ appointmentId: 7, status: 'needs_draft' }];
      mockQueryQueue.push([patientUser], rows);
      const res = await fetch(`${ctx.baseUrl}/prior-auth/mine`, {
         headers: authHeader(token(patientUser)),
      });
      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ priorAuthorizations: rows });
   });

   it('allows staff to view rules', async () => {
      const rules = [{ id: 1, requiresPriorAuth: true }];
      mockQueryQueue.push([staffUser], rules);
      const res = await fetch(`${ctx.baseUrl}/prior-auth/rules`, {
         headers: authHeader(token(staffUser)),
      });
      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ rules });
   });

   it('restricts rule edits to staff admins', async () => {
      mockQueryQueue.push([staffUser]);
      const res = await fetch(`${ctx.baseUrl}/prior-auth/rules`, {
         method: 'PUT',
         headers: {
            ...authHeader(token(staffUser)),
            'content-type': 'application/json',
         },
         body: JSON.stringify({ visit_type_id: 1, requires_prior_auth: true }),
      });
      expect(res.status).toBe(403);
   });

   it('creates a generic rule as staff admin', async () => {
      const rule = {
         id: 1,
         visitTypeId: 1,
         insurancePlanId: null,
         requiresPriorAuth: true,
      };
      mockQueryQueue.push([adminUser], [{ id: 1 }], [], [rule]);
      const res = await fetch(`${ctx.baseUrl}/prior-auth/rules`, {
         method: 'PUT',
         headers: {
            ...authHeader(token(adminUser)),
            'content-type': 'application/json',
         },
         body: JSON.stringify({
            visit_type_id: 1,
            insurance_plan_id: null,
            requires_prior_auth: true,
         }),
      });
      expect(res.status).toBe(201);
      expect(await readJson(res)).toEqual({ rule });
   });

   it('allows staff to inspect appointment status', async () => {
      const record = { appointmentId: 7, status: 'needs_draft' };
      mockQueryQueue.push([staffUser], [record]);
      const res = await fetch(`${ctx.baseUrl}/prior-auth/appointments/7`, {
         headers: authHeader(token(staffUser)),
      });
      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ priorAuthorization: record });
   });

   it('allows staff to mark an authorization drafted', async () => {
      const current = { id: 8, status: 'needs_draft' };
      const updated = { id: 8, status: 'drafted' };
      mockQueryQueue.push([staffUser], [current], [updated]);
      const res = await fetch(`${ctx.baseUrl}/prior-auth/8/status`, {
         method: 'PATCH',
         headers: {
            ...authHeader(token(staffUser)),
            'content-type': 'application/json',
         },
         body: JSON.stringify({ status: 'drafted' }),
      });
      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ priorAuthorization: updated });
   });

   it('blocks basic staff from submitting an authorization', async () => {
      mockQueryQueue.push([staffUser], [{ id: 8, status: 'drafted' }]);
      const res = await fetch(`${ctx.baseUrl}/prior-auth/8/status`, {
         method: 'PATCH',
         headers: {
            ...authHeader(token(staffUser)),
            'content-type': 'application/json',
         },
         body: JSON.stringify({ status: 'submitted' }),
      });
      expect(res.status).toBe(403);
   });
});
