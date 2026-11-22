import {
   integer,
   pgTable,
   serial,
   check,
   text,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { patients } from './patients.js';
import { providers } from './providers.js';
import { rooms } from './rooms.js';
import { equipment } from './equipments.js';
import { visitTypes } from './visitTypes.js';
import { users } from './users.js';
import { apePackages } from './apePackages.js';
import { arrivalWindows } from './arrivalWindows.js';

export const appointments = pgTable(
   'appointments',
   {
      id: serial('id').primaryKey(),

      patientId: integer('patient_id')
         .notNull()
         .references(() => patients.id),

      // Null for an APE Booking until Station Assignment on the day (ADR 0002).
      providerId: integer('provider_id').references(() => providers.id),

      roomId: integer('room_id').references(() => rooms.id),

      equipmentId: integer('equipment_id').references(() => equipment.id),

      visitTypeId: integer('visit_type_id')
         .notNull()
         .references(() => visitTypes.id),

      scheduledStart: timestamp('scheduled_start', {
         withTimezone: true,
      }).notNull(),

      scheduledEnd: timestamp('scheduled_end', {
         withTimezone: true,
      }).notNull(),

      status: varchar('status', {
         length: 20,
      })
         .notNull()
         .default('scheduled'),

      insuranceStatus: varchar('insurance_status', { length: 20 })
         .notNull()
         .default('unverified'),

      cancellationReason: varchar('cancellation_reason', { length: 40 }),

      cancellationReasonText: text('cancellation_reason_text'),

      cancelledByUserId: integer('cancelled_by_user_id').references(
         () => users.id,
      ),

      cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

      cancellationLetter: text('cancellation_letter'),

      // Set only for an APE Booking (ADR 0002).
      apePackageId: integer('ape_package_id').references(() => apePackages.id),

      arrivalWindowId: integer('arrival_window_id').references(
         () => arrivalWindows.id,
      ),

      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),

      updatedAt: timestamp('updated_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },

   (table) => [
      check(
         'status_check',
         sql`${table.status} IN ('scheduled', 'completed', 'cancelled', 'no_show')`,
      ),

      check(
         'insurance_status_check',
         sql`${table.insuranceStatus} IN ('active', 'inactive', 'unverified')`,
      ),
   ],
);
