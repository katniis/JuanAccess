import { sql } from 'drizzle-orm';
import {
   check,
   integer,
   pgTable,
   serial,
   timestamp,
   unique,
   varchar,
} from 'drizzle-orm/pg-core';
import { appointments } from './appointments.js';
import { users } from './users.js';

export const priorAuthorizations = pgTable(
   'prior_authorizations',
   {
      id: serial('id').primaryKey(),
      appointmentId: integer('appointment_id')
         .notNull()
         .references(() => appointments.id),
      status: varchar('status', { length: 20 }).notNull(),
      updatedBy: integer('updated_by').references(() => users.id),
      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      unique('prior_authorizations_appointment_unique').on(table.appointmentId),
      check(
         'prior_authorizations_status_check',
         sql`${table.status} IN ('not_required', 'needs_draft', 'drafted', 'submitted', 'approved', 'denied', 'appealed')`,
      ),
   ],
);
