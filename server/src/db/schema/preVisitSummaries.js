import {
   integer,
   jsonb,
   pgTable,
   serial,
   text,
   timestamp,
} from 'drizzle-orm/pg-core';
import { appointments } from './appointments.js';

export const preVisitSummaries = pgTable('pre_visit_summaries', {
   id: serial('id').primaryKey(),
   appointmentId: integer('appointment_id')
      .notNull()
      .unique()
      .references(() => appointments.id),
   summaryText: text('summary_text'),
   rawDataSnapshot: jsonb('raw_data_snapshot'),
   generatedAt: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
});
