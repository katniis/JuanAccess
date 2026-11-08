import {
   boolean,
   integer,
   pgTable,
   serial,
   text,
   timestamp,
} from 'drizzle-orm/pg-core';
import { bills } from './bills.js';

export const disputeLetters = pgTable('dispute_letters', {
   id: serial('id').primaryKey(),
   billId: integer('bill_id')
      .notNull()
      .unique()
      .references(() => bills.id),
   letterText: text('letter_text').notNull(),
   generatedAt: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
   patientEdited: boolean('patient_edited').notNull().default(false),
   downloadedAt: timestamp('downloaded_at', { withTimezone: true }),
   submittedAt: timestamp('submitted_at', { withTimezone: true }),
});
