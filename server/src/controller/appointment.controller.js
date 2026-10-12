import { and, asc, desc, eq, gt, lt, ne, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   appointments,
   equipment,
   preVisitSummaries,
   providerAvailability,
   providers,
   priorAuthorizations,
   rooms,
   visitTypes,
   waitlistEntries,
} from '../db/schema/index.js';
import { offerNextWaitlistEntry } from '../services/waitlist.service.js';
import { getCoverageStatusForAppointment } from '../services/insurance.service.js';
import { createPriorAuthorizationForAppointment } from '../services/prior-auth.service.js';
import { notifyPatient } from '../services/notification.service.js';

const APPOINTMENT_GRACE_MINUTES = 15;
const APPOINTMENT_GRACE_MS = APPOINTMENT_GRACE_MINUTES * 60 * 1000;

export const getAllVisitTypes = async (req, res) => {
   try {
      const types = await db.select().from(visitTypes);
      return res.status(200).json({ visitTypes: types });
   } catch (error) {
      console.error('Failed to fetch visit types:', error);
      return res.status(500).json({ message: 'Internal server error.' });
   }
};

export const getVisitType = async (req, res) => {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1) {
      return res
         .status(400)
         .json({ message: 'Visit type ID must be a positive integer.' });
   }

   try {
      const [type] = await db
         .select()
         .from(visitTypes)
         .where(eq(visitTypes.id, id))
         .limit(1);
      if (!type) {
         return res.status(404).json({ message: 'Visit type not found.' });
      }
      return res.status(200).json({ visitType: type });
   } catch (error) {
      console.error('Failed to fetch visit type:', error);
      return res.status(500).json({ message: 'Internal server error.' });
   }
};

export const getAvailableSlots = async (req, res) => {
   const {
      visit_type_id: visitTypeId,
      range_start: rangeStart,
      range_end: rangeEnd,
      time_start: timeStart,
      time_end: timeEnd,
   } = req.query;
   if (!visitTypeId || !rangeStart || !rangeEnd) {
      return res.status(400).json({
         error: 'visit_type_id, range_start, and range_end are required',
      });
   }

   const start = new Date(rangeStart);
   const end = new Date(rangeEnd);
   if (
      !Number.isInteger(Number(visitTypeId)) ||
      Number(visitTypeId) < 1 ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
   ) {
      return res
         .status(400)
         .json({ error: 'Invalid visit type or date range' });
   }
   if (
      (timeStart && !isValidTime(timeStart)) ||
      (timeEnd && !isValidTime(timeEnd))
   ) {
      return res.status(400).json({ error: 'Invalid time preference' });
   }
   if (Boolean(timeStart) !== Boolean(timeEnd)) {
      return res
         .status(400)
         .json({ error: 'time_start and time_end must be provided together' });
   }
   if (timeStart && timeToMinutes(timeStart) >= timeToMinutes(timeEnd)) {
      return res
         .status(400)
         .json({ error: 'time_start must be before time_end' });
   }

   try {
      const [visitType] = await db
         .select()
         .from(visitTypes)
         .where(eq(visitTypes.id, Number(visitTypeId)))
         .limit(1);
      if (!visitType) {
         return res.status(404).json({ error: 'Visit type not found' });
      }
      const requiredSpecialty = normalizeSpecialty(visitType.requiredSpecialty);

      const providerQuery = db
         .select({
            providerId: providers.id,
            firstName: providers.firstName,
            lastName: providers.lastName,
            dayOfWeek: providerAvailability.dayOfWeek,
            startTime: providerAvailability.startTime,
            endTime: providerAvailability.endTime,
         })
         .from(providers)
         .innerJoin(
            providerAvailability,
            eq(providerAvailability.providerId, providers.id),
         );
      const eligibleProviders = await (requiredSpecialty
         ? providerQuery.where(
              and(
                 eq(providers.isActive, true),
                 eq(providers.specialty, requiredSpecialty),
              ),
           )
         : providerQuery.where(eq(providers.isActive, true)));

      const busy = await db
         .select({
            patientId: appointments.patientId,
            providerId: appointments.providerId,
            roomId: appointments.roomId,
            equipmentId: appointments.equipmentId,
            scheduledStart: appointments.scheduledStart,
            scheduledEnd: appointments.scheduledEnd,
         })
         .from(appointments)
         .where(
            and(
               ne(appointments.status, 'cancelled'),
               lt(
                  appointments.scheduledStart,
                  new Date(endOfDay(end).getTime() + APPOINTMENT_GRACE_MS),
               ),
               gt(
                  appointments.scheduledEnd,
                  new Date(start.getTime() - APPOINTMENT_GRACE_MS),
               ),
            ),
         );

      let roomIds;
      if (visitType.requiredEquipmentId) {
         const [requiredEquipment] = await db
            .select({ roomId: equipment.roomId })
            .from(equipment)
            .where(eq(equipment.id, visitType.requiredEquipmentId))
            .limit(1);
         roomIds = requiredEquipment?.roomId ? [requiredEquipment.roomId] : [];
      } else {
         const availableRooms = await db
            .select({ id: rooms.id })
            .from(rooms)
            .where(eq(rooms.roomType, 'exam'));
         roomIds = availableRooms.map((room) => room.id);
      }

      const slots = findAvailableSlots(
         visitType,
         eligibleProviders,
         busy,
         roomIds,
         req.user.patientId,
         start,
         end,
         timeStart && timeEnd
            ? { startTime: timeStart, endTime: timeEnd }
            : null,
      );
      const names = new Map(
         eligibleProviders.map((provider) => [
            provider.providerId,
            `${provider.firstName} ${provider.lastName}`,
         ]),
      );
      return res.json({
         visit_type: visitType.name,
         slots: slots.map((slot) => ({
            provider_id: slot.providerId,
            provider_name: names.get(slot.providerId),
            start: slot.start,
            end: slot.end,
         })),
      });
   } catch (error) {
      console.error('Failed to search appointment slots:', error);
      return res
         .status(500)
         .json({ error: 'Failed to search for available slots' });
   }
};

