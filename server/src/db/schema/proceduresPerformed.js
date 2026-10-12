import {
   index,
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { appointments } from './appointments.js';

export const proceduresPerformed = pgTable(
   'procedures_performed',
   {
      id: serial('id').primaryKey(),
      appointmentId: integer('appointment_id')
         .notNull()
         .references(() => appointments.id),
      procedureCode: varchar('procedure_code', { length: 20 }).notNull(),
      description: varchar('description', { length: 255 }).notNull(),
      performedAt: timestamp('performed_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      index('procedures_performed_appointment_idx').on(table.appointmentId),
   ],
);
