import {
   integer,
   jsonb,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const auditLog = pgTable('audit_log', {
   id: serial('id').primaryKey(),
   entityType: varchar('entity_type', { length: 50 }).notNull(),
   entityId: integer('entity_id').notNull(),
   action: varchar('action', { length: 50 }).notNull(),
   changedBy: integer('changed_by').references(() => users.id),
   changedAt: timestamp('changed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
   oldValue: jsonb('old_value'),
   newValue: jsonb('new_value'),
});
