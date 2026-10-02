import {
   boolean,
   integer,
   pgTable,
   serial,
   text,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const notifications = pgTable('notifications', {
   id: serial('id').primaryKey(),
   userId: integer('user_id')
      .notNull()
      .references(() => users.id),
   type: varchar('type', { length: 50 }).notNull(),
   message: text('message').notNull(),
   isRead: boolean('is_read').notNull().default(false),
   createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
});
