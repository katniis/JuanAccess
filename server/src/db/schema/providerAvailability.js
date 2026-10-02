import {
   integer,
   pgTable,
   serial,
   smallint,
   check,
   time,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { providers } from './providers.js';

export const providerAvailability = pgTable(
   'provider_availability',
   {
      id: serial('id').primaryKey(),

      providerId: integer('provider_id').references(() => providers.id),

      dayOfWeek: smallint('day_of_week').notNull(),

      startTime: time('start_time').notNull(),

      endTime: time('end_time').notNull(),
   },
   (table) => [
      check('day_of_week_check', sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
   ],
);
