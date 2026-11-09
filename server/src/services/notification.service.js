import { and, asc, eq, lte, or, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications } from '../db/schema/notifications.js';
import { users } from '../db/schema/users.js';
import { recordAudit } from './audit.service.js';
import {
   isEmailDeliveryEnabled,
   isResendConfigured,
   sendEmail,
} from './email.service.js';

export async function insertNotification(
   tx,
   { userId, type, message, emailEnabled = true },
) {
   const [notification] = await tx
      .insert(notifications)
      .values({
         userId,
         type,
         message,
         emailStatus:
            emailEnabled && isEmailDeliveryEnabled() ? 'pending' : 'skipped',
      })
      .returning();
   return notification;
}

export async function notifyPatient(tx, patientId, type, message) {
   const [user] = await tx
      .select({
         id: users.id,
         emailNotificationsEnabled: users.emailNotificationsEnabled,
      })
      .from(users)
      .where(and(eq(users.patientId, patientId), eq(users.role, 'patient')))
      .limit(1);
   if (!user) return null;
   return insertNotification(tx, {
      userId: user.id,
      type,
      message,
      emailEnabled: user.emailNotificationsEnabled !== false,
   });
}

export async function getEmailDeliveryStatus() {
   const rows = await db
      .select({ emailStatus: notifications.emailStatus })
      .from(notifications);
   const counts = { pending: 0, sent: 0, failed: 0, skipped: 0 };
   for (const row of rows) {
      if (row.emailStatus in counts) counts[row.emailStatus] += 1;
   }
   return { resendConfigured: isResendConfigured(), counts };
}

function sanitizeEmailError(error) {
   const code = String(error?.code || error?.name || '').toLowerCase();
   const message = String(error?.message || '').toLowerCase();
   if (code.includes('auth') || message.includes('auth')) return 'resend_auth';
   if (code.includes('time') || message.includes('timeout'))
      return 'resend_timeout';
   return 'resend_delivery';
}

export async function sendPendingNotificationEmails(limit = 25) {
   if (!isResendConfigured()) return { sent: 0, skipped: true };

   const rows = await db
      .select({
         notification: notifications,
         email: users.email,
      })
      .from(notifications)
      .innerJoin(users, eq(users.id, notifications.userId))
      .where(
         and(
            or(
               eq(notifications.emailStatus, 'pending'),
               eq(notifications.emailStatus, 'failed'),
            ),
            or(
               isNull(notifications.emailNextAttemptAt),
               lte(notifications.emailNextAttemptAt, new Date()),
            ),
            eq(users.isActive, true),
            eq(users.emailNotificationsEnabled, true),
         ),
      )
      .orderBy(asc(notifications.createdAt))
      .limit(limit);

   let sent = 0;
   for (const row of rows) {
      const attempt = (row.notification.emailAttempts || 0) + 1;
      try {
         await sendEmail({
            to: row.email,
            subject: 'New update in your JuanAccess account',
            text: 'You have a new update in JuanAccess. Sign in to view it securely.',
            idempotencyKey: `notification/${row.notification.id}`,
         });
         await db
            .update(notifications)
            .set({
               emailStatus: 'sent',
               emailAttempts: attempt,
               emailSentAt: new Date(),
               emailLastError: null,
               emailNextAttemptAt: null,
            })
            .where(eq(notifications.id, row.notification.id));
         sent += 1;
      } catch (error) {
         const safeError = sanitizeEmailError(error);
         const delayMs = Math.min(
            60 * 60 * 1000,
            2 ** Math.min(attempt, 8) * 1000,
         );
         await db
            .update(notifications)
            .set({
               emailStatus: 'failed',
               emailAttempts: attempt,
               emailLastError: safeError,
               emailNextAttemptAt: new Date(Date.now() + delayMs),
            })
            .where(eq(notifications.id, row.notification.id));
         void recordAudit({
            entityType: 'notification',
            entityId: row.notification.id,
            action: 'email_delivery_failed',
            newValue: { attempt, error: safeError },
         });
      }
   }
   return { sent, skipped: false };
}

export async function listNotifications(userId) {
   return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(asc(notifications.createdAt));
}

export async function markNotificationRead(userId, notificationId) {
   const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
         and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId),
         ),
      )
      .returning();
   return updated || null;
}
