import { date, integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { patients } from './patients.js';
import { providers } from './providers.js';

export const medications = pgTable('medications', {
   id: serial('id').primaryKey(),
   patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id),
   medicationName: varchar('medication_name', { length: 150 }).notNull(),
   dose: varchar('dose', { length: 100 }),
   startDate: date('start_date').notNull(),
   endDate: date('end_date'),
   prescribingProviderId: integer('prescribing_provider_id').references(
      () => providers.id,
   ),
});
