import { integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { patients } from './patients.js';

export const equipment = pgTable('equipment', {
   id: serial('id').primaryKey(),

   name: varchar('name', {
      length: 100,
   }).notNull(),

   equipmentType: varchar('equipment_type', {
      length: 50,
   }),

   roomID: integer('patient_id').references(() => patients.id),
});
