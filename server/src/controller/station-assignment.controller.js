import { and, asc, eq, gte, inArray, isNotNull, lte, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   apeBookingProcedures,
   apePackages,
   appointments,
   arrivalWindows,
   feeSchedule,
   patients,
   proceduresPerformed,
   providers,
   stationAssignments,
} from '../db/schema/index.js';
import { recordAudit } from '../services/audit.service.js';
import { isOnDuty } from '../services/duty-schedule.service.js';
import { groupApeQueue } from '../services/station-assignment.service.js';
import { manilaDateBounds, manilaDateString } from '../utils/timezone.js';

class AssignmentError extends Error {
   constructor(status, message) {
      super(message);
      this.status = status;
   }
}

const positiveInt = (value) => {
   const number = Number(value);
   return Number.isInteger(number) && number > 0 ? number : null;
};

export async function getApeQueue(_req, res) {
   const { startOfDay, endOfDay } = manilaDateBounds(
      manilaDateString(new Date()),
   );
   try {
      const bookings = await db
         .select({
            appointmentId: appointments.id,
            patientFirstName: patients.firstName,
            patientLastName: patients.lastName,
            gender: patients.gender,
            packageName: apePackages.name,
            arrivalWindowId: arrivalWindows.id,
            arrivalWindowName: arrivalWindows.name,
            arrivalWindowStart: arrivalWindows.startTime,
            arrivalWindowEnd: arrivalWindows.endTime,
         })
         .from(appointments)
         .innerJoin(patients, eq(appointments.patientId, patients.id))
         .innerJoin(apePackages, eq(appointments.apePackageId, apePackages.id))
         .innerJoin(
            arrivalWindows,
            eq(appointments.arrivalWindowId, arrivalWindows.id),
         )
         .where(
            and(
               isNotNull(appointments.apePackageId),
               ne(appointments.status, 'cancelled'),
               gte(appointments.scheduledStart, startOfDay),
               lte(appointments.scheduledStart, endOfDay),
            ),
         )
         .orderBy(
            asc(arrivalWindows.startTime),
            asc(patients.lastName),
            asc(patients.firstName),
         );
      if (!bookings.length) return res.json({ windows: [] });

      const ids = bookings.map((b) => b.appointmentId);
      const procedures = await db
         .select({
            id: apeBookingProcedures.id,
            appointmentId: apeBookingProcedures.appointmentId,
            procedureCode: apeBookingProcedures.procedureCode,
            description: feeSchedule.description,
            allowedProfessions: feeSchedule.allowedProfessions,
            practitionerId: stationAssignments.practitionerId,
            practitionerFirstName: providers.firstName,
            practitionerLastName: providers.lastName,
            assignedAt: stationAssignments.assignedAt,
         })
         .from(apeBookingProcedures)
         .innerJoin(
            feeSchedule,
            eq(apeBookingProcedures.feeScheduleId, feeSchedule.id),
         )
         .leftJoin(
            stationAssignments,
            eq(stationAssignments.bookingProcedureId, apeBookingProcedures.id),
         )
         .leftJoin(
            providers,
            eq(stationAssignments.practitionerId, providers.id),
         )
         .where(inArray(apeBookingProcedures.appointmentId, ids))
         .orderBy(asc(apeBookingProcedures.id));
      const performed = await db
         .select({
            appointmentId: proceduresPerformed.appointmentId,
            procedureCode: proceduresPerformed.procedureCode,
         })
         .from(proceduresPerformed)
         .where(inArray(proceduresPerformed.appointmentId, ids));

      return res.json({
         windows: groupApeQueue(bookings, procedures, performed),
      });
   } catch (error) {
      console.error("Failed to load today's APE queue:", error);
      return res
         .status(500)
         .json({ error: "Failed to load today's APE queue" });
   }
}

// The booking Procedure with what Station Assignment needs to check it.
async function findBookingProcedure(executor, id) {
   const [row] = await executor
      .select({
         id: apeBookingProcedures.id,
         appointmentId: apeBookingProcedures.appointmentId,
         procedureCode: apeBookingProcedures.procedureCode,
         allowedProfessions: feeSchedule.allowedProfessions,
         scheduledStart: appointments.scheduledStart,
         status: appointments.status,
      })
      .from(apeBookingProcedures)
      .innerJoin(
         appointments,
         eq(apeBookingProcedures.appointmentId, appointments.id),
      )
      .innerJoin(
         feeSchedule,
         eq(apeBookingProcedures.feeScheduleId, feeSchedule.id),
      )
      .where(eq(apeBookingProcedures.id, id))
      .limit(1);
   if (!row || row.status === 'cancelled')
      throw new AssignmentError(404, 'APE Booking Procedure not found');
   if (manilaDateString(row.scheduledStart) !== manilaDateString(new Date()))
      throw new AssignmentError(
         409,
         'Station Assignment is made on the day of the APE Booking',
      );
   return row;
}

