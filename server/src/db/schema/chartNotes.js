import {
   integer,
   pgTable,
   serial,
   text,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { appointments } from './appointments.js';
import { patients } from './patients.js';
import { providers } from './providers.js';

export const chartNotes = pgTable('chart_notes', {
   id: serial('id').primaryKey(),
   patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id),
   appointmentId: integer('appointment_id').references(() => appointments.id),
   providerId: integer('provider_id').references(() => providers.id),
   noteText: text('note_text').notNull(),
   encounterDate: timestamp('encounter_date', { withTimezone: true }).notNull(),
   syntheaEncounterId: varchar('synthea_encounter_id', { length: 100 }),
});
