import {
   boolean,
   check,
   pgTable,
   serial,
   time,
   varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// The clinic's Arrival Windows (e.g. 7–10 AM) for APE Bookings. Active windows
// must not overlap; that is checked in the admin controller.
export const arrivalWindows = pgTable(
   'arrival_windows',
   {
      id: serial('id').primaryKey(),
      name: varchar('name', { length: 100 }).notNull(),
      startTime: time('start_time').notNull(),
      endTime: time('end_time').notNull(),
      isActive: boolean('is_active').notNull().default(true),
   },
   (table) => [
      check(
         'arrival_windows_hours_check',
         sql`${table.startTime} < ${table.endTime}`,
      ),
   ],
);
