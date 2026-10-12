import jwt from 'jsonwebtoken';
import {
   mockQueryQueue,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;

describe('notification delivery status', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('shows safe SMTP configuration and delivery counts to staff admins', async () => {
      const admin = {
         id: 9,
         email: 'admin@example.test',
         role: 'staff_admin',
         patientId: null,
         providerId: null,
      };
      mockQueryQueue.push(
         [admin],
         [
            { emailStatus: 'pending' },
            { emailStatus: 'sent' },
            { emailStatus: 'failed' },
         ],
      );
      const res = await fetch(`${ctx.baseUrl}/notifications/email/status`, {
         headers: { cookie: `token=${jwt.sign({ id: admin.id }, secret)}` },
      });
      expect(res.status).toBe(200);
      expect(await readJson(res)).toMatchObject({
         smtpConfigured: false,
         counts: { pending: 1, sent: 1, failed: 1 },
      });
   });
});
