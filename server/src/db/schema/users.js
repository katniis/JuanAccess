import {
   boolean,
   pgTable,
   serial,
   varchar,
   integer,
   timestamp,
   check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { patients } from './patients.js';
import { providers } from './providers.js';

export const users = pgTable(
   'users',
   {
      id: serial('id').primaryKey(),

      email: varchar('email', {
         length: 255,
      })
         .unique()
         .notNull(),

      passwordHash: varchar('password_hash', {
         length: 255,
      }).notNull(),

      role: varchar('role', {
         length: 20,
      }).notNull(),

      patientId: integer('patient_id').references(() => patients.id),

      providerId: integer('provider_id').references(() => providers.id),

      displayName: varchar('display_name', {
         length: 150,
      }).notNull(),

      isActive: boolean('is_active').notNull().default(true),

      createdAt: timestamp('created_at', {
         withTimezone: true,
      })
         .notNull()
         .defaultNow(),
   },

   (table) => [
      check(
         'users_role_check',
         // PostgreSQL expression
         // role must be patient, staff, or staff_admin
         sql`${table.role} IN ('patient', 'staff', 'staff_admin')`,
      ),
   ],
);
