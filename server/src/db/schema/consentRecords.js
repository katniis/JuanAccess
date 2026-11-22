import {
   index,
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const consentRecords = pgTable(
   'consent_records',
   {
      id: serial('id').primaryKey(),
      userId: integer('user_id')
         .notNull()
         .references(() => users.id),
      policyVersion: varchar('policy_version', { length: 50 }).notNull(),
      acceptedAt: timestamp('accepted_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      index('consent_records_user_version_idx').on(
         table.userId,
         table.policyVersion,
      ),
   ],
);
