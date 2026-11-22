import {
   index,
   integer,
   pgTable,
   serial,
   unique,
   varchar,
} from 'drizzle-orm/pg-core';
import { appointments } from './appointments.js';
import { feeSchedule } from './feeSchedule.js';

// The Procedures included in one APE Booking (package Procedures matching the
// patient's Sex at Birth). Station Assignment (#23) assigns a Practitioner per row.
export const apeBookingProcedures = pgTable(
   'ape_booking_procedures',
   {
      id: serial('id').primaryKey(),
      appointmentId: integer('appointment_id')
         .notNull()
         .references(() => appointments.id, { onDelete: 'cascade' }),
      feeScheduleId: integer('fee_schedule_id')
         .notNull()
         .references(() => feeSchedule.id),
      procedureCode: varchar('procedure_code', { length: 20 }).notNull(),
   },
   (table) => [
      unique().on(table.appointmentId, table.feeScheduleId),
      index('ape_booking_procedures_fee_schedule_idx').on(table.feeScheduleId),
   ],
);
