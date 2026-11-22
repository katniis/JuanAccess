import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const mockRecordAudit = jest.fn();
jest.unstable_mockModule('../services/audit.service.js', () => ({
   recordAudit: mockRecordAudit,
}));

const {
   startServer,
   readJson,
   getCookie,
   resetMocks,
   mockQueryQueue,
   mockMutationLog,
   postJson,
} = await import('./helpers.js');

const secret = process.env.JWT_SECRET;
const sessionFor = (id, authVersion = 0) => ({
   cookie: `token=${jwt.sign({ id, authVersion }, secret)}`,
});

const admin = {
   id: 29,
   email: 'admin@example.test',
   role: 'staff_admin',
   patientId: null,
   providerId: null,
   authVersion: 0,
};
const staff = { ...admin, id: 30, email: 'staff@example.test', role: 'staff' };
const patient = {
   ...admin,
   id: 31,
   email: 'pat@example.test',
   role: 'patient',
   patientId: 10,
};

describe('Second Factor for invited staff and staff_admin reset', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(() => {
      resetMocks();
      mockRecordAudit.mockReset();
   });

   describe('POST /auth/accept-invite', () => {
      it('sends the new staff member to Second Factor setup instead of a session', async () => {
         const invite = {
            id: 4,
            email: 'invitee@example.test',
            role: 'staff',
            firstName: 'Ina',
            lastName: 'Vitee',
         };
         mockQueryQueue.push(
            [invite],
            [],
            [{ id: 40, email: invite.email, role: 'staff', authVersion: 0 }],
            [],
         );

         const res = await postJson(ctx.baseUrl, '/auth/accept-invite', {
            token: 'a'.repeat(64),
            password: 'long-enough-pw',
         });

         expect(res.status).toBe(201);
         expect(await readJson(res)).toEqual({
            secondFactor: 'setup_required',
         });
         expect(getCookie(res, 'token')).toBeNull();
         const pending = jwt.decode(getCookie(res, 'second_factor'));
         expect(pending).toMatchObject({
            id: 40,
            purpose: 'second_factor_setup',
         });
      });
   });

   describe('POST /staff/admin/users/:id/second-factor/reset', () => {
      const reset = (id, headers) =>
         postJson(
            ctx.baseUrl,
            `/staff/admin/users/${id}/second-factor/reset`,
            {},
            headers,
         );

      it.each([
         ['staff', staff],
         ['patient', patient],
      ])('rejects a %s with 403', async (_label, user) => {
         mockQueryQueue.push([user]);
         const res = await reset(7, sessionFor(user.id));
         expect(res.status).toBe(403);
         expect(mockMutationLog).toEqual([]);
      });

      it('clears the TOTP secret and Recovery Codes, signs the target out, and audits', async () => {
         mockQueryQueue.push([admin], [{ id: 7 }], []);

         const res = await reset(7, sessionFor(admin.id));

         expect(res.status).toBe(200);
         const { set } = mockMutationLog.find((entry) => entry.set);
         expect(set).toMatchObject({
            totpSecretEncrypted: null,
            totpEnabledAt: null,
            failedLoginAttempts: 0,
            lockedUntil: null,
         });
         // authVersion is bumped with SQL, so old session tokens stop matching.
         expect(set.authVersion).toBeDefined();
         expect(mockRecordAudit).toHaveBeenCalledWith(
            expect.objectContaining({
               entityType: 'user',
               entityId: 7,
               action: 'second_factor_reset',
               changedBy: admin.id,
            }),
         );
      });

      it('returns 404 when the target is not a staff account', async () => {
         mockQueryQueue.push([admin], []);
         const res = await reset(31, sessionFor(admin.id));
         expect(res.status).toBe(404);
         expect(mockRecordAudit).not.toHaveBeenCalled();
      });

      it('rejects the target session issued before the reset', async () => {
         mockQueryQueue.push([{ ...staff, authVersion: 1 }]);
         const res = await fetch(`${ctx.baseUrl}/auth/me`, {
            headers: sessionFor(staff.id, 0),
         });
         expect(res.status).toBe(401);
      });
   });
});
