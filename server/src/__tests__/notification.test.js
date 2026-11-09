import jwt from 'jsonwebtoken';
import {
   mockMutationLog,
   mockQueryQueue,
   mockResendConfig,
   mockSendEmail,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';
const { insertNotification, sendPendingNotificationEmails } =
   await import('../services/notification.service.js');

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

   it('shows safe Resend configuration and delivery counts to staff admins', async () => {
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
         resendConfigured: false,
         counts: { pending: 1, sent: 1, failed: 1 },
      });
   });

   it('uses generic email content and a stable idempotency key for notices', async () => {
      mockResendConfig.configured = true;
      mockQueryQueue.push(
         [
            {
               notification: {
                  id: 42,
                  type: 'bill_created',
                  message: 'Patient diagnosis and appointment details',
                  emailAttempts: 0,
               },
               email: 'patient@example.test',
            },
         ],
         [],
      );
      const result = await sendPendingNotificationEmails();

      expect(result).toEqual({ sent: 1, skipped: false });
      expect(mockSendEmail).toHaveBeenCalledWith(
         expect.objectContaining({
            to: 'patient@example.test',
            idempotencyKey: 'notification/42',
            text: expect.not.stringContaining('Patient diagnosis'),
         }),
      );
      expect(mockMutationLog).toContainEqual({
         set: expect.objectContaining({
            emailStatus: 'sent',
            emailAttempts: 1,
         }),
      });
   });

   it('marks failed notifications for retry and reuses the idempotency key', async () => {
      mockResendConfig.configured = true;
      const row = {
         notification: {
            id: 43,
            type: 'appointment',
            message: 'private',
            emailAttempts: 0,
         },
         email: 'patient@example.test',
      };
      mockSendEmail.mockRejectedValueOnce(new Error('network timeout'));
      mockQueryQueue.push([row], []);
      const failed = await sendPendingNotificationEmails();

      expect(failed).toEqual({ sent: 0, skipped: false });
      expect(mockMutationLog).toContainEqual({
         set: expect.objectContaining({
            emailStatus: 'failed',
            emailAttempts: 1,
            emailLastError: 'resend_timeout',
         }),
      });

      resetMocks();
      mockResendConfig.configured = true;
      mockQueryQueue.push(
         [{ ...row, notification: { ...row.notification, emailAttempts: 1 } }],
         [],
      );
      await sendPendingNotificationEmails();
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
         expect.objectContaining({ idempotencyKey: 'notification/43' }),
      );
   });

   it('skips notification email creation when a patient disables email', async () => {
      let inserted;
      const query = {
         values: (values) => {
            inserted = values;
            return query;
         },
         returning: async () => [inserted],
      };
      await insertNotification(
         { insert: () => query },
         {
            userId: 7,
            type: 'appointment',
            message: 'In-app detail',
            emailEnabled: false,
         },
      );
      expect(inserted).toMatchObject({
         userId: 7,
         message: 'In-app detail',
         emailStatus: 'skipped',
      });
   });
});
