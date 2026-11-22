import {
   index,
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const enrolmentCodes = pgTable(
   'enrolment_codes',
   {
      id: serial('id').primaryKey(),
      userId: integer('user_id')
         .notNull()
         .references(() => users.id, { onDelete: 'cascade' }),
      codeHash: varchar('code_hash', { length: 64 }).notNull(),
      expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
      usedAt: timestamp('used_at', { withTimezone: true }),
      // Null when issued by the bootstrap script rather than a staff_admin.
      issuedByUserId: integer('issued_by_user_id').references(() => users.id, {
         onDelete: 'set null',
      }),
      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [index('enrolment_codes_user_idx').on(table.userId)],
);