export const createAppointment = async (req, res) => {
   if (req.user?.role !== 'patient' || !req.user.patientId) {
      return res
         .status(403)
         .json({ error: 'Only patient accounts can book appointments' });
   }

   const {
      visit_type_id: visitTypeId,
      provider_id: providerId,
      start,
      end,
   } = req.body ?? {};
   const startDate = new Date(start);
   const endDate = new Date(end);
   if (
      !Number.isInteger(Number(visitTypeId)) ||
      !Number.isInteger(Number(providerId)) ||
      Number(visitTypeId) < 1 ||
      Number(providerId) < 1 ||
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate >= endDate ||
      startDate <= new Date() ||
      startDate.toDateString() !== endDate.toDateString()
   ) {
      return res.status(400).json({
         error: 'Valid visit_type_id, provider_id, start, and end are required',
      });
   }

   try {
      const result = await db.transaction(
         async (tx) => {
            const [visitType] = await tx
               .select()
               .from(visitTypes)
               .where(eq(visitTypes.id, Number(visitTypeId)))
               .limit(1);
            if (!visitType) {
               return { error: 'Visit type not found', status: 404 };
            }
            const requiredSpecialty = normalizeSpecialty(
               visitType.requiredSpecialty,
            );
            if (endDate - startDate !== visitType.durationMinutes * 60000) {
               return {
                  error: 'Appointment duration does not match visit type',
                  status: 400,
               };
            }

            const [provider] = await tx
               .select({ id: providers.id })
               .from(providers)
               .innerJoin(
                  providerAvailability,
                  eq(providerAvailability.providerId, providers.id),
               )
               .where(
                  and(
                     eq(providers.id, Number(providerId)),
                     eq(providers.isActive, true),
                     requiredSpecialty
                        ? eq(providers.specialty, requiredSpecialty)
                        : undefined,
                     eq(providerAvailability.dayOfWeek, startDate.getDay()),
                  ),
               )
               .limit(1);
            if (!provider) {
               return {
                  error: 'Provider is unavailable for this visit type or day',
                  status: 409,
               };
            }

            const availability = await tx
               .select({
                  startTime: providerAvailability.startTime,
                  endTime: providerAvailability.endTime,
               })
               .from(providerAvailability)
               .where(
                  and(
                     eq(providerAvailability.providerId, Number(providerId)),
                     eq(providerAvailability.dayOfWeek, startDate.getDay()),
                  ),
               );
            const startMinutes =
               startDate.getHours() * 60 + startDate.getMinutes();
            const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
            const withinAvailability = availability.some(
               (window) =>
                  startMinutes >= timeToMinutes(window.startTime) &&
                  endMinutes <= timeToMinutes(window.endTime),
            );
            if (!withinAvailability) {
               return {
                  error: 'Appointment falls outside provider availability',
                  status: 409,
               };
            }

            const equipmentId = visitType.requiredEquipmentId;
            let roomId;
            if (equipmentId) {
               const [requiredEquipment] = await tx
                  .select({ roomId: equipment.roomId })
                  .from(equipment)
                  .where(eq(equipment.id, equipmentId))
                  .limit(1);
               roomId = requiredEquipment?.roomId;
               if (!roomId) {
                  return {
                     error: 'Required equipment has no assigned room',
                     status: 409,
                  };
               }
            } else {
               const examRooms = await tx
                  .select({ id: rooms.id })
                  .from(rooms)
                  .where(eq(rooms.roomType, 'exam'))
                  .orderBy(asc(rooms.id));
               for (const room of examRooms) {
                  const [conflict] = await tx
                     .select({ id: appointments.id })
                     .from(appointments)
                     .where(
                        and(
                           eq(appointments.roomId, room.id),
                           ne(appointments.status, 'cancelled'),
                           lt(
                              appointments.scheduledStart,
                              new Date(
                                 endDate.getTime() + APPOINTMENT_GRACE_MS,
                              ),
                           ),
                           gt(
                              appointments.scheduledEnd,
                              new Date(
                                 startDate.getTime() - APPOINTMENT_GRACE_MS,
                              ),
                           ),
                        ),
                     )
                     .limit(1);
                  if (!conflict) {
                     roomId = room.id;
                     break;
                  }
               }
            }
            if (!roomId) {
               return { error: 'No suitable room is available', status: 409 };
            }

            const [conflict] = await tx
               .select({ id: appointments.id })
               .from(appointments)
               .where(
                  and(
                     ne(appointments.status, 'cancelled'),
                     lt(
                        appointments.scheduledStart,
                        new Date(endDate.getTime() + APPOINTMENT_GRACE_MS),
                     ),
                     gt(
                        appointments.scheduledEnd,
                        new Date(startDate.getTime() - APPOINTMENT_GRACE_MS),
                     ),
                     or(
                        eq(appointments.providerId, Number(providerId)),
                        eq(appointments.roomId, roomId),
                        eq(appointments.patientId, req.user.patientId),
                        equipmentId
                           ? eq(appointments.equipmentId, equipmentId)
                           : undefined,
                     ),
                  ),
               )
               .limit(1);
            if (conflict) {
               return {
                  error: 'That slot was just taken — please pick another',
                  status: 409,
               };
            }

            const insuranceStatus = await getCoverageStatusForAppointment(
               tx,
               req.user.patientId,
               startDate,
            );

            const [created] = await tx
               .insert(appointments)
               .values({
                  patientId: req.user.patientId,
                  providerId: Number(providerId),
                  roomId,
                  equipmentId,
                  visitTypeId: Number(visitTypeId),
                  scheduledStart: startDate,
                  scheduledEnd: endDate,
                  insuranceStatus,
               })
               .returning();
            const priorAuthorization =
               await createPriorAuthorizationForAppointment(tx, created);
            await tx.insert(preVisitSummaries).values({
               appointmentId: created.id,
            });
            await notifyPatient(
               tx,
               req.user.patientId,
               'appointment_created',
               'Your appointment was booked successfully.',
            );
            return { appointment: created, priorAuthorization };
         },
         { isolationLevel: 'serializable' },
      );

      if (result.error) {
         return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json({
         ...result.appointment,
         priorAuthorizationStatus: result.priorAuthorization?.status ?? null,
      });
   } catch (error) {
      if (error?.code === '40001') {
         return res
            .status(409)
            .json({ error: 'That slot was just taken — please pick another' });
      }
      console.error('Failed to create appointment:', error);
      return res.status(500).json({ error: 'Booking failed' });
   }
};

export const getMyAppointments = async (req, res) => {
   if (req.user?.role !== 'patient' || !req.user.patientId) {
      return res
         .status(403)
         .json({ error: 'Only patient accounts can view their appointments' });
   }
   try {
      const rows = await db
         .select({
            id: appointments.id,
            patientId: appointments.patientId,
            providerId: appointments.providerId,
            roomId: appointments.roomId,
            equipmentId: appointments.equipmentId,
            visitTypeId: appointments.visitTypeId,
            scheduledStart: appointments.scheduledStart,
            scheduledEnd: appointments.scheduledEnd,
            status: appointments.status,
            insuranceStatus: appointments.insuranceStatus,
            priorAuthorizationStatus: priorAuthorizations.status,
            providerFirst: providers.firstName,
            providerLast: providers.lastName,
            visitTypeName: visitTypes.name,
         })
         .from(appointments)
         .innerJoin(providers, eq(providers.id, appointments.providerId))
         .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
         .leftJoin(
            priorAuthorizations,
            eq(priorAuthorizations.appointmentId, appointments.id),
         )
         .where(eq(appointments.patientId, req.user.patientId))
         .orderBy(desc(appointments.scheduledStart));
      return res.json(rows);
   } catch (error) {
      console.error('Failed to fetch patient appointments:', error);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
   }
};

export const cancelAppointment = async (req, res) => {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
   }
   try {
      const cancelled = await db.transaction(
         async (tx) => {
            const conditions = [
               eq(appointments.id, id),
               eq(appointments.status, 'scheduled'),
            ];
            if (req.user?.role === 'patient') {
               conditions.push(eq(appointments.patientId, req.user.patientId));
            }
            const [appointment] = await tx
               .select()
               .from(appointments)
               .where(and(...conditions))
               .limit(1);
            if (!appointment) {
               return false;
            }
            const [updated] = await tx
               .update(appointments)
               .set({ status: 'cancelled', updatedAt: new Date() })
               .where(
                  and(
                     eq(appointments.id, id),
                     eq(appointments.status, 'scheduled'),
                  ),
               )
               .returning({ id: appointments.id });
            if (!updated) {
               return false;
            }

            await notifyPatient(
               tx,
               appointment.patientId,
               'appointment_cancelled',
               'Your appointment was cancelled.',
            );

            const [waitlistOffer] = await tx
               .select({ id: waitlistEntries.id })
               .from(waitlistEntries)
               .where(
                  and(
                     eq(waitlistEntries.offeredAppointmentId, id),
                     eq(waitlistEntries.status, 'offered'),
                  ),
               )
               .limit(1);
            if (waitlistOffer) {
               await tx
                  .update(waitlistEntries)
                  .set({ status: 'cancelled', offerExpiresAt: null })
                  .where(eq(waitlistEntries.id, waitlistOffer.id));
            }
            await offerNextWaitlistEntry(tx, appointment);
            return true;
         },
         { isolationLevel: 'serializable' },
      );

      if (!cancelled) {
         return res
            .status(404)
            .json({ error: 'Appointment not found or cannot be cancelled' });
      }
      return res.status(204).end();
   } catch (error) {
      if (error?.code === '40001') {
         return res.status(409).json({
            error: 'Appointment changed while it was being cancelled. Please refresh and try again.',
         });
      }
      console.error('Failed to cancel appointment:', error);
      return res.status(500).json({ error: 'Failed to cancel appointment' });
   }
};

