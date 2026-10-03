import { sql } from 'drizzle-orm';
import {
   check,
   date,
   index,
   integer,
   pgTable,
   serial,
   timestamp,
   varchar,
} from 'drizzle-orm/pg-core';
import { insurancePlans } from './insurancePlans.js';
import { patients } from './patients.js';
import { users } from './users.js';

export const patientCoverage = pgTable(
   'patient_coverage',
   {
      id: serial('id').primaryKey(),
      patientId: integer('patient_id')
         .notNull()
         .references(() => patients.id),
      insurancePlanId: integer('insurance_plan_id')
         .notNull()
         .references(() => insurancePlans.id),
      policyNumber: varchar('policy_number', { length: 100 }).notNull(),
      memberId: varchar('member_id', { length: 100 }),
      coverageStart: date('coverage_start'),
      coverageEnd: date('coverage_end'),
      status: varchar('status', { length: 20 }).notNull().default('unverified'),
      verifiedBy: integer('verified_by').references(() => users.id),
      verifiedAt: timestamp('verified_at', { withTimezone: true }),
      createdAt: timestamp('created_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true })
         .notNull()
         .defaultNow(),
   },
   (table) => [
      check(
         'patient_coverage_status_check',
         sql`${table.status} IN ('unverified', 'active', 'inactive')`,
      ),
      check(
         'patient_coverage_date_range_check',
         sql`${table.coverageStart} IS NULL OR ${table.coverageEnd} IS NULL OR ${table.coverageStart} <= ${table.coverageEnd}`,
      ),
      check(
         'patient_coverage_verification_check',
         sql`(${table.status} = 'unverified' AND ${table.verifiedBy} IS NULL AND ${table.verifiedAt} IS NULL) OR (${table.status} IN ('active', 'inactive') AND ${table.verifiedBy} IS NOT NULL AND ${table.verifiedAt} IS NOT NULL)`,
      ),
      index('patient_coverage_patient_status_idx').on(
         table.patientId,
         table.status,
      ),
   ],
);
