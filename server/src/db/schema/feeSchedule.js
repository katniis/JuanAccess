import { numeric, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const feeSchedule = pgTable('fee_schedule', {
   id: serial('id').primaryKey(),
   procedureCode: varchar('procedure_code', { length: 20 }).notNull().unique(),
   description: varchar('description', { length: 255 }).notNull(),
   standardCost: numeric('standard_cost', {
      precision: 10,
      scale: 2,
   }).notNull(),
});
