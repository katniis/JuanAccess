import { and, asc, eq, gt, gte, inArray, lt, lte, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   apeBookingProcedures,
   apePackageProcedures,
   apePackages,
   appointments,
   arrivalWindows,
   feeSchedule,
   patients,
   preVisitSummaries,
   visitTypes,
} from '../db/schema/index.js';
import {
   arrivalWindowTimes,
   computeApeAvailability,
   countBookings,
   includedProcedures,
   manilaDateRange,
   spotsLeft,
} from '../services/ape-booking.service.js';
import { getCoverageStatusForAppointment } from '../services/insurance.service.js';
import { createPriorAuthorizationForAppointment } from '../services/prior-auth.service.js';
import { notifyPatient } from '../services/notification.service.js';
import { generatePriorAuthDraft } from '../services/prior-auth-draft.service.js';
import { manilaDateBounds, manilaDateString } from '../utils/timezone.js';
import { fromCentavos, toCentavos } from '../utils/money.js';

export const APE_VISIT_TYPE_NAME = 'Annual Physical Examination';
const MAX_RANGE_DAYS = 31;
const NO_SEX_AT_BIRTH =
   'Add your Sex at Birth in Settings before booking an APE, so we can include the right Procedures.';
const WINDOW_FULL = 'That Arrival Window was just filled. Please pick another.';

class BookingError extends Error {
   constructor(status, message) {
      super(message);
      this.status = status;
   }
}

// A YYYY-MM-DD calendar date that is today or later in Manila.
function parseBookableDate(value) {
   if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return null;
   if (manilaDateString(manilaDateBounds(value).startOfDay) !== value)
      return null;
   return value >= manilaDateString(new Date()) ? value : null;
}

function positiveInt(value) {
   const number = Number(value);
   return Number.isInteger(number) && number > 0 ? number : null;
}

function requirePatient(req, res) {
   if (req.user?.role !== 'patient' || !req.user.patientId) {
      res.status(403).json({ error: 'Only patient accounts can book an APE' });
      return false;
   }
   return true;
}

async function findSexAtBirth(executor, patientId) {
   const [patient] = await executor
      .select({ sexAtBirth: patients.sexAtBirth })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
   return patient?.sexAtBirth ?? null;
}

async function findActivePackage(executor, packageId) {
   const [apePackage] = await executor
      .select({
         id: apePackages.id,
         name: apePackages.name,
         packagePrice: apePackages.packagePrice,
      })
      .from(apePackages)
      .where(and(eq(apePackages.id, packageId), eq(apePackages.isActive, true)))
      .limit(1);
   return apePackage ?? null;
}

function packageProceduresQuery(executor, packageId) {
   return executor
      .select({
         feeScheduleId: feeSchedule.id,
         procedureCode: feeSchedule.procedureCode,
         description: feeSchedule.description,
         standardCost: feeSchedule.standardCost,
         offeredDays: feeSchedule.offeredDays,
         capacityPerWindow: feeSchedule.capacityPerWindow,
         sexAtBirth: apePackageProcedures.sexAtBirth,
      })
      .from(apePackageProcedures)
      .innerJoin(
         feeSchedule,
         eq(apePackageProcedures.feeScheduleId, feeSchedule.id),
      )
      .where(eq(apePackageProcedures.packageId, packageId))
      .orderBy(asc(feeSchedule.id));
}

// Active APE Bookings that include the given Procedures, starting within [from, to].
function bookedProceduresQuery(executor, procedureIds, from, to, windowId) {
   return executor
      .select({
         feeScheduleId: apeBookingProcedures.feeScheduleId,
         arrivalWindowId: appointments.arrivalWindowId,
         scheduledStart: appointments.scheduledStart,
      })
      .from(apeBookingProcedures)
      .innerJoin(
         appointments,
         eq(apeBookingProcedures.appointmentId, appointments.id),
      )
      .where(
         and(
            inArray(apeBookingProcedures.feeScheduleId, procedureIds),
            ne(appointments.status, 'cancelled'),
            gte(appointments.scheduledStart, from),
            lte(appointments.scheduledStart, to),
            windowId ? eq(appointments.arrivalWindowId, windowId) : undefined,
         ),
      );
}

