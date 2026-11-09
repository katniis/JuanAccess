import { jest } from '@jest/globals';

const mockSend = jest.fn();
const mockResend = jest.fn().mockImplementation(() => ({
   emails: { send: mockSend },
}));

jest.unstable_mockModule('resend', () => ({ Resend: mockResend }));
const { sendEmail } = await import('../services/email.service.js');

describe('Resend email delivery', () => {
   const originalKey = process.env.RESEND_API_KEY;
   const originalFrom = process.env.MAIL_FROM;
   const originalEmailFeaturesEnabled = process.env.EMAIL_FEATURES_ENABLED;

   beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-resend-key';
      process.env.MAIL_FROM = 'JuanAccess <noreply@example.test>';
      process.env.EMAIL_FEATURES_ENABLED = 'true';
      mockSend
         .mockReset()
         .mockResolvedValue({ data: { id: 'email-1' }, error: null });
      mockResend.mockClear();
   });

   afterAll(() => {
      if (originalKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalKey;
      if (originalFrom === undefined) delete process.env.MAIL_FROM;
      else process.env.MAIL_FROM = originalFrom;
      if (originalEmailFeaturesEnabled === undefined)
         delete process.env.EMAIL_FEATURES_ENABLED;
      else process.env.EMAIL_FEATURES_ENABLED = originalEmailFeaturesEnabled;
   });

   it('sends with the configured sender and provider idempotency key', async () => {
      await sendEmail({
         to: 'patient@example.test',
         subject: 'Account update',
         text: 'Sign in to view your update.',
         idempotencyKey: 'notification/4',
      });

      expect(mockResend).toHaveBeenCalledWith('test-resend-key');
      expect(mockSend).toHaveBeenCalledWith(
         {
            from: 'JuanAccess <noreply@example.test>',
            to: 'patient@example.test',
            subject: 'Account update',
            text: 'Sign in to view your update.',
         },
         { idempotencyKey: 'notification/4' },
      );
   });

   it('passes the same idempotency key on duplicate sends', async () => {
      const message = {
         to: 'patient@example.test',
         subject: 'Account update',
         text: 'Sign in to view your update.',
         idempotencyKey: 'notification/4',
      };
      await sendEmail(message);
      await sendEmail(message);
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(
         mockSend.mock.calls.map(([, options]) => options.idempotencyKey),
      ).toEqual(['notification/4', 'notification/4']);
   });

   it('surfaces provider failures so notification jobs can retry', async () => {
      mockSend.mockResolvedValueOnce({
         data: null,
         error: { name: 'validation_error', message: 'send failed' },
      });
      await expect(
         sendEmail({
            to: 'patient@example.test',
            subject: 'Test',
            text: 'Test',
         }),
      ).rejects.toThrow('send failed');
   });
});
