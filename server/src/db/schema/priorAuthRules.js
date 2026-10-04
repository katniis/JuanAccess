import { sql } from 'drizzle-orm';
import {
   boolean,
   index,
   integer,
   pgTable,
   serial,
   uniqueIndex,
} from 'drizzle-orm/pg-core';
import { insurancePlans } from './insurancePlans.js';
import { visitTypes } from './visitTypes.js';

export const priorAuthRules = pgTable(
   'prior_auth_rules',
   {
      id: serial('id').primaryKey(),
      visitTypeId: integer('visit_type_id')
         .notNull()
         .references(() => visitTypes.id),
      insurancePlanId: integer('insurance_plan_id').references(
         () => insurancePlans.id,
      ),
      requiresPriorAuth: boolean('requires_prior_auth')
         .notNull()
         .default(false),
   },
   (table) => [
      index('prior_auth_rules_visit_plan_idx').on(
         table.visitTypeId,
         table.insurancePlanId,
      ),
      uniqueIndex('prior_auth_rules_specific_unique')
         .on(table.visitTypeId, table.insurancePlanId)
         .where(sql`${table.insurancePlanId} IS NOT NULL`),
      uniqueIndex('prior_auth_rules_generic_unique')
         .on(table.visitTypeId)
         .where(sql`${table.insurancePlanId} IS NULL`),
   ],
);
