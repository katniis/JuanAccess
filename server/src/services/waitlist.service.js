import { and, asc, eq, gt, gte, isNull, lt, lte, ne, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   appointments,
   notifications,
   providers,
   users,
   visitTypes,
   waitlistEntries,
} from '../db/schema/index.js';
import { getCoverageStatusForAppointment } from './insurance.service.js';

export const WAITLIST_OFFER_MINUTES = 30;

export async function offerNextWaitlistEntry(tx, freedAppointment) {
   const [provider] = await tx
      .select({ specialty: providers.specialty })
      .from(providers)
      .where(eq(providers.id, freedAppointment.providerId))
      .limit(1);
   const [visitType] = await tx
      .select()
      .from(visitTypes)
      .where(eq(visitTypes.id, freedAppointment.visitTypeId))
      .limit(1);
   if (!provider || !visitType) {
      return null;
   }
   if (
      normalizeSpecialty(visitType.requiredSpecialty) &&
      normalizeSpecialty(visitType.requiredSpecialty) !== provider.specialty
   ) {
      return null;
   }
   if (
      visitType.requiredEquipmentId &&
      visitType.requiredEquipmentId !== freedAppointment.equipmentId
   ) {
      return null;
   }
   if (
      new Date(freedAppointment.scheduledEnd) -
         new Date(freedAppointment.scheduledStart) !==
      visitType.durationMinutes * 60000
   ) {
      return null;
   }

   const slotStart = new Date(freedAppointment.scheduledStart);
   const slotEnd = new Date(freedAppointment.scheduledEnd);
   const date = clinicDate(slotStart);
   const startTime = clinicTime(slotStart);
   const endTime = clinicTime(slotEnd);
   const candidates = await tx
      .select()
      .from(waitlistEntries)
      .where(
         and(
            eq(waitlistEntries.status, 'waiting'),
            eq(waitlistEntries.visitTypeId, freedAppointment.visitTypeId),
            or(
               isNull(waitlistEntries.providerId),
               eq(waitlistEntries.providerId, freedAppointment.providerId),
            ),
            lte(waitlistEntries.preferredDateStart, date),
            gte(waitlistEntries.preferredDateEnd, date),
         ),
      )
      .orderBy(asc(waitlistEntries.createdAt));

   for (const entry of candidates) {
      if (
         entry.preferredTimeStart &&
         (entry.preferredTimeStart > startTime ||
            entry.preferredTimeEnd < endTime)
      ) {
         continue;
      }
      const [conflict] = await tx
         .select({ id: appointments.id })
         .from(appointments)
         .where(
            and(
               ne(appointments.status, 'cancelled'),
               lt(
                  appointments.scheduledStart,
                  new Date(slotEnd.getTime() + graceMs()),
               ),
               gt(
                  appointments.scheduledEnd,
                  new Date(slotStart.getTime() - graceMs()),
               ),
               or(
                  eq(appointments.providerId, freedAppointment.providerId),
                  eq(appointments.roomId, freedAppointment.roomId),
                  eq(appointments.patientId, entry.patientId),
                  freedAppointment.equipmentId
                     ? eq(
                          appointments.equipmentId,
                          freedAppointment.equipmentId,
                       )
                     : undefined,
               ),
            ),
         )
         .limit(1);
      if (conflict) {
         continue;
      }

      const insuranceStatus = await getCoverageStatusForAppointment(
         tx,
         entry.patientId,
         slotStart,
      );
      const [appointment] = await tx
         .insert(appointments)
         .values({
            patientId: entry.patientId,
            providerId: freedAppointment.providerId,
            roomId: freedAppointment.roomId,
            equipmentId: freedAppointment.equipmentId,
            visitTypeId: entry.visitTypeId,
            scheduledStart: slotStart,
            scheduledEnd: slotEnd,
            insuranceStatus,
         })
         .returning();
      const offerExpiresAt = new Date(
         Date.now() + WAITLIST_OFFER_MINUTES * 60000,
      );
      await tx
         .update(waitlistEntries)
         .set({
            status: 'offered',
            offeredAppointmentId: appointment.id,
            offerExpiresAt,
         })
         .where(
            and(
               eq(waitlistEntries.id, entry.id),
               eq(waitlistEntries.status, 'waiting'),
            ),
         );
      await notifyPatient(
         tx,
         entry.patientId,
         'waitlist_offer',
         `A matching appointment is reserved for you. Confirm within ${WAITLIST_OFFER_MINUTES} minutes.`,
      );
      return { entryId: entry.id, appointmentId: appointment.id };
   }
   return null;
}

