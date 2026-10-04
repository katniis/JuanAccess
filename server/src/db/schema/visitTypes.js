import { integer, pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';
import { equipment } from './equipments.js';

export const visitTypes = pgTable('visit_types', {
   id: serial('id').primaryKey(),

   name: varchar('name', {
      length: 150,
   }).notNull(),

   description: text('description'),

   durationMinutes: integer('duration_minutes').notNull().default(30),

   requiredSpecialty: varchar('required_specialty', {
      length: 100,
   }),

   requiredEquipmentId: integer('required_equipment_id').references(
      () => equipment.id,
   ),
});
