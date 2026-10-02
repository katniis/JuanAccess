import { integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { rooms } from './rooms.js';

export const equipment = pgTable('equipment', {
   id: serial('id').primaryKey(),

   name: varchar('name', {
      length: 100,
   }).notNull(),

   equipmentType: varchar('equipment_type', {
      length: 50,
   }),

   roomId: integer('room_id').references(() => rooms.id),
});
