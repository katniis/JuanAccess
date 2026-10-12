import { and, asc, eq, lte, or, isNull } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { db } from '../db/index.js';
import { notifications } from '../db/schema/notifications.js';
import { users } from '../db/schema/users.js';
import { recordAudit } from './audit.service.js';

export async function insertNotification(tx, { userId, type, message }) {
   const [notification] = await tx
      .insert(notifications)
      .values({ userId, type, message })
      .returning();
   return notification;
}

function createTransport() {
   if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) return null;
   return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER
         ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
         : undefined,
   });
}

export async function sendPendingNotificationEmails(limit = 25) {
   const transport = createTransport();
   if (!transport) return { sent: 0, skipped: true };

   const rows = await db
      .select({ notification: notifications, email: users.email })
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
         ),
      )
      .orderBy(asc(notifications.createdAt))
      .limit(limit);

   let sent = 0;
   for (const row of rows) {
      const attempt = (row.notification.emailAttempts || 0) + 1;
      try {
         await transport.sendMail({
            from: process.env.MAIL_FROM,
            to: row.email,
            subject: `Clinic notification: ${row.notification.type}`,
            text: row.notification.message,
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
         const delayMs = Math.min(
            60 * 60 * 1000,
            2 ** Math.min(attempt, 8) * 1000,
         );
         await db
            .update(notifications)
            .set({
               emailStatus: 'failed',
               emailAttempts: attempt,
               emailLastError: String(
                  error?.message || 'Email delivery failed',
               ).slice(0, 500),
               emailNextAttemptAt: new Date(Date.now() + delayMs),
            })
            .where(eq(notifications.id, row.notification.id));
         void recordAudit({
            entityType: 'notification',
            entityId: row.notification.id,
            action: 'email_delivery_failed',
            newValue: {
               attempt,
               error: String(error?.message || 'Email delivery failed').slice(
                  0,
                  120,
               ),
            },
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
