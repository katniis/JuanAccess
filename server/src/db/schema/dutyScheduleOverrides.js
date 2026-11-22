import {
   boolean,
   check,
   date,
   integer,
   pgTable,
   serial,
   time,
   unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { providers } from './providers.js';

// A date-specific change to a Practitioner's weekly Duty Schedule: a day off, or custom hours.
export const dutyScheduleOverrides = pgTable(
   'duty_schedule_overrides',
   {
      id: serial('id').primaryKey(),

      providerId: integer('provider_id')
         .notNull()
         .references(() => providers.id, { onDelete: 'cascade' }),

      overrideDate: date('override_date').notNull(),

      isDayOff: boolean('is_day_off').notNull().default(false),

      startTime: time('start_time'),

      endTime: time('end_time'),
   },
   (table) => [
      unique('duty_schedule_overrides_provider_date_unique').on(
         table.providerId,
         table.overrideDate,
      ),
      check(
         'duty_schedule_overrides_hours_check',
         sql`${table.isDayOff} OR (${table.startTime} IS NOT NULL AND ${table.endTime} IS NOT NULL AND ${table.startTime} < ${table.endTime})`,
      ),
   ],
);
