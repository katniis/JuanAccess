import {
   boolean,
   check,
   integer,
   numeric,
   pgTable,
   serial,
   text,
   varchar,
   timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const PROFESSIONS = [
   'physician',
   'nurse',
   'medical_technologist',
   'radiologic_technologist',
];

// Practitioners (GLOSSARY.md); the table keeps its historical name.
export const providers = pgTable(
   'providers',
   {
      id: serial('id').primaryKey(),

      firstName: varchar('first_name', {
         length: 100,
      }).notNull(),

      lastName: varchar('last_name', {
         length: 100,
      }).notNull(),

      profession: varchar('profession', { length: 30 })
         .notNull()
         .default('physician'),

      specialty: varchar('specialty', {
         length: 100,
      }),

      npiNumber: varchar('npi_number', {
         length: 20,
      }),

      // Doctor Profile fields (physicians)
      education: text('education'),
      prcLicenseNumber: varchar('prc_license_number', { length: 7 }),
      boardCertifications: text('board_certifications'),
      practiceStartYear: integer('practice_start_year'),
      background: text('background'),
      photoUrl: text('photo_url'),
      consultationFee: numeric('consultation_fee', { precision: 10, scale: 2 }),

      isActive: boolean('is_active').notNull().default(true),

      createdAt: timestamp('created_at', {
         withTimezone: true,
      })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      check(
         'providers_profession_check',
         sql`${table.profession} IN ('physician', 'nurse', 'medical_technologist', 'radiologic_technologist')`,
      ),
   ],
);
