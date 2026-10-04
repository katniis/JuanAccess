import { date, integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { patients } from './patients.js';

export const conditions = pgTable('conditions', {
   id: serial('id').primaryKey(),
   patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id),
   conditionCode: varchar('condition_code', { length: 20 }).notNull(),
   description: varchar('description', { length: 255 }).notNull(),
   diagnosedDate: date('diagnosed_date'),
   resolvedDate: date('resolved_date'),
   syntheaConditionId: varchar('synthea_condition_id', { length: 100 }),
});