function findAvailableSlots(
   visitType,
   availability,
   busy,
   roomIds,
   patientId,
   rangeStart,
   rangeEnd,
   timePref,
) {
   const slots = [];
   const seen = new Set();
   const duration = visitType.durationMinutes * 60000;
   const byProvider = new Map();
   for (const row of availability) {
      const rows = byProvider.get(row.providerId) ?? [];
      rows.push(row);
      byProvider.set(row.providerId, rows);
   }

   const lastDay = endOfDay(rangeEnd);
   for (const [providerId, days] of byProvider) {
      for (
         let day = new Date(rangeStart);
         day <= lastDay;
         day.setDate(day.getDate() + 1)
      ) {
         const windows = days.filter((item) => item.dayOfWeek === day.getDay());
         for (const window of windows) {
            const open = Math.max(
               timeToMinutes(window.startTime),
               timePref ? timeToMinutes(timePref.startTime) : 0,
            );
            const close = Math.min(
               timeToMinutes(window.endTime),
               timePref ? timeToMinutes(timePref.endTime) : 24 * 60,
            );
            const windowStart = atTime(day, open);
            const windowEnd = atTime(day, close);
            for (
               let slotStart = new Date(windowStart);
               slotStart.getTime() + duration <= windowEnd.getTime();
               slotStart = new Date(
                  slotStart.getTime() + duration + APPOINTMENT_GRACE_MS,
               )
            ) {
               const slotEnd = new Date(slotStart.getTime() + duration);
               if (slotStart < new Date()) {
                  continue;
               }
               const conflicts = busy.filter(
                  (appointment) =>
                     appointment.scheduledStart <
                        new Date(slotEnd.getTime() + APPOINTMENT_GRACE_MS) &&
                     appointment.scheduledEnd >
                        new Date(slotStart.getTime() - APPOINTMENT_GRACE_MS),
               );
               const providerBusy = conflicts.some(
                  (appointment) => appointment.providerId === providerId,
               );
               const patientBusy =
                  patientId !== null &&
                  patientId !== undefined &&
                  conflicts.some(
                     (appointment) => appointment.patientId === patientId,
                  );
               const equipmentBusy =
                  visitType.requiredEquipmentId &&
                  conflicts.some(
                     (appointment) =>
                        appointment.equipmentId ===
                        visitType.requiredEquipmentId,
                  );
               const roomAvailable = roomIds.some(
                  (roomId) =>
                     !conflicts.some(
                        (appointment) => appointment.roomId === roomId,
                     ),
               );
               const slotKey = `${providerId}:${slotStart.getTime()}`;
               if (
                  !providerBusy &&
                  !patientBusy &&
                  !equipmentBusy &&
                  roomAvailable &&
                  !seen.has(slotKey)
               ) {
                  slots.push({ providerId, start: slotStart, end: slotEnd });
                  seen.add(slotKey);
               }
            }
         }
      }
   }
   return slots.sort(
      (left, right) =>
         left.start - right.start || left.providerId - right.providerId,
   );
}

function atTime(day, minutes) {
   const result = new Date(day);
   result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
   return result;
}

function timeToMinutes(value) {
   const [hour, minute] = String(value).split(':').map(Number);
   return hour * 60 + minute;
}

function isValidTime(value) {
   return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function normalizeSpecialty(value) {
   return value && value.trim().toLowerCase() !== 'any' ? value : null;
}

function endOfDay(value) {
   const result = new Date(value);
   result.setHours(23, 59, 59, 999);
   return result;
}
