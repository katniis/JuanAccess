import {
   integer,
   pgTable,
   serial,
   check,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { patients } from './patients.js';
import { providers } from './providers.js';
import { rooms } from './rooms.js';
import { equipment } from './equipments.js';
import { visitTypes } from './visitTypes.js';

export const appointments = pgTable(
   'appointments',
   {
      id: serial('id').primaryKey(),

      patientId: integer('patient_id').references(() => patients.id),

      providerId: integer('provider_id').references(() => providers.id),

      roomId: integer('room_id').references(() => rooms.id),

      equipmentId: integer('equipment_id').references(() => equipment.id),

      visitTypeId: integer('visit_type_id').references(() => visitTypes.id),

      scheduledStart: timestamp('scheduled_start').notNull(),

      scheduledEnd: timestamp('scheduled_end').notNull(),

      status: varchar('status', {
         length: 20,
      })
         .notNull()
         .default('scheduled'),

      insuranceStatus: varchar('insurance_status', { length: 20 })
         .notNull()
         .default('unverified'),

      createdAt: timestamp('created_at').notNull().defaultNow(),

      updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
