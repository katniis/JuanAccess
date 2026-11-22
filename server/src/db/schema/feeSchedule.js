import { sql } from 'drizzle-orm';
import {
   check,
   integer,
   numeric,
   pgTable,
   serial,
   smallint,
   varchar,
} from 'drizzle-orm/pg-core';

// Each row is a Procedure.
export const feeSchedule = pgTable(
   'fee_schedule',
   {
      id: serial('id').primaryKey(),
      procedureCode: varchar('procedure_code', { length: 20 })
         .notNull()
         .unique(),
      description: varchar('description', { length: 255 }).notNull(),
      standardCost: numeric('standard_cost', {
         precision: 10,
         scale: 2,
      }).notNull(),
      // Days of week the Procedure is offered for APE Bookings:
      // 0 = Sunday … 6 = Saturday, matching manilaDayOfWeek().
      offeredDays: smallint('offered_days')
         .array()
         .notNull()
         .default(sql`'{}'::smallint[]`),
      // Patients the Procedure's station can take in each Arrival Window.
      capacityPerWindow: integer('capacity_per_window').notNull().default(0),
   },
   (table) => [
      check(
         'fee_schedule_capacity_per_window_check',
         sql`${table.capacityPerWindow} >= 0`,
      ),
      check(
         'fee_schedule_offered_days_check',
         sql`${table.offeredDays} <@ ARRAY[0,1,2,3,4,5,6]::smallint[]`,
      ),
   ],
);
