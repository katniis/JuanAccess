import { Resend } from 'resend';

export const isEmailDeliveryEnabled = () =>
   process.env.EMAIL_FEATURES_ENABLED === 'true';

const hasResendConfiguration = () =>
   Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());

export const isResendConfigured = () =>
   isEmailDeliveryEnabled() && hasResendConfiguration();

export async function sendEmail({ idempotencyKey, ...message }) {
   if (!isEmailDeliveryEnabled()) throw new Error('email_features_disabled');
   if (!hasResendConfiguration()) throw new Error('resend_not_configured');
   const resend = new Resend(process.env.RESEND_API_KEY);
   const { data, error } = await resend.emails.send(
      { from: process.env.MAIL_FROM, ...message },
      idempotencyKey ? { idempotencyKey } : undefined,
   );
   if (error)
      throw Object.assign(new Error(error.message), { code: error.name });
   return data;
}
