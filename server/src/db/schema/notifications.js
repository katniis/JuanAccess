import {
   boolean,
   integer,
   pgTable,
   serial,
   text,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const notifications = pgTable('notifications', {
   id: serial('id').primaryKey(),
   userId: integer('user_id')
      .notNull()
      .references(() => users.id),
   type: varchar('type', { length: 50 }).notNull(),
   message: text('message').notNull(),
   isRead: boolean('is_read').notNull().default(false),
   createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
   emailStatus: varchar('email_status', { length: 20 })
      .notNull()
      .default('pending'),
   emailAttempts: integer('email_attempts').notNull().default(0),
   emailNextAttemptAt: timestamp('email_next_attempt_at', {
      withTimezone: true,
   }),
   emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
   emailLastError: varchar('email_last_error', { length: 500 }),
});
