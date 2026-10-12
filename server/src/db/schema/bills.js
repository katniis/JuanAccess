import { sql } from 'drizzle-orm';
import {
   check,
   index,
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { appointments } from './appointments.js';
import { patients } from './patients.js';

export const bills = pgTable(
   'bills',
   {
      id: serial('id').primaryKey(),
      patientId: integer('patient_id')
         .notNull()
         .references(() => patients.id),
      appointmentId: integer('appointment_id').references(
         () => appointments.id,
      ),
      uploadedFileUrl: varchar('uploaded_file_url', { length: 500 }).notNull(),
      uploadDate: timestamp('upload_date', { withTimezone: true })
         .notNull()
         .defaultNow(),
      status: varchar('status', { length: 20 }).notNull().default('processing'),
   },
   (table) => [
      check(
         'bills_status_check',
         sql`${table.status} IN ('processing', 'processed', 'disputed', 'resolved')`,
      ),
      index('bills_patient_idx').on(table.patientId),
   ],
);
