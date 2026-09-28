import {
   pgTable,
   serial,
   varchar,
   date,
   boolean,
   text,
   timestamp,
} from 'drizzle-orm/pg-core';

export const patients = pgTable('patients', {
   id: serial('id').primaryKey(),

   firstName: varchar('first_name', {
      length: 100,
   }).notNull(),

   lastName: varchar('last_name', {
      length: 100,
   }).notNull(),

   dateOfBirth: date('date_of_birth').notNull(),

   gender: varchar('gender', {
      length: 20,
   }),

   contactEmail: varchar('contact_email', {
      length: 255,
   }),

   contactPhone: varchar('contact_phone', {
      length: 30,
   }),

   address: text('address'),

   syntheaPatientId: varchar('synthea_patient_id', {
      length: 100,
   }),

   isNewPatient: boolean('is_new_patient').notNull().default(true),

   intakeReasonNote: text('intake_reason_note'),

   createdAt: timestamp('created_at', {
      withTimezone: true,
   })
      .notNull()
      .defaultNow(),
});