// Duty is checked when the patient can reach the station: now, or the Arrival Window start if later.
const dutyTime = (scheduledStart) =>
   new Date(Math.max(Date.now(), new Date(scheduledStart).getTime()));

function sendError(res, error, fallback) {
   if (error instanceof AssignmentError)
      return res.status(error.status).json({ error: error.message });
   console.error(`${fallback}:`, error);
   return res.status(500).json({ error: fallback });
}

export async function listEligiblePractitioners(req, res) {
   const id = positiveInt(req.params.id);
   if (!id)
      return res
         .status(400)
         .json({ error: 'Invalid APE Booking Procedure ID' });
   try {
      const procedure = await findBookingProcedure(db, id);
      if (!procedure.allowedProfessions.length)
         return res.json({ practitioners: [] });
      const candidates = await db
         .select({
            id: providers.id,
            firstName: providers.firstName,
            lastName: providers.lastName,
            profession: providers.profession,
         })
         .from(providers)
         .where(
            and(
               eq(providers.isActive, true),
               inArray(providers.profession, procedure.allowedProfessions),
            ),
         )
         .orderBy(asc(providers.lastName), asc(providers.firstName));
      const at = dutyTime(procedure.scheduledStart);
      const practitioners = [];
      // Sequential so each duty lookup finishes before the next starts.
      for (const candidate of candidates) {
         if (await isOnDuty(candidate.id, at)) practitioners.push(candidate);
      }
      return res.json({ practitioners });
   } catch (error) {
      return sendError(res, error, 'Failed to list eligible Practitioners');
   }
}

export async function assignStation(req, res) {
   const id = positiveInt(req.params.id);
   const practitionerId = positiveInt(req.body?.practitioner_id);
   if (!id || !practitionerId)
      return res.status(400).json({
         error: 'A valid APE Booking Procedure ID and practitioner_id are required',
      });
   try {
      const { assignment, previous, procedure } = await db.transaction(
         async (tx) => {
            const procedure = await findBookingProcedure(tx, id);
            const [practitioner] = await tx
               .select({
                  id: providers.id,
                  profession: providers.profession,
                  isActive: providers.isActive,
               })
               .from(providers)
               .where(eq(providers.id, practitionerId))
               .limit(1);
            if (!practitioner)
               throw new AssignmentError(404, 'Practitioner not found');
            if (!practitioner.isActive)
               throw new AssignmentError(409, 'That Practitioner is inactive');
            if (!procedure.allowedProfessions.includes(practitioner.profession))
               throw new AssignmentError(
                  409,
                  `A ${practitioner.profession.replace('_', ' ')} may not perform ${procedure.procedureCode}`,
               );
            if (
               !(await isOnDuty(
                  practitionerId,
                  dutyTime(procedure.scheduledStart),
                  tx,
               ))
            )
               throw new AssignmentError(
                  409,
                  'That Practitioner is not on duty',
               );

            // Reassigning replaces the current assignment.
            const [previous] = await tx
               .delete(stationAssignments)
               .where(eq(stationAssignments.bookingProcedureId, id))
               .returning();
            const [assignment] = await tx
               .insert(stationAssignments)
               .values({
                  bookingProcedureId: id,
                  practitionerId,
                  assignedByUserId: req.user.id,
               })
               .returning();
            return { assignment, previous, procedure };
         },
      );
      await recordAudit({
         entityType: 'station_assignment',
         entityId: id,
         action: previous ? 'reassign' : 'assign',
         changedBy: req.user.id,
         oldValue: previous
            ? { practitionerId: previous.practitionerId }
            : null,
         newValue: {
            appointmentId: procedure.appointmentId,
            procedureCode: procedure.procedureCode,
            practitionerId,
         },
      });
      return res.status(previous ? 200 : 201).json(assignment);
   } catch (error) {
      return sendError(res, error, 'Station Assignment failed');
   }
}
