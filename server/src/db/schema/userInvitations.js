import {
   check,
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const userInvitations = pgTable(
   'user_invitations',
   {
      id: serial('id').primaryKey(),
      email: varchar('email', { length: 255 }).notNull(),
      role: varchar('role', { length: 20 }).notNull(),
      firstName: varchar('first_name', { length: 100 }).notNull(),
      lastName: varchar('last_name', { length: 100 }).notNull(),
      specialty: varchar('specialty', { length: 100 }),
      npiNumber: varchar('npi_number', { length: 20 }),
      tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
      expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
      acceptedAt: timestamp('accepted_at', { withTimezone: true }),
      invitedBy: integer('invited_by')
         .notNull()
         .references(() => users.id),
      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      check(
         'user_invitations_role_check',
         sql`${table.role} IN ('staff', 'staff_admin')`,
      ),
   ],
);
