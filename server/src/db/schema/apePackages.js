import {
   boolean,
   integer,
   numeric,
   pgTable,
   serial,
   timestamp,
   unique,
   varchar,
} from 'drizzle-orm/pg-core';
import { feeSchedule } from './feeSchedule.js';

export const apePackages = pgTable('ape_packages', {
   id: serial('id').primaryKey(),
   name: varchar('name', { length: 100 }).notNull().unique(),
   packagePrice: numeric('package_price', {
      precision: 10,
      scale: 2,
   }).notNull(),
   isActive: boolean('is_active').notNull().default(true),
   createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
});

// A Procedure in an APE Package; sexAtBirth NULL means it applies to everyone.
export const apePackageProcedures = pgTable(
   'ape_package_procedures',
   {
      id: serial('id').primaryKey(),
      packageId: integer('package_id')
         .notNull()
         .references(() => apePackages.id, { onDelete: 'cascade' }),
      feeScheduleId: integer('fee_schedule_id')
         .notNull()
         .references(() => feeSchedule.id),
      sexAtBirth: varchar('sex_at_birth', {
         length: 10,
         enum: ['female', 'male'],
      }),
   },
   (table) => [unique().on(table.packageId, table.feeScheduleId)],
);
