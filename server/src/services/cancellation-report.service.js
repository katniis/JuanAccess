import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { appointments, users, visitTypes } from '../db/schema/index.js';
import { manilaDateString } from '../utils/timezone.js';

const cancelledByOf = (role) =>
   role === 'patient' ? 'patient' : role ? 'staff' : 'unknown';

const countBy = (rows, keyOf) => {
   const counts = new Map();
   for (const row of rows) {
      const key = keyOf(row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
   }
   return [...counts]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
};

// filters: { from, to } are Date bounds; visitTypeId/practitionerId are integers. All optional.
export async function getCancellationReport({
   from,
   to,
   visitTypeId,
   practitionerId,
}) {
   const rows = await db
      .select({
         appointmentId: appointments.id,
         reason: appointments.cancellationReason,
         reasonText: appointments.cancellationReasonText,
         cancelledAt: appointments.cancelledAt,
         cancelledByRole: users.role,
         visitTypeName: visitTypes.name,
      })
      .from(appointments)
      .innerJoin(visitTypes, eq(appointments.visitTypeId, visitTypes.id))
      .leftJoin(users, eq(appointments.cancelledByUserId, users.id))
      .where(
         and(
            eq(appointments.status, 'cancelled'),
            from && gte(appointments.cancelledAt, from),
            to && lte(appointments.cancelledAt, to),
            visitTypeId && eq(appointments.visitTypeId, visitTypeId),
            practitionerId && eq(appointments.providerId, practitionerId),
         ),
      );

   const entries = rows.map((row) => ({
      ...row,
      reason: row.reason ?? 'unspecified',
      cancelledBy: cancelledByOf(row.cancelledByRole),
   }));

   return {
      total: entries.length,
      byReason: countBy(entries, (e) => e.reason).map(({ key, count }) => ({
         reason: key,
         count,
      })),
      byCancelledBy: countBy(entries, (e) => e.cancelledBy).map(
         ({ key, count }) => ({ cancelledBy: key, count }),
      ),
      byReasonAndCancelledBy: countBy(
         entries,
         (e) => `${e.reason}|${e.cancelledBy}`,
      ).map(({ key, count }) => {
         const [reason, cancelledBy] = key.split('|');
         return { reason, cancelledBy, count };
      }),
      otherEntries: entries
         .filter((e) => e.reason === 'other')
         .map((e) => ({
            appointmentId: e.appointmentId,
            reasonText: e.reasonText,
            date: e.cancelledAt
               ? manilaDateString(new Date(e.cancelledAt))
               : null,
            visitType: e.visitTypeName,
            cancelledBy: e.cancelledBy,
         })),
   };
}
