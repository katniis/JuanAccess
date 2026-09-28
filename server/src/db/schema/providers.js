import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const providers = pgTable('providers', {
   id: serial('id').primaryKey(),

   firstName: varchar('first_name', {
      length: 100,
   }).notNull(),

   lastName: varchar('last_name', {
      length: 100,
   }).notNull(),

   specialty: varchar('specialty', {
      length: 100,
   }),

   npiNumber: varchar('npi_number', {
      length: 20,
   }),

   createdAt: timestamp('created_at', {
      withTimezone: true,
   })
      .notNull()
      .defaultNow(),
});
