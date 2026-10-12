import { sql } from 'drizzle-orm';
import {
   check,
   integer,
   pgTable,
   serial,
   text,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { clinicalGuidelines } from './clinicalGuidelines.js';
import { priorAuthorizations } from './priorAuthorizations.js';
import { users } from './users.js';

export const appeals = pgTable(
   'appeals',
   {
      id: serial('id').primaryKey(),
      priorAuthorizationId: integer('prior_authorization_id')
         .notNull()
         .references(() => priorAuthorizations.id),
      guidelineId: integer('guideline_id').references(
         () => clinicalGuidelines.id,
      ),
      chartJustificationText: text('chart_justification_text'),
      appealLetterText: text('appeal_letter_text'),
      status: varchar('status', { length: 20 }).notNull().default('drafted'),
      reviewedBy: integer('reviewed_by').references(() => users.id),
      submittedBy: integer('submitted_by').references(() => users.id),
      submittedAt: timestamp('submitted_at', { withTimezone: true }),
      decisionAt: timestamp('decision_at', { withTimezone: true }),
      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      check(
         'appeals_status_check',
         sql`${table.status} IN ('drafted', 'submitted', 'manual_review', 'approved', 'denied')`,
      ),
   ],
);
