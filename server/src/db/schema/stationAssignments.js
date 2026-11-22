import { integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { apeBookingProcedures } from './apeBookingProcedures.js';
import { providers } from './providers.js';
import { users } from './users.js';

// Station Assignment: the current Practitioner for one APE Booking Procedure.
// One row per booking Procedure; reassigning replaces it (history is in audit_log).
export const stationAssignments = pgTable('station_assignments', {
   id: serial('id').primaryKey(),
   bookingProcedureId: integer('booking_procedure_id')
      .notNull()
      .unique()
      .references(() => apeBookingProcedures.id, { onDelete: 'cascade' }),
   practitionerId: integer('practitioner_id')
      .notNull()
      .references(() => providers.id),
   assignedByUserId: integer('assigned_by_user_id')
      .notNull()
      .references(() => users.id),
   assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
});
