import {
   and,
   asc,
   desc,
   eq,
   gte,
   ilike,
   inArray,
   isNull,
   lte,
   ne,
   or,
   sql,
} from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   appeals,
   appointments,
   chartNotes,
   conditions,
   equipment,
   insurancePlans,
   labs,
   medications,
   patientCoverage,
   patients,
   preVisitSummaries,
   priorAuthorizations,
   providerAvailability,
   providers,
   rooms,
   visitTypes,
   waitlistEntries,
} from '../db/schema/index.js';
import { offerNextWaitlistEntry } from './waitlist.service.js';
import { buildPreVisitPrompt, generateGeminiDraft } from './gemini.service.js';
import { recordAudit } from './audit.service.js';
import { notifyPatient } from './notification.service.js';
import {
   manilaDateBounds,
   manilaDateString,
   manilaDayOfWeek,
} from '../utils/timezone.js';

export async function getStaffDashboardSnapshot() {
   const { startOfDay, endOfDay } = manilaDateBounds();

   // 1. Today's appointments count
   const [todayAppointments] = await db
      .select({ count: sql`count(*)::int` })
      .from(appointments)
      .where(
         and(
            gte(appointments.scheduledStart, startOfDay),
            lte(appointments.scheduledStart, endOfDay),
            ne(appointments.status, 'cancelled'),
         ),
      );

   // 2. Pending prior authorizations (needs_draft, drafted, submitted)
   const [pendingPriorAuths] = await db
      .select({ count: sql`count(*)::int` })
      .from(priorAuthorizations)
      .where(
         inArray(priorAuthorizations.status, [
            'needs_draft',
            'drafted',
            'submitted',
         ]),
      );

   // 3. Pending appeals (drafted, submitted)
   const [pendingAppeals] = await db
      .select({ count: sql`count(*)::int` })
      .from(appeals)
      .where(inArray(appeals.status, ['drafted', 'submitted']));

   // 4. Open waitlist entries / offers
   const [openWaitlistSlots] = await db
      .select({ count: sql`count(*)::int` })
      .from(waitlistEntries)
      .where(inArray(waitlistEntries.status, ['offered', 'waiting']));

   // 5. Today's appointments list
   const todayAppointmentsList = await db
      .select({
         id: appointments.id,
         scheduledStart: appointments.scheduledStart,
         scheduledEnd: appointments.scheduledEnd,
         status: appointments.status,
         insuranceStatus: appointments.insuranceStatus,
         patientId: appointments.patientId,
         patientFirstName: patients.firstName,
         patientLastName: patients.lastName,
         providerId: appointments.providerId,
         providerFirstName: providers.firstName,
         providerLastName: providers.lastName,
         visitTypeId: appointments.visitTypeId,
         visitTypeName: visitTypes.name,
         roomId: appointments.roomId,
         roomName: rooms.name,
         priorAuthStatus: priorAuthorizations.status,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(providers, eq(providers.id, appointments.providerId))
      .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
      .leftJoin(rooms, eq(rooms.id, appointments.roomId))
      .leftJoin(
         priorAuthorizations,
         eq(priorAuthorizations.appointmentId, appointments.id),
      )
      .where(
         and(
            gte(appointments.scheduledStart, startOfDay),
            lte(appointments.scheduledStart, endOfDay),
            ne(appointments.status, 'cancelled'),
         ),
      )
      .orderBy(asc(appointments.scheduledStart));

   return {
      snapshot: {
         todayAppointmentsCount: todayAppointments?.count ?? 0,
         pendingPriorAuthsCount: pendingPriorAuths?.count ?? 0,
         pendingAppealsCount: pendingAppeals?.count ?? 0,
         openWaitlistSlotsCount: openWaitlistSlots?.count ?? 0,
      },
      todayAppointments: todayAppointmentsList,
   };
}

export async function searchDoctors(searchQuery = '') {
   let query = db
      .select({
         id: providers.id,
         firstName: providers.firstName,
         lastName: providers.lastName,
         specialty: providers.specialty,
         npiNumber: providers.npiNumber,
         createdAt: providers.createdAt,
      })
      .from(providers);

   const trimmed = searchQuery.trim();
   const filters = [eq(providers.isActive, true)];
   if (trimmed) {
      filters.push(
         or(
            ilike(providers.firstName, `%${trimmed}%`),
            ilike(providers.lastName, `%${trimmed}%`),
            ilike(providers.specialty, `%${trimmed}%`),
            ilike(providers.npiNumber, `%${trimmed}%`),
         ),
      );
   }
   query = query.where(and(...filters));

   const doctorList = await query.orderBy(asc(providers.lastName));

   // Include availability for each provider
   const availabilities = await db
      .select()
      .from(providerAvailability)
      .orderBy(
         asc(providerAvailability.providerId),
         asc(providerAvailability.dayOfWeek),
      );

   const availMap = new Map();
   for (const av of availabilities) {
      if (!availMap.has(av.providerId)) availMap.set(av.providerId, []);
      availMap.get(av.providerId).push({
         dayOfWeek: av.dayOfWeek,
         startTime: av.startTime,
         endTime: av.endTime,
      });
   }

   return doctorList.map((doc) => ({
      ...doc,
      availability: availMap.get(doc.id) ?? [],
   }));
}

export async function getDoctorSchedule(providerId, startDate, endDate) {
   return await db
      .select({
         id: appointments.id,
         scheduledStart: appointments.scheduledStart,
         scheduledEnd: appointments.scheduledEnd,
         status: appointments.status,
         insuranceStatus: appointments.insuranceStatus,
         patientId: appointments.patientId,
         patientFirstName: patients.firstName,
         patientLastName: patients.lastName,
         patientDob: patients.dateOfBirth,
         isNewPatient: patients.isNewPatient,
         visitTypeId: appointments.visitTypeId,
         visitTypeName: visitTypes.name,
         durationMinutes: visitTypes.durationMinutes,
         roomId: appointments.roomId,
         roomName: rooms.name,
         equipmentId: appointments.equipmentId,
         equipmentName: equipment.name,
         priorAuthId: priorAuthorizations.id,
         priorAuthStatus: priorAuthorizations.status,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
      .leftJoin(rooms, eq(rooms.id, appointments.roomId))
      .leftJoin(equipment, eq(equipment.id, appointments.equipmentId))
      .leftJoin(
         priorAuthorizations,
         eq(priorAuthorizations.appointmentId, appointments.id),
      )
      .where(
         and(
            eq(appointments.providerId, providerId),
            gte(appointments.scheduledStart, startDate),
            lte(appointments.scheduledStart, endDate),
            ne(appointments.status, 'cancelled'),
         ),
      )
      .orderBy(asc(appointments.scheduledStart));
}

export async function searchPatients(searchQuery = '') {
   let query = db
      .select({
         id: patients.id,
         firstName: patients.firstName,
         lastName: patients.lastName,
         dateOfBirth: patients.dateOfBirth,
         gender: patients.gender,
         contactEmail: patients.contactEmail,
         contactPhone: patients.contactPhone,
         isNewPatient: patients.isNewPatient,
         intakeReasonNote: patients.intakeReasonNote,
         createdAt: patients.createdAt,
      })
      .from(patients);

   const trimmed = searchQuery.trim();
   if (trimmed) {
      if (/^\d+$/.test(trimmed)) {
         query = query.where(
            or(
               eq(patients.id, Number(trimmed)),
               ilike(patients.firstName, `%${trimmed}%`),
               ilike(patients.lastName, `%${trimmed}%`),
               ilike(patients.contactEmail, `%${trimmed}%`),
            ),
         );
      } else {
         query = query.where(
            or(
               ilike(patients.firstName, `%${trimmed}%`),
               ilike(patients.lastName, `%${trimmed}%`),
               ilike(patients.contactEmail, `%${trimmed}%`),
            ),
         );
      }
   }

   return await query.orderBy(asc(patients.lastName)).limit(50);
}

export async function getPatientDetailWithChart(patientId) {
   const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

   if (!patient) return null;

   const coverages = await db
      .select({
         id: patientCoverage.id,
         policyNumber: patientCoverage.policyNumber,
         memberId: patientCoverage.memberId,
         status: patientCoverage.status,
         coverageStart: patientCoverage.coverageStart,
         coverageEnd: patientCoverage.coverageEnd,
         verifiedAt: patientCoverage.verifiedAt,
         insurerName: insurancePlans.insurerName,
         planName: insurancePlans.planName,
         planType: insurancePlans.planType,
      })
      .from(patientCoverage)
      .innerJoin(
         insurancePlans,
         eq(insurancePlans.id, patientCoverage.insurancePlanId),
      )
      .where(eq(patientCoverage.patientId, patientId))
      .orderBy(desc(patientCoverage.createdAt));

   const patientConditions = await db
      .select()
      .from(conditions)
      .where(eq(conditions.patientId, patientId))
      .orderBy(desc(conditions.diagnosedDate));

   const patientChartNotes = await db
      .select()
      .from(chartNotes)
      .where(eq(chartNotes.patientId, patientId))
      .orderBy(desc(chartNotes.encounterDate))
      .limit(10);

   const patientLabs = await db
      .select()
      .from(labs)
      .where(eq(labs.patientId, patientId))
      .orderBy(desc(labs.resultDate))
      .limit(15);

   const patientMedications = await db
      .select()
      .from(medications)
      .where(
         and(
            eq(medications.patientId, patientId),
            or(
               isNull(medications.endDate),
               gte(medications.endDate, manilaDateString(new Date())),
            ),
         ),
      )
      .orderBy(desc(medications.startDate));

   const appointmentHistory = await db
      .select({
         id: appointments.id,
         scheduledStart: appointments.scheduledStart,
         scheduledEnd: appointments.scheduledEnd,
         status: appointments.status,
         insuranceStatus: appointments.insuranceStatus,
         visitTypeName: visitTypes.name,
         providerFirstName: providers.firstName,
         providerLastName: providers.lastName,
      })
      .from(appointments)
      .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
      .innerJoin(providers, eq(providers.id, appointments.providerId))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.scheduledStart))
      .limit(20);

   return {
      patient,
      coverages,
      conditions: patientConditions,
      chartNotes: patientChartNotes,
      labs: patientLabs,
      medications: patientMedications,
      appointments: appointmentHistory,
   };
}

export async function getAppointmentPreVisitClinicalData(appointmentId) {
   const [appt] = await db
      .select({
         id: appointments.id,
         scheduledStart: appointments.scheduledStart,
         scheduledEnd: appointments.scheduledEnd,
         status: appointments.status,
         insuranceStatus: appointments.insuranceStatus,
         patientId: appointments.patientId,
         patientFirstName: patients.firstName,
         patientLastName: patients.lastName,
         patientDob: patients.dateOfBirth,
         isNewPatient: patients.isNewPatient,
         intakeReasonNote: patients.intakeReasonNote,
         providerId: appointments.providerId,
         providerFirstName: providers.firstName,
         providerLastName: providers.lastName,
         providerSpecialty: providers.specialty,
         visitTypeId: appointments.visitTypeId,
         visitTypeName: visitTypes.name,
         visitTypeDescription: visitTypes.description,
         roomId: appointments.roomId,
         roomName: rooms.name,
         equipmentId: appointments.equipmentId,
         equipmentName: equipment.name,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(providers, eq(providers.id, appointments.providerId))
      .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
      .leftJoin(rooms, eq(rooms.id, appointments.roomId))
      .leftJoin(equipment, eq(equipment.id, appointments.equipmentId))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

   if (!appt) return null;

   const patientId = appt.patientId;

   // Get clinical records
   const patientConditions = await db
      .select()
      .from(conditions)
      .where(eq(conditions.patientId, patientId))
      .orderBy(desc(conditions.diagnosedDate));

   const patientChartNotes = await db
      .select()
      .from(chartNotes)
      .where(eq(chartNotes.patientId, patientId))
      .orderBy(desc(chartNotes.encounterDate))
      .limit(5);

   const patientLabs = await db
      .select()
      .from(labs)
      .where(eq(labs.patientId, patientId))
      .orderBy(desc(labs.resultDate))
      .limit(10);

   const patientMedications = await db
      .select()
      .from(medications)
      .where(
         and(
            eq(medications.patientId, patientId),
            or(
               isNull(medications.endDate),
               gte(medications.endDate, manilaDateString(new Date())),
            ),
         ),
      )
      .orderBy(desc(medications.startDate));

   const [storedSummary] = await db
      .select()
      .from(preVisitSummaries)
      .where(eq(preVisitSummaries.appointmentId, appointmentId))
      .limit(1);

   // Determine if new patient fallback message should be displayed per docs.md:
   // "If a patient has zero prior encounters, skip the AI call entirely and show a simple fallback message:
   // 'New patient — no prior chart history available. Reason for visit: [intake reason/referral note].'"
   const hasPriorHistory =
      !appt.isNewPatient &&
      (patientChartNotes.length > 0 || patientConditions.length > 0);

   const fallbackSummary = !hasPriorHistory
      ? `New patient — no prior chart history available. Reason for visit: ${
           appt.intakeReasonNote || appt.visitTypeName || 'General Consultation'
        }.`
      : null;

   const deterministicSummary =
      fallbackSummary ||
      `Established patient with ${patientConditions.length} active condition(s), ${patientChartNotes.length} recent encounter(s), ${patientLabs.length} recent lab result(s), and ${patientMedications.length} active medication(s).`;
   const generated = fallbackSummary
      ? { text: deterministicSummary, source: 'fallback' }
      : await generateGeminiDraft({
           prompt: buildPreVisitPrompt({
              appointment: appt,
              conditions: patientConditions,
              encounters: patientChartNotes,
              labs: patientLabs,
              medications: patientMedications,
           }),
           fallback: deterministicSummary,
        });
   const summaryText = generated.text;
   const rawDataSnapshot = {
      conditions: patientConditions,
      recentEncounters: patientChartNotes,
      recentLabs: patientLabs,
      activeMedications: patientMedications,
   };
   if (storedSummary) {
      await db
         .update(preVisitSummaries)
         .set({ summaryText, rawDataSnapshot, generatedAt: new Date() })
         .where(eq(preVisitSummaries.id, storedSummary.id));
   } else {
      await db.insert(preVisitSummaries).values({
         appointmentId,
         summaryText,
         rawDataSnapshot,
      });
   }
   void recordAudit({
      entityType: 'pre_visit_summary',
      entityId: appointmentId,
      action:
         generated.source === 'gemini' ? 'ai_generated' : 'fallback_generated',
      newValue: { source: generated.source },
   });

   return {
      appointment: appt,
      isFallbackNotice: !hasPriorHistory,
      aiSource: generated.source,
      fallbackSummary,
      preVisitSummary: summaryText,
      clinicalData: {
         conditions: patientConditions,
         recentEncounters: patientChartNotes,
         recentLabs: patientLabs,
         activeMedications: patientMedications,
      },
   };
}

export async function getResourceUtilization(date) {
   const dateStr = manilaDateString(date);
   const { startOfDay, endOfDay } = manilaDateBounds(dateStr);

   const allRooms = await db.select().from(rooms).orderBy(asc(rooms.id));
   const allEquipment = await db
      .select()
      .from(equipment)
      .orderBy(asc(equipment.id));
   const allProviders = await db
      .select()
      .from(providers)
      .orderBy(asc(providers.id));

   const dayAppointments = await db
      .select({
         id: appointments.id,
         roomId: appointments.roomId,
         equipmentId: appointments.equipmentId,
         providerId: appointments.providerId,
         scheduledStart: appointments.scheduledStart,
         scheduledEnd: appointments.scheduledEnd,
         status: appointments.status,
         visitTypeName: visitTypes.name,
      })
      .from(appointments)
      .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
      .where(
         and(
            gte(appointments.scheduledStart, startOfDay),
            lte(appointments.scheduledStart, endOfDay),
            ne(appointments.status, 'cancelled'),
         ),
      );

   const dayOfWeek = manilaDayOfWeek(startOfDay);
   const availabilities = await db
      .select()
      .from(providerAvailability)
      .where(eq(providerAvailability.dayOfWeek, dayOfWeek));

   const roomStats = allRooms.map((r) => {
      const roomAppts = dayAppointments.filter((a) => a.roomId === r.id);
      const bookedMinutes = roomAppts.reduce((acc, a) => {
         return (
            acc +
            (new Date(a.scheduledEnd) - new Date(a.scheduledStart)) / 60000
         );
      }, 0);
      return {
         ...r,
         appointmentsCount: roomAppts.length,
         bookedMinutes,
         appointments: roomAppts,
      };
   });

   const equipmentStats = allEquipment.map((eqp) => {
      const eqpAppts = dayAppointments.filter((a) => a.equipmentId === eqp.id);
      const bookedMinutes = eqpAppts.reduce((acc, a) => {
         return (
            acc +
            (new Date(a.scheduledEnd) - new Date(a.scheduledStart)) / 60000
         );
      }, 0);
      return {
         ...eqp,
         appointmentsCount: eqpAppts.length,
         bookedMinutes,
         appointments: eqpAppts,
      };
   });

   const providerStats = allProviders.map((prov) => {
      const provAppts = dayAppointments.filter((a) => a.providerId === prov.id);
      const provAvail = availabilities.filter(
         (av) => av.providerId === prov.id,
      );
      const availableMinutes = provAvail.reduce((acc, av) => {
         const [sh, sm] = av.startTime.split(':').map(Number);
         const [eh, em] = av.endTime.split(':').map(Number);
         return acc + (eh * 60 + em - (sh * 60 + sm));
      }, 0);
      const bookedMinutes = provAppts.reduce((acc, a) => {
         return (
            acc +
            (new Date(a.scheduledEnd) - new Date(a.scheduledStart)) / 60000
         );
      }, 0);
      return {
         ...prov,
         isScheduledToWork: provAvail.length > 0,
         availableMinutes,
         bookedMinutes,
         utilizationPct:
            availableMinutes > 0
               ? Math.min(
                    100,
                    Math.round((bookedMinutes / availableMinutes) * 100),
                 )
               : 0,
         appointmentsCount: provAppts.length,
      };
   });

   return {
      date: dateStr,
      totalBookedAppointments: dayAppointments.length,
      rooms: roomStats,
      equipment: equipmentStats,
      providers: providerStats,
   };
}

export async function staffCancelAppointment(appointmentId) {
   return await db.transaction(
      async (tx) => {
         const [appointment] = await tx
            .select()
            .from(appointments)
            .where(
               and(
                  eq(appointments.id, appointmentId),
                  eq(appointments.status, 'scheduled'),
               ),
            )
            .limit(1);

         if (!appointment) return null;

         const [updated] = await tx
            .update(appointments)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(
               and(
                  eq(appointments.id, appointmentId),
                  eq(appointments.status, 'scheduled'),
               ),
            )
            .returning();

         if (!updated) return null;

         await notifyPatient(
            tx,
            appointment.patientId,
            'appointment_cancelled',
            'Your appointment was cancelled by clinic staff.',
         );

         // Cancel any pending waitlist offer on this appointment
         const [waitlistOffer] = await tx
            .select({ id: waitlistEntries.id })
            .from(waitlistEntries)
            .where(
               and(
                  eq(waitlistEntries.offeredAppointmentId, appointmentId),
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

         // Automatically cascade offer to next matching waitlist entry per docs.md:
         // "If you cancel a slot, that's what triggers the waitlist auto-fill —
         // the system finds the next matching waitlisted patient and sends them the offer automatically."
         const offeredWaitlistEntry = await offerNextWaitlistEntry(
            tx,
            appointment,
         );

         return {
            cancelledAppointment: updated,
            offeredWaitlistEntry,
         };
      },
      { isolationLevel: 'serializable' },
   );
}

export async function staffRescheduleAppointment(
   appointmentId,
   { newStart, newEnd, newProviderId, newRoomId, newEquipmentId },
) {
   return await db.transaction(
      async (tx) => {
         const [appointment] = await tx
            .select()
            .from(appointments)
            .where(
               and(
                  eq(appointments.id, appointmentId),
                  eq(appointments.status, 'scheduled'),
               ),
            )
            .limit(1);

         if (!appointment) return { error: 'not_found' };

         const providerId = newProviderId ?? appointment.providerId;
         const roomId = newRoomId ?? appointment.roomId;
         const equipmentId =
            newEquipmentId !== undefined
               ? newEquipmentId
               : appointment.equipmentId;
         const scheduledStart = new Date(newStart);
         const scheduledEnd = new Date(newEnd);

         if (
            Number.isNaN(scheduledStart.getTime()) ||
            Number.isNaN(scheduledEnd.getTime()) ||
            scheduledEnd <= scheduledStart
         ) {
            return { error: 'invalid_dates' };
         }

         // Check for conflicts at the new time (provider, room, equipment)
         const conflictConditions = [
            ne(appointments.id, appointmentId),
            ne(appointments.status, 'cancelled'),
            lte(appointments.scheduledStart, scheduledEnd),
            gte(appointments.scheduledEnd, scheduledStart),
         ];

         // Provider conflict
         const [providerConflict] = await tx
            .select({ id: appointments.id })
            .from(appointments)
            .where(
               and(
                  ...conflictConditions,
                  eq(appointments.providerId, providerId),
               ),
            )
            .limit(1);

         if (providerConflict) {
            return {
               error: 'conflict',
               conflictType: 'provider',
               conflictAppointmentId: providerConflict.id,
            };
         }

         // Room conflict
         if (roomId) {
            const [roomConflict] = await tx
               .select({ id: appointments.id })
               .from(appointments)
               .where(
                  and(...conflictConditions, eq(appointments.roomId, roomId)),
               )
               .limit(1);

            if (roomConflict) {
               return {
                  error: 'conflict',
                  conflictType: 'room',
                  conflictAppointmentId: roomConflict.id,
               };
            }
         }

         // Equipment conflict
         if (equipmentId) {
            const [equipConflict] = await tx
               .select({ id: appointments.id })
               .from(appointments)
               .where(
                  and(
                     ...conflictConditions,
                     eq(appointments.equipmentId, equipmentId),
                  ),
               )
               .limit(1);

            if (equipConflict) {
               return {
                  error: 'conflict',
                  conflictType: 'equipment',
                  conflictAppointmentId: equipConflict.id,
               };
            }
         }

         // Store the original slot details for waitlist auto-fill
         const originalSlot = { ...appointment };

         // Update the appointment with new schedule
         const [updated] = await tx
            .update(appointments)
            .set({
               scheduledStart,
               scheduledEnd,
               providerId,
               roomId,
               equipmentId,
               updatedAt: new Date(),
            })
            .where(
               and(
                  eq(appointments.id, appointmentId),
                  eq(appointments.status, 'scheduled'),
               ),
            )
            .returning();

         if (!updated) return { error: 'not_found' };

         await notifyPatient(
            tx,
            appointment.patientId,
            'appointment_rescheduled',
            'Your appointment was rescheduled by clinic staff.',
         );

         // Cancel any pending waitlist offer on this appointment
         const [waitlistOffer] = await tx
            .select({ id: waitlistEntries.id })
            .from(waitlistEntries)
            .where(
               and(
                  eq(waitlistEntries.offeredAppointmentId, appointmentId),
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

         // Trigger waitlist auto-fill for the freed original slot
         const offeredWaitlistEntry = await offerNextWaitlistEntry(
            tx,
            originalSlot,
         );

         return {
            rescheduledAppointment: updated,
            offeredWaitlistEntry,
         };
      },
      { isolationLevel: 'serializable' },
   );
}

export async function getStaffWaitlistMonitor(statusFilter) {
   let query = db
      .select({
         id: waitlistEntries.id,
         patientId: waitlistEntries.patientId,
         patientFirstName: patients.firstName,
         patientLastName: patients.lastName,
         patientContactPhone: patients.contactPhone,
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
      })
      .from(waitlistEntries)
      .innerJoin(patients, eq(patients.id, waitlistEntries.patientId))
      .innerJoin(visitTypes, eq(visitTypes.id, waitlistEntries.visitTypeId))
      .leftJoin(providers, eq(providers.id, waitlistEntries.providerId));

   if (statusFilter && statusFilter !== 'all') {
      query = query.where(eq(waitlistEntries.status, statusFilter));
   }

   return await query.orderBy(asc(waitlistEntries.createdAt));
}
