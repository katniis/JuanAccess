import { sql } from 'drizzle-orm';
import {
   check,
   index,
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const accountActionTokens = pgTable(
   'account_action_tokens',
   {
      id: serial('id').primaryKey(),
      userId: integer('user_id')
         .notNull()
         .references(() => users.id, { onDelete: 'cascade' }),
      purpose: varchar('purpose', { length: 30 }).notNull(),
      tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
      pendingEmail: varchar('pending_email', { length: 255 }),
      expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
      consumedAt: timestamp('consumed_at', { withTimezone: true }),
      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      check(
         'account_action_tokens_purpose_check',
         sql`${table.purpose} IN ('password_reset', 'email_change')`,
      ),
      check(
         'account_action_tokens_email_check',
         sql`(${table.purpose} = 'email_change' AND ${table.pendingEmail} IS NOT NULL) OR (${table.purpose} = 'password_reset' AND ${table.pendingEmail} IS NULL)`,
      ),
      index('account_action_tokens_user_purpose_idx').on(
         table.userId,
         table.purpose,
      ),
   ],
);
