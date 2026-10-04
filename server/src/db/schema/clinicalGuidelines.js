import { integer, pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';
import { visitTypes } from './visitTypes.js';

export const clinicalGuidelines = pgTable('clinical_guidelines', {
   id: serial('id').primaryKey(),
   title: varchar('title', { length: 255 }).notNull(),
   excerptText: text('excerpt_text').notNull(),
   applicableVisitTypeId: integer('applicable_visit_type_id').references(
      () => visitTypes.id,
   ),
   applicableDiagnosisCode: varchar('applicable_diagnosis_code', {
      length: 50,
   }),
   sourceCitation: varchar('source_citation', { length: 255 }),
});