function breakdown(procedures) {
   return {
      procedures: procedures.map(
         ({ procedureCode, description, standardCost, sexAtBirth }) => ({
            procedureCode,
            description,
            standardCost,
            sexAtBirth,
         }),
      ),
      itemizedSum: fromCentavos(
         procedures.reduce((sum, p) => sum + toCentavos(p.standardCost), 0),
      ),
   };
}

export async function getApeAvailability(req, res) {
   if (!requirePatient(req, res)) return;
   const packageId = positiveInt(req.query.package_id);
   const rangeStart = parseBookableDate(req.query.range_start);
   const rangeEnd = parseBookableDate(req.query.range_end);
   if (!packageId || !rangeStart || !rangeEnd || rangeStart > rangeEnd) {
      return res.status(400).json({
         error: 'package_id and a range_start/range_end (YYYY-MM-DD, today or later) are required',
      });
   }
   const dates = manilaDateRange(rangeStart, rangeEnd);
   if (dates.length > MAX_RANGE_DAYS) {
      return res
         .status(400)
         .json({ error: `Date range must be ${MAX_RANGE_DAYS} days or less` });
   }

   try {
      const sexAtBirth = await findSexAtBirth(db, req.user.patientId);
      if (!sexAtBirth) {
         return res.status(409).json({ error: NO_SEX_AT_BIRTH });
      }
      const apePackage = await findActivePackage(db, packageId);
      if (!apePackage) {
         return res.status(404).json({ error: 'APE Package not found' });
      }
      const procedures = includedProcedures(
         await packageProceduresQuery(db, packageId),
         sexAtBirth,
      );
      const windows = await db
         .select({
            id: arrivalWindows.id,
            name: arrivalWindows.name,
            startTime: arrivalWindows.startTime,
            endTime: arrivalWindows.endTime,
         })
         .from(arrivalWindows)
         .where(eq(arrivalWindows.isActive, true))
         .orderBy(asc(arrivalWindows.startTime));
      const bookings = procedures.length
         ? await bookedProceduresQuery(
              db,
              procedures.map((p) => p.feeScheduleId),
              manilaDateBounds(rangeStart).startOfDay,
              manilaDateBounds(rangeEnd).endOfDay,
           )
         : [];
      return res.json({
         package: apePackage,
         sexAtBirth,
         ...breakdown(procedures),
         days: computeApeAvailability({
            procedures,
            windows,
            bookings,
            dates,
            now: new Date(),
         }),
      });
   } catch (error) {
      console.error('Failed to load APE availability:', error);
      return res.status(500).json({ error: 'Failed to load APE availability' });
   }
}

async function findOrCreateApeVisitType(tx) {
   const [existing] = await tx
      .select({ id: visitTypes.id })
      .from(visitTypes)
      .where(eq(visitTypes.name, APE_VISIT_TYPE_NAME))
      .orderBy(asc(visitTypes.id))
      .limit(1);
   if (existing) return existing.id;
   const [created] = await tx
      .insert(visitTypes)
      .values({
         name: APE_VISIT_TYPE_NAME,
         description:
            'APE Booking: Procedures from an APE Package in one Arrival Window.',
         durationMinutes: 180,
      })
      .returning({ id: visitTypes.id });
   return created.id;
}

