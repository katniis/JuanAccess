import {
   index,
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const recoveryCodes = pgTable(
   'recovery_codes',
   {
      id: serial('id').primaryKey(),
      userId: integer('user_id')
         .notNull()
         .references(() => users.id, { onDelete: 'cascade' }),
      codeHash: varchar('code_hash', { length: 64 }).notNull(),
      usedAt: timestamp('used_at', { withTimezone: true }),
      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [index('recovery_codes_user_idx').on(table.userId)],
);
