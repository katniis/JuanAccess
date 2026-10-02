import {
   date,
   index,
   integer,
   pgTable,
   serial,
   time,
   timestamp,
   varchar,
   check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { patients } from './patients.js';
import { providers } from './providers.js';
import { visitTypes } from './visitTypes.js';
import { appointments } from './appointments.js';

export const waitlistEntries = pgTable(
   'waitlist_entries',
   {
      id: serial('id').primaryKey(),
      patientId: integer('patient_id')
         .notNull()
         .references(() => patients.id),
      providerId: integer('provider_id').references(() => providers.id),
      visitTypeId: integer('visit_type_id')
         .notNull()
         .references(() => visitTypes.id),
      preferredDateStart: date('preferred_date_start').notNull(),
      preferredDateEnd: date('preferred_date_end').notNull(),
      preferredTimeStart: time('preferred_time_start'),
      preferredTimeEnd: time('preferred_time_end'),
      status: varchar('status', { length: 20 }).notNull().default('waiting'),
      offeredAppointmentId: integer('offered_appointment_id').references(
         () => appointments.id,
      ),
      offerExpiresAt: timestamp('offer_expires_at', { withTimezone: true }),
      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      check(
         'waitlist_entries_status_check',
         sql`${table.status} IN ('waiting', 'offered', 'confirmed', 'expired', 'cancelled')`,
      ),
      check(
         'waitlist_entries_date_range_check',
         sql`${table.preferredDateStart} <= ${table.preferredDateEnd}`,
      ),
      check(
         'waitlist_entries_time_range_check',
         sql`(${table.preferredTimeStart} IS NULL AND ${table.preferredTimeEnd} IS NULL) OR (${table.preferredTimeStart} IS NOT NULL AND ${table.preferredTimeEnd} IS NOT NULL AND ${table.preferredTimeStart} < ${table.preferredTimeEnd})`,
      ),
      index('waitlist_entries_status_created_at_idx').on(
         table.status,
         table.createdAt,
      ),
      index('waitlist_entries_offer_expiry_idx').on(
         table.status,
         table.offerExpiresAt,
      ),
   ],
);
