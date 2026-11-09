import jwt from 'jsonwebtoken';
import {
   mockQueryQueue,
   mockSendEmail,
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
const token = jwt.sign({ id: admin.id }, secret);

describe('staff invitations', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('keeps the invitation link available when Resend delivery fails', async () => {
      const invitation = {
         id: 71,
         email: 'new-staff@example.test',
         expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };
      mockQueryQueue.push([admin], [], [invitation]);
      mockSendEmail.mockRejectedValueOnce(new Error('provider unavailable'));
      const res = await fetch(`${ctx.baseUrl}/staff/admin/invitations`, {
         method: 'POST',
         headers: {
            cookie: `token=${token}`,
            'content-type': 'application/json',
         },
         body: JSON.stringify({
            email: invitation.email,
            role: 'staff',
            first_name: 'New',
            last_name: 'Staff',
         }),
      });

      expect(res.status).toBe(201);
      const body = await readJson(res);
      expect(body.invitation_token).toMatch(/^[a-f0-9]{64}$/);
      expect(body.email_sent).toBe(false);
      expect(body.invitation.email).toBe(invitation.email);
   });
});
