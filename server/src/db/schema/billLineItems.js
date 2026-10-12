import {
   boolean,
   integer,
   numeric,
   pgTable,
   serial,
   varchar,
} from 'drizzle-orm/pg-core';
import { bills } from './bills.js';

export const billLineItems = pgTable('bill_line_items', {
   id: serial('id').primaryKey(),
   billId: integer('bill_id')
      .notNull()
      .references(() => bills.id),
   procedureCode: varchar('procedure_code', { length: 20 }),
   description: varchar('description', { length: 255 }),
   amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
   isFlagged: boolean('is_flagged').notNull().default(false),
   flagReason: varchar('flag_reason', { length: 255 }),
});
