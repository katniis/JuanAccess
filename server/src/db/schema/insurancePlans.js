import { numeric, pgTable, serial, unique, varchar } from 'drizzle-orm/pg-core';

export const insurancePlans = pgTable(
   'insurance_plans',
   {
      id: serial('id').primaryKey(),
      payerName: varchar('payer_name', { length: 150 }).notNull(),
      planName: varchar('plan_name', { length: 150 }).notNull(),
      planType: varchar('plan_type', { length: 50 }),
      coveragePct: numeric('coverage_pct', { precision: 5, scale: 2 }),
   },
   (table) => [
      unique('insurance_plans_payer_plan_unique').on(
         table.payerName,
         table.planName,
      ),
   ],
);

// Alias insurerName to payerName for backward compatibility across existing queries
Object.defineProperty(insurancePlans, 'insurerName', {
   get() {
      return this.payerName;
   },
   enumerable: true,
   configurable: true,
});