export async function processExpiredWaitlistOffers() {
   const now = new Date();
   const expired = await db
      .select({ id: waitlistEntries.id })
      .from(waitlistEntries)
      .where(
         and(
            eq(waitlistEntries.status, 'offered'),
            lte(waitlistEntries.offerExpiresAt, now),
         ),
      )
      .orderBy(asc(waitlistEntries.offerExpiresAt));

   for (const { id } of expired) {
      try {
         await closeOffer(id, 'expired');
      } catch (error) {
         console.error(`Failed to expire waitlist offer ${id}:`, error);
      }
   }
}

export async function closeOffer(entryId, outcome, patientId = undefined) {
   return db.transaction(
      async (tx) => {
         const filters = [
            eq(waitlistEntries.id, entryId),
            eq(waitlistEntries.status, 'offered'),
         ];
         if (patientId !== undefined) {
            filters.push(eq(waitlistEntries.patientId, patientId));
         }
         const [entry] = await tx
            .select()
            .from(waitlistEntries)
            .where(and(...filters))
            .limit(1);
         if (!entry) {
            return { error: 'Waitlist offer not found', status: 404 };
         }
         if (entry.offerExpiresAt <= new Date()) {
            outcome = 'expired';
         }

         let freedAppointment;
         if (entry.offeredAppointmentId) {
            const [appointment] = await tx
               .select()
               .from(appointments)
               .where(eq(appointments.id, entry.offeredAppointmentId))
               .limit(1);
            if (appointment?.status === 'scheduled') {
               freedAppointment = appointment;
               await tx
                  .update(appointments)
                  .set({ status: 'cancelled', updatedAt: new Date() })
                  .where(eq(appointments.id, appointment.id));
            }
         }
         await tx
            .update(waitlistEntries)
            .set({ status: outcome, offerExpiresAt: null })
            .where(eq(waitlistEntries.id, entry.id));
         if (freedAppointment) {
            await offerNextWaitlistEntry(tx, freedAppointment);
         }
         return { outcome };
      },
      { isolationLevel: 'serializable' },
   );
}

export async function confirmOffer(entryId, patientId) {
   return db.transaction(
      async (tx) => {
         const [entry] = await tx
            .select()
            .from(waitlistEntries)
            .where(
               and(
                  eq(waitlistEntries.id, entryId),
                  eq(waitlistEntries.patientId, patientId),
                  eq(waitlistEntries.status, 'offered'),
               ),
            )
            .limit(1);
         if (!entry) {
            return { error: 'Waitlist offer not found', status: 404 };
         }
         if (entry.offerExpiresAt <= new Date()) {
            return { expired: true };
         }
         const [appointment] = await tx
            .select({ status: appointments.status })
            .from(appointments)
            .where(eq(appointments.id, entry.offeredAppointmentId))
            .limit(1);
         if (!appointment || appointment.status !== 'scheduled') {
            return {
               error: 'Reserved appointment is no longer available',
               status: 409,
            };
         }
         await tx
            .update(waitlistEntries)
            .set({ status: 'confirmed', offerExpiresAt: null })
            .where(eq(waitlistEntries.id, entry.id));
         await notifyPatient(
            tx,
            patientId,
            'waitlist_confirmed',
            'Your waitlist appointment is confirmed.',
         );
         return { confirmed: true };
      },
      { isolationLevel: 'serializable' },
   );
}

async function notifyPatient(tx, patientId, type, message) {
   const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.patientId, patientId), eq(users.role, 'patient')))
      .limit(1);
   if (user) {
      await tx.insert(notifications).values({ userId: user.id, type, message });
   }
}

function normalizeSpecialty(value) {
   return value && value.trim().toLowerCase() !== 'any' ? value : null;
}

function clinicDate(value) {
   const date = new Date(value);
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function clinicTime(value) {
   const date = new Date(value);
   return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

function graceMs() {
   return 15 * 60 * 1000;
}
