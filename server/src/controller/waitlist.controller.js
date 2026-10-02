import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   appointments,
   providers,
   visitTypes,
   waitlistEntries,
} from '../db/schema/index.js';
import { closeOffer, confirmOffer } from '../services/waitlist.service.js';

export const joinWaitlist = async (req, res) => {
   if (!requirePatient(req, res)) {
      return;
   }
   const {
      provider_id: providerId,
      visit_type_id: visitTypeId,
      preferred_date_start: dateStart,
      preferred_date_end: dateEnd,
      preferred_time_start: timeStart,
      preferred_time_end: timeEnd,
   } = req.body ?? {};

   if (
      !Number.isInteger(Number(visitTypeId)) ||
      Number(visitTypeId) < 1 ||
      (providerId !== undefined &&
         providerId !== null &&
         (!Number.isInteger(Number(providerId)) || Number(providerId) < 1)) ||
      !isDate(dateStart) ||
      !isDate(dateEnd) ||
      dateStart < clinicToday() ||
      dateStart > dateEnd ||
      Boolean(timeStart) !== Boolean(timeEnd) ||
      (timeStart &&
         (!isTime(timeStart) || !isTime(timeEnd) || timeStart >= timeEnd))
   ) {
      return res.status(400).json({ error: 'Invalid waitlist criteria' });
   }

   try {
      const [visitType] = await db
         .select({ id: visitTypes.id })
         .from(visitTypes)
         .where(eq(visitTypes.id, Number(visitTypeId)))
         .limit(1);
      if (!visitType) {
         return res.status(404).json({ error: 'Visit type not found' });
      }
      if (providerId !== undefined && providerId !== null) {
         const [provider] = await db
            .select({ id: providers.id })
            .from(providers)
            .where(eq(providers.id, Number(providerId)))
            .limit(1);
         if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
         }
      }
      const [entry] = await db
         .insert(waitlistEntries)
         .values({
            patientId: req.user.patientId,
            providerId: providerId ? Number(providerId) : null,
            visitTypeId: Number(visitTypeId),
            preferredDateStart: dateStart,
            preferredDateEnd: dateEnd,
            preferredTimeStart: timeStart || null,
            preferredTimeEnd: timeEnd || null,
         })
         .returning();
      return res.status(201).json({ waitlistEntry: entry });
   } catch (error) {
      console.error('Failed to join waitlist:', error);
      return res.status(500).json({ error: 'Failed to join waitlist' });
   }
};

export const getMyWaitlist = async (req, res) => {
   if (!requirePatient(req, res)) {
      return;
   }
   try {
      const entries = await db
         .select({
            id: waitlistEntries.id,
            providerId: waitlistEntries.providerId,
            providerFirstName: providers.firstName,
            providerLastName: providers.lastName,
            visitTypeId: waitlistEntries.visitTypeId,
            visitTypeName: visitTypes.name,
            preferredDateStart: waitlistEntries.preferredDateStart,
            preferredDateEnd: waitlistEntries.preferredDateEnd,
            preferredTimeStart: waitlistEntries.preferredTimeStart,
            preferredTimeEnd: waitlistEntries.preferredTimeEnd,
            status: waitlistEntries.status,
            offeredAppointmentId: waitlistEntries.offeredAppointmentId,
            offerExpiresAt: waitlistEntries.offerExpiresAt,
            createdAt: waitlistEntries.createdAt,
            scheduledStart: appointments.scheduledStart,
            scheduledEnd: appointments.scheduledEnd,
         })
         .from(waitlistEntries)
         .leftJoin(providers, eq(providers.id, waitlistEntries.providerId))
         .innerJoin(visitTypes, eq(visitTypes.id, waitlistEntries.visitTypeId))
         .leftJoin(
            appointments,
            eq(appointments.id, waitlistEntries.offeredAppointmentId),
         )
         .where(eq(waitlistEntries.patientId, req.user.patientId))
         .orderBy(asc(waitlistEntries.createdAt));
      return res.json({ waitlistEntries: entries });
   } catch (error) {
      console.error('Failed to fetch waitlist:', error);
      return res.status(500).json({ error: 'Failed to fetch waitlist' });
   }
};

export const confirmWaitlistOffer = async (req, res) => {
   if (!requirePatient(req, res)) {
      return;
   }
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid waitlist entry ID' });
   }
   try {
      const result = await confirmOffer(id, req.user.patientId);
      if (result.expired) {
         await closeOffer(id, 'expired', req.user.patientId);
         return res.status(409).json({ error: 'Waitlist offer expired' });
      }
      if (result.error) {
         return res.status(result.status).json({ error: result.error });
      }
      return res.json({ status: 'confirmed' });
   } catch (error) {
      console.error('Failed to confirm waitlist offer:', error);
      return res
         .status(500)
         .json({ error: 'Failed to confirm waitlist offer' });
   }
};

export const declineWaitlistOffer = async (req, res) => {
   if (!requirePatient(req, res)) {
      return;
   }
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid waitlist entry ID' });
   }
   try {
      const result = await closeOffer(id, 'cancelled', req.user.patientId);
      if (result.error) {
         return res.status(result.status).json({ error: result.error });
      }
      return res.json({ status: result.outcome });
   } catch (error) {
      console.error('Failed to decline waitlist offer:', error);
      return res
         .status(500)
         .json({ error: 'Failed to decline waitlist offer' });
   }
};

export const cancelWaitlistEntry = async (req, res) => {
   if (!requirePatient(req, res)) {
      return;
   }
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid waitlist entry ID' });
   }
   try {
      const [entry] = await db
         .select({ status: waitlistEntries.status })
         .from(waitlistEntries)
         .where(
            and(
               eq(waitlistEntries.id, id),
               eq(waitlistEntries.patientId, req.user.patientId),
            ),
         )
         .limit(1);
      if (!entry) {
         return res.status(404).json({ error: 'Waitlist entry not found' });
      }
      if (entry.status === 'offered') {
         const result = await closeOffer(id, 'cancelled', req.user.patientId);
         if (result.error) {
            return res.status(result.status).json({ error: result.error });
         }
      } else if (entry.status === 'waiting') {
         const [cancelled] = await db
            .update(waitlistEntries)
            .set({ status: 'cancelled' })
            .where(
               and(
                  eq(waitlistEntries.id, id),
                  eq(waitlistEntries.patientId, req.user.patientId),
                  eq(waitlistEntries.status, 'waiting'),
               ),
            )
            .returning({ id: waitlistEntries.id });
         if (!cancelled) {
            return res.status(409).json({
               error: 'Waitlist entry changed. Refresh and try again.',
            });
         }
      } else {
         return res
            .status(409)
            .json({ error: 'This waitlist entry is already closed' });
      }
      return res.status(204).end();
   } catch (error) {
      console.error('Failed to cancel waitlist entry:', error);
      return res.status(500).json({ error: 'Failed to cancel waitlist entry' });
   }
};

function requirePatient(req, res) {
   if (req.user?.role !== 'patient' || !req.user.patientId) {
      res.status(403).json({ error: 'Patient access required' });
      return false;
   }
   return true;
}

function clinicToday() {
   const now = new Date();
   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isDate(value) {
   if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
   }
   const date = new Date(`${value}T00:00:00.000Z`);
   return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
   );
}

function isTime(value) {
   return (
      typeof value === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
   );
}
