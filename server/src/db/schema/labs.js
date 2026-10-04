import {
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { appointments } from './appointments.js';
import { patients } from './patients.js';

export const labs = pgTable('labs', {
   id: serial('id').primaryKey(),
   patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id),
   appointmentId: integer('appointment_id').references(() => appointments.id),
   testName: varchar('test_name', { length: 150 }).notNull(),
   resultValue: varchar('result_value', { length: 100 }),
   unit: varchar('unit', { length: 30 }),
   referenceRange: varchar('reference_range', { length: 100 }),
   resultDate: timestamp('result_date', { withTimezone: true }).notNull(),
});
