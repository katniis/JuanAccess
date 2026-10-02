import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
   id: serial('id').primaryKey(),

   name: varchar('name', {
      length: 100,
   }).notNull(),

   roomType: varchar('room_type', {
      length: 50,
   }),
});