export async function createApeBooking(req, res) {
   if (!requirePatient(req, res)) return;
   const packageId = positiveInt(req.body?.package_id);
   const windowId = positiveInt(req.body?.arrival_window_id);
   const date = parseBookableDate(req.body?.date);
   if (!packageId || !windowId || !date) {
      return res.status(400).json({
         error: 'package_id, arrival_window_id and a date (YYYY-MM-DD, today or later) are required',
      });
   }
   const { patientId } = req.user;

   try {
      const result = await db.transaction(
         async (tx) => {
            const sexAtBirth = await findSexAtBirth(tx, patientId);
            if (!sexAtBirth) throw new BookingError(409, NO_SEX_AT_BIRTH);
            const apePackage = await findActivePackage(tx, packageId);
            if (!apePackage)
               throw new BookingError(404, 'APE Package not found');
            const [window] = await tx
               .select({
                  id: arrivalWindows.id,
                  startTime: arrivalWindows.startTime,
                  endTime: arrivalWindows.endTime,
               })
               .from(arrivalWindows)
               .where(
                  and(
                     eq(arrivalWindows.id, windowId),
                     eq(arrivalWindows.isActive, true),
                  ),
               )
               .limit(1);
            if (!window)
               throw new BookingError(404, 'Arrival Window not found');
            const { start, end } = arrivalWindowTimes(date, window);
            if (start <= new Date()) {
               throw new BookingError(
                  400,
                  'That Arrival Window has already started',
               );
            }

            // Lock the package's Procedure rows (in id order) so concurrent bookings of the same Procedures queue up.
            const procedures = includedProcedures(
               await packageProceduresQuery(tx, packageId).for('update', {
                  of: feeSchedule,
               }),
               sexAtBirth,
            );
            const bookings = procedures.length
               ? await bookedProceduresQuery(
                    tx,
                    procedures.map((p) => p.feeScheduleId),
                    manilaDateBounds(date).startOfDay,
                    manilaDateBounds(date).endOfDay,
                    windowId,
                 )
               : [];
            if (
               spotsLeft(procedures, countBookings(bookings), window, date) <= 0
            ) {
               throw new BookingError(409, WINDOW_FULL);
            }

            const [patientConflict] = await tx
               .select({ id: appointments.id })
               .from(appointments)
               .where(
                  and(
                     eq(appointments.patientId, patientId),
                     ne(appointments.status, 'cancelled'),
                     lt(appointments.scheduledStart, end),
                     gt(appointments.scheduledEnd, start),
                  ),
               )
               .limit(1);
            if (patientConflict) {
               throw new BookingError(
                  409,
                  'You already have an appointment during that Arrival Window',
               );
            }

            const visitTypeId = await findOrCreateApeVisitType(tx);
            const insuranceStatus = await getCoverageStatusForAppointment(
               tx,
               patientId,
               start,
            );
            const [created] = await tx
               .insert(appointments)
               .values({
                  patientId,
                  providerId: null,
                  roomId: null,
                  equipmentId: null,
                  visitTypeId,
                  scheduledStart: start,
                  scheduledEnd: end,
                  insuranceStatus,
                  apePackageId: packageId,
                  arrivalWindowId: windowId,
               })
               .returning();
            await tx.insert(apeBookingProcedures).values(
               procedures.map((p) => ({
                  appointmentId: created.id,
                  feeScheduleId: p.feeScheduleId,
                  procedureCode: p.procedureCode,
               })),
            );
            const priorAuthorization =
               await createPriorAuthorizationForAppointment(tx, created);
            await tx
               .insert(preVisitSummaries)
               .values({ appointmentId: created.id });
            await notifyPatient(
               tx,
               patientId,
               'appointment_created',
               `Your ${apePackage.name} APE was booked for ${date}.`,
            );
            return { appointment: created, priorAuthorization };
         },
         { isolationLevel: 'serializable' },
      );

      if (result.priorAuthorization?.status === 'needs_draft') {
         void generatePriorAuthDraft(result.priorAuthorization.id).catch(
            (error) => {
               console.error(
                  'Prior-authorization draft enqueue failed:',
                  error,
               );
            },
         );
      }
      return res.status(201).json({
         ...result.appointment,
         priorAuthorizationStatus: result.priorAuthorization?.status ?? null,
      });
   } catch (error) {
      if (error instanceof BookingError) {
         return res.status(error.status).json({ error: error.message });
      }
      if (error?.code === '40001' || error?.code === '40P01') {
         return res.status(409).json({ error: WINDOW_FULL });
      }
      console.error('Failed to book APE:', error);
      return res.status(500).json({ error: 'APE booking failed' });
   }
}
