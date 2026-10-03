import { pgTable, serial, varchar, unique } from 'drizzle-orm/pg-core';

export const insurancePlans = pgTable(
   'insurance_plans',
   {
      id: serial('id').primaryKey(),
      insurerName: varchar('insurer_name', { length: 150 }).notNull(),
      planName: varchar('plan_name', { length: 150 }).notNull(),
   },
   (table) => [
      unique('insurance_plans_insurer_plan_unique').on(
         table.insurerName,
         table.planName,
      ),
   ],
);
