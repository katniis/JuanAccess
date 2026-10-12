import { and, asc, desc, eq, gte, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   appeals,
   appointments,
   clinicalGuidelines,
   conditions,
   insurancePlans,
   patientCoverage,
   patients,
   priorAuthorizations,
   providers,
   visitTypes,
} from '../db/schema/index.js';
import { mockInsurerService } from '../services/insurer.service.js';
import {
   getAppointmentPreVisitClinicalData,
   getDoctorSchedule,
   getPatientDetailWithChart,
   getResourceUtilization,
   getStaffDashboardSnapshot,
   getStaffWaitlistMonitor,
   searchDoctors,
   searchPatients,
   staffCancelAppointment,
   staffRescheduleAppointment,
} from '../services/staff.service.js';
import { getCoverageStatusForAppointment } from '../services/insurance.service.js';
import { manilaDateBounds } from '../utils/timezone.js';

export const getDashboard = async (req, res) => {
   try {
      const data = await getStaffDashboardSnapshot();
      return res.status(200).json(data);
   } catch (error) {
      console.error('Failed to fetch staff dashboard:', error);
      return res.status(500).json({ error: 'Failed to fetch staff dashboard' });
   }
};

export const getDoctors = async (req, res) => {
   try {
      const doctors = await searchDoctors(req.query.search || '');
      return res.status(200).json({ doctors });
   } catch (error) {
      console.error('Failed to search doctors:', error);
      return res.status(500).json({ error: 'Failed to search doctors' });
   }
};

export const getDoctorScheduleHandler = async (req, res) => {
   const providerId = Number(req.params.id);
   if (!Number.isInteger(providerId) || providerId < 1) {
      return res.status(400).json({ error: 'Invalid provider ID' });
   }

   const dateParam = req.query.date || null;
   let startDate, endDate;
   if (req.query.range_start && req.query.range_end) {
      startDate = new Date(req.query.range_start);
      endDate = new Date(req.query.range_end);
   } else {
      const bounds = manilaDateBounds(dateParam);
      startDate = bounds.startOfDay;
      endDate = bounds.endOfDay;
   }

   if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date parameters' });
   }

   try {
      const schedule = await getDoctorSchedule(providerId, startDate, endDate);
      return res.status(200).json({ providerId, schedule });
   } catch (error) {
      console.error('Failed to fetch doctor schedule:', error);
      return res.status(500).json({ error: 'Failed to fetch doctor schedule' });
   }
};

export const getPatients = async (req, res) => {
   try {
      const patientList = await searchPatients(
         req.query.query || req.query.search || '',
      );
      return res.status(200).json({ patients: patientList });
   } catch (error) {
      console.error('Failed to search patients:', error);
      return res.status(500).json({ error: 'Failed to search patients' });
   }
};

export const getPatientDetails = async (req, res) => {
   const patientId = Number(req.params.id);
   if (!Number.isInteger(patientId) || patientId < 1) {
      return res.status(400).json({ error: 'Invalid patient ID' });
   }

   try {
      const data = await getPatientDetailWithChart(patientId);
      if (!data) {
         return res.status(404).json({ error: 'Patient not found' });
      }
      return res.status(200).json(data);
   } catch (error) {
      console.error('Failed to fetch patient detail:', error);
      return res.status(500).json({ error: 'Failed to fetch patient detail' });
   }
};

export const getAppointmentPreVisitData = async (req, res) => {
   const appointmentId = Number(req.params.id);
   if (!Number.isInteger(appointmentId) || appointmentId < 1) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
   }

   try {
      const data = await getAppointmentPreVisitClinicalData(appointmentId);
      if (!data) {
         return res.status(404).json({ error: 'Appointment not found' });
      }
      return res.status(200).json(data);
   } catch (error) {
      console.error('Failed to fetch pre-visit clinical data:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch pre-visit clinical data' });
   }
};

export const getSlotsUtilization = async (req, res) => {
   const date = req.query.date ? new Date(req.query.date) : new Date();
   if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date parameter' });
   }

   try {
      const utilization = await getResourceUtilization(date);
      return res.status(200).json(utilization);
   } catch (error) {
      console.error('Failed to fetch slot utilization:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch slot utilization' });
   }
};

export const cancelAppointmentStaff = async (req, res) => {
   const appointmentId = Number(req.params.id);
   if (!Number.isInteger(appointmentId) || appointmentId < 1) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
   }

   try {
      const result = await staffCancelAppointment(appointmentId, req.user.id);
      if (!result) {
         return res
            .status(404)
            .json({ error: 'Appointment not found or cannot be cancelled' });
      }
      return res.status(200).json({
         message: 'Appointment cancelled successfully by staff',
         appointment: result.cancelledAppointment,
         waitlistOffer: result.offeredWaitlistEntry ?? null,
      });
   } catch (error) {
      console.error('Failed to cancel appointment:', error);
      return res.status(500).json({ error: 'Failed to cancel appointment' });
   }
};

export const getWaitlistMonitor = async (req, res) => {
   try {
      const statusFilter = req.query.status || 'all';
      const list = await getStaffWaitlistMonitor(statusFilter);
      return res.status(200).json({ waitlist: list });
   } catch (error) {
      console.error('Failed to fetch waitlist monitor:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch waitlist monitor' });
   }
};

export const rescheduleAppointmentStaff = async (req, res) => {
   const appointmentId = Number(req.params.id);
   if (!Number.isInteger(appointmentId) || appointmentId < 1) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
   }

   const {
      new_start: newStart,
      new_end: newEnd,
      provider_id: newProviderId,
      room_id: newRoomId,
      equipment_id: newEquipmentId,
   } = req.body ?? {};

   if (!newStart || !newEnd) {
      return res
         .status(400)
         .json({ error: 'new_start and new_end are required' });
   }

   try {
      const result = await staffRescheduleAppointment(appointmentId, {
         newStart,
         newEnd,
         newProviderId: newProviderId ? Number(newProviderId) : undefined,
         newRoomId: newRoomId ? Number(newRoomId) : undefined,
         newEquipmentId:
            newEquipmentId !== undefined ? Number(newEquipmentId) : undefined,
      });

      if (result.error === 'not_found') {
         return res.status(404).json({
            error: 'Appointment not found or cannot be rescheduled',
         });
      }

      if (result.error === 'invalid_dates') {
         return res.status(400).json({
            error: 'Invalid date range. new_end must be after new_start.',
         });
      }

      if (result.error === 'conflict') {
         return res.status(409).json({
            error: `Scheduling conflict: ${result.conflictType} is already booked at the requested time`,
            conflictType: result.conflictType,
            conflictAppointmentId: result.conflictAppointmentId,
         });
      }

      return res.status(200).json({
         message: 'Appointment rescheduled successfully',
         appointment: result.rescheduledAppointment,
         waitlistOffer: result.offeredWaitlistEntry ?? null,
      });
   } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      return res
         .status(500)
         .json({ error: 'Failed to reschedule appointment' });
   }
};

export const getPriorAuthQueue = async (req, res) => {
   try {
      const statusFilter = req.query.status;

      let query = db
         .select({
            id: priorAuthorizations.id,
            appointmentId: appointments.id,
            status: priorAuthorizations.status,
            justificationText: priorAuthorizations.justificationText,
            denialReason: priorAuthorizations.denialReason,
            reviewedBy: priorAuthorizations.reviewedBy,
            submittedBy: priorAuthorizations.submittedBy,
            submittedAt: priorAuthorizations.submittedAt,
            decisionAt: priorAuthorizations.decisionAt,
            createdAt: priorAuthorizations.createdAt,
            updatedAt: priorAuthorizations.updatedAt,
            scheduledStart: appointments.scheduledStart,
            patientId: appointments.patientId,
            patientFirstName: patients.firstName,
            patientLastName: patients.lastName,
            patientDob: patients.dateOfBirth,
            providerId: appointments.providerId,
            providerFirstName: providers.firstName,
            providerLastName: providers.lastName,
            visitTypeId: appointments.visitTypeId,
            visitTypeName: visitTypes.name,
            insurerName: sql`pc.insurer_name`.as('insurerName'),
            planName: sql`pc.plan_name`.as('planName'),
            policyNumber: sql`pc.policy_number`.as('policyNumber'),
         })
         .from(priorAuthorizations)
         .innerJoin(
            appointments,
            eq(appointments.id, priorAuthorizations.appointmentId),
         )
         .innerJoin(patients, eq(patients.id, appointments.patientId))
         .innerJoin(providers, eq(providers.id, appointments.providerId))
         .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
         .leftJoin(
            sql`LATERAL (
               SELECT ip.payer_name AS insurer_name, ip.plan_name, pcov.policy_number
               FROM patient_coverage pcov
               INNER JOIN insurance_plans ip ON ip.id = pcov.insurance_plan_id
               WHERE pcov.patient_id = ${patients.id}
                 AND pcov.status = 'active'
                 AND (pcov.coverage_start IS NULL OR pcov.coverage_start <= CURRENT_DATE)
                 AND (pcov.coverage_end IS NULL OR pcov.coverage_end >= CURRENT_DATE)
               ORDER BY pcov.created_at DESC
               LIMIT 1
            ) pc ON true`,
         );

      if (statusFilter && statusFilter !== 'all') {
         query = query.where(eq(priorAuthorizations.status, statusFilter));
      } else {
         // Default excludes 'not_required' from the action queue
         query = query.where(ne(priorAuthorizations.status, 'not_required'));
      }

      const rows = await query.orderBy(
         desc(priorAuthorizations.updatedAt),
         asc(appointments.scheduledStart),
      );

      return res.status(200).json({ priorAuthorizations: rows });
   } catch (error) {
      console.error('Failed to fetch prior-auth queue:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch prior authorization queue' });
   }
};

export const getPriorAuthDetail = async (req, res) => {
   const authId = Number(req.params.id);
   if (!Number.isInteger(authId) || authId < 1) {
      return res.status(400).json({ error: 'Invalid prior authorization ID' });
   }

   try {
      const [record] = await db
         .select({
            id: priorAuthorizations.id,
            appointmentId: priorAuthorizations.appointmentId,
            status: priorAuthorizations.status,
            justificationText: priorAuthorizations.justificationText,
            aiGeneratedAt: priorAuthorizations.aiGeneratedAt,
            reviewedBy: priorAuthorizations.reviewedBy,
            submittedBy: priorAuthorizations.submittedBy,
            submittedAt: priorAuthorizations.submittedAt,
            decisionAt: priorAuthorizations.decisionAt,
            denialReason: priorAuthorizations.denialReason,
            createdAt: priorAuthorizations.createdAt,
            updatedAt: priorAuthorizations.updatedAt,
            scheduledStart: appointments.scheduledStart,
            scheduledEnd: appointments.scheduledEnd,
            appointmentStatus: appointments.status,
            insuranceStatus: appointments.insuranceStatus,
            patientId: appointments.patientId,
            patientFirstName: patients.firstName,
            patientLastName: patients.lastName,
            patientDob: patients.dateOfBirth,
            patientGender: patients.gender,
            isNewPatient: patients.isNewPatient,
            intakeReasonNote: patients.intakeReasonNote,
            providerId: appointments.providerId,
            providerFirstName: providers.firstName,
            providerLastName: providers.lastName,
            providerSpecialty: providers.specialty,
            visitTypeId: appointments.visitTypeId,
            visitTypeName: visitTypes.name,
            visitTypeDescription: visitTypes.description,
         })
         .from(priorAuthorizations)
         .innerJoin(
            appointments,
            eq(appointments.id, priorAuthorizations.appointmentId),
         )
         .innerJoin(patients, eq(patients.id, appointments.patientId))
         .innerJoin(providers, eq(providers.id, appointments.providerId))
         .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
         .where(eq(priorAuthorizations.id, authId))
         .limit(1);

      if (!record) {
         return res
            .status(404)
            .json({ error: 'Prior authorization not found' });
      }

      // Fetch patient conditions / diagnoses
      const patientConditions = await db
         .select()
         .from(conditions)
         .where(eq(conditions.patientId, record.patientId))
         .orderBy(desc(conditions.diagnosedDate));

      // Fetch patient active coverage (prefer active with valid date range)
      const [coverage] = await db
         .select({
            policyNumber: patientCoverage.policyNumber,
            memberId: patientCoverage.memberId,
            status: patientCoverage.status,
            coverageStart: patientCoverage.coverageStart,
            coverageEnd: patientCoverage.coverageEnd,
            insurerName: insurancePlans.insurerName,
            planName: insurancePlans.planName,
         })
         .from(patientCoverage)
         .innerJoin(
            insurancePlans,
            eq(insurancePlans.id, patientCoverage.insurancePlanId),
         )
         .where(
            and(
               eq(patientCoverage.patientId, record.patientId),
               eq(patientCoverage.status, 'active'),
            ),
         )
         .orderBy(desc(patientCoverage.createdAt))
         .limit(1);

      return res.status(200).json({
         priorAuthorization: record,
         conditions: patientConditions,
         coverage: coverage || null,
      });
   } catch (error) {
      console.error('Failed to fetch prior-auth detail:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch prior authorization detail' });
   }
};

export const draftPriorAuthJustification = async (req, res) => {
   const authId = Number(req.params.id);
   const { justification_text: justificationText } = req.body ?? {};

   if (!Number.isInteger(authId) || authId < 1) {
      return res.status(400).json({ error: 'Invalid prior authorization ID' });
   }

   if (typeof justificationText !== 'string' || !justificationText.trim()) {
      return res.status(400).json({ error: 'Justification text is required.' });
   }

   try {
      const [existing] = await db
         .select()
         .from(priorAuthorizations)
         .where(eq(priorAuthorizations.id, authId))
         .limit(1);

      if (!existing) {
         return res
            .status(404)
            .json({ error: 'Prior authorization not found' });
      }

      if (['submitted', 'approved'].includes(existing.status)) {
         return res.status(409).json({
            error: `Cannot edit justification while status is ${existing.status}`,
         });
      }

      // Transition needs_draft -> drafted, or keep as drafted
      const nextStatus =
         existing.status === 'needs_draft' ? 'drafted' : existing.status;

      const [updated] = await db
         .update(priorAuthorizations)
         .set({
            justificationText: justificationText.trim(),
            status: nextStatus,
            reviewedBy: req.user.id,
            updatedBy: req.user.id,
            updatedAt: new Date(),
         })
         .where(eq(priorAuthorizations.id, authId))
         .returning();

      return res.status(200).json({
         message: 'Prior authorization draft saved successfully',
         priorAuthorization: updated,
      });
   } catch (error) {
      console.error('Failed to draft prior-auth justification:', error);
      return res
         .status(500)
         .json({ error: 'Failed to update prior authorization draft' });
   }
};

export const submitPriorAuth = async (req, res) => {
   // Elevated staff administrator permission required per docs.md
   if (req.user?.role !== 'staff_admin') {
      return res
         .status(403)
         .json({ error: 'Staff administrator access required to submit' });
   }

   const authId = Number(req.params.id);
   if (!Number.isInteger(authId) || authId < 1) {
      return res.status(400).json({ error: 'Invalid prior authorization ID' });
   }

   try {
      const [record] = await db
         .select({
            id: priorAuthorizations.id,
            status: priorAuthorizations.status,
            justificationText: priorAuthorizations.justificationText,
            appointmentId: priorAuthorizations.appointmentId,
            visitTypeId: appointments.visitTypeId,
            patientId: appointments.patientId,
         })
         .from(priorAuthorizations)
         .innerJoin(
            appointments,
            eq(appointments.id, priorAuthorizations.appointmentId),
         )
         .where(eq(priorAuthorizations.id, authId))
         .limit(1);

      if (!record) {
         return res
            .status(404)
            .json({ error: 'Prior authorization not found' });
      }

      if (!['drafted', 'submitted'].includes(record.status)) {
         return res.status(409).json({
            error: `Cannot submit prior authorization from status ${record.status}. Must be drafted first.`,
         });
      }

      // Adjudicate via Mock Insurer
      const outcome = mockInsurerService.adjudicatePriorAuth({
         priorAuth: record,
         mockOutcome: req.body?.mock_outcome,
      });

      const [updated] = await db
         .update(priorAuthorizations)
         .set({
            status: outcome.status,
            denialReason: outcome.denialReason ?? null,
            decisionAt: outcome.decisionAt ?? null,
            submittedBy: req.user.id,
            submittedAt: new Date(),
            updatedBy: req.user.id,
            updatedAt: new Date(),
         })
         .where(eq(priorAuthorizations.id, authId))
         .returning();

      return res.status(200).json({
         message: `Prior authorization submitted to insurer: outcome is ${outcome.status}`,
         priorAuthorization: updated,
      });
   } catch (error) {
      console.error('Failed to submit prior authorization:', error);
      return res
         .status(500)
         .json({ error: 'Failed to submit prior authorization' });
   }
};

export const updatePriorAuthDecision = async (req, res) => {
   if (req.user?.role !== 'staff_admin') {
      return res.status(403).json({
         error: 'Staff administrator access required for decision override',
      });
   }

   const authId = Number(req.params.id);
   const { status, denial_reason: denialReason } = req.body ?? {};

   if (!Number.isInteger(authId) || authId < 1) {
      return res.status(400).json({ error: 'Invalid prior authorization ID' });
   }

   if (!['approved', 'denied'].includes(status)) {
      return res
         .status(400)
         .json({ error: "Decision status must be 'approved' or 'denied'" });
   }

   // Valid source states for a decision override
   const DECIDABLE_STATES = ['submitted', 'approved', 'denied', 'appealed'];

   try {
      const [existing] = await db
         .select({
            id: priorAuthorizations.id,
            status: priorAuthorizations.status,
         })
         .from(priorAuthorizations)
         .where(eq(priorAuthorizations.id, authId))
         .limit(1);

      if (!existing) {
         return res
            .status(404)
            .json({ error: 'Prior authorization not found' });
      }

      if (!DECIDABLE_STATES.includes(existing.status)) {
         return res.status(409).json({
            error: `Cannot set decision on prior authorization with status '${existing.status}'. Must be submitted first.`,
         });
      }

      const [updated] = await db
         .update(priorAuthorizations)
         .set({
            status,
            denialReason:
               status === 'denied'
                  ? denialReason || 'Denied by insurer review'
                  : null,
            decisionAt: new Date(),
            updatedBy: req.user.id,
            updatedAt: new Date(),
         })
         .where(eq(priorAuthorizations.id, authId))
         .returning();

      return res.status(200).json({
         message: `Prior authorization marked as ${status}`,
         priorAuthorization: updated,
      });
   } catch (error) {
      console.error('Failed to update decision:', error);
      return res.status(500).json({ error: 'Failed to update decision' });
   }
};

export const getAppealsQueue = async (req, res) => {
   try {
      const statusFilter = req.query.status;

      let query = db
         .select({
            id: appeals.id,
            priorAuthorizationId: appeals.priorAuthorizationId,
            status: appeals.status,
            chartJustificationText: appeals.chartJustificationText,
            appealLetterText: appeals.appealLetterText,
            reviewedBy: appeals.reviewedBy,
            submittedBy: appeals.submittedBy,
            submittedAt: appeals.submittedAt,
            decisionAt: appeals.decisionAt,
            createdAt: appeals.createdAt,
            updatedAt: appeals.updatedAt,
            guidelineId: appeals.guidelineId,
            guidelineTitle: clinicalGuidelines.title,
            guidelineExcerpt: clinicalGuidelines.excerptText,
            priorAuthDenialReason: priorAuthorizations.denialReason,
            appointmentId: priorAuthorizations.appointmentId,
            patientId: appointments.patientId,
            patientFirstName: patients.firstName,
            patientLastName: patients.lastName,
            providerFirstName: providers.firstName,
            providerLastName: providers.lastName,
            visitTypeName: visitTypes.name,
         })
         .from(appeals)
         .innerJoin(
            priorAuthorizations,
            eq(priorAuthorizations.id, appeals.priorAuthorizationId),
         )
         .innerJoin(
            appointments,
            eq(appointments.id, priorAuthorizations.appointmentId),
         )
         .innerJoin(patients, eq(patients.id, appointments.patientId))
         .innerJoin(providers, eq(providers.id, appointments.providerId))
         .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
         .leftJoin(
            clinicalGuidelines,
            eq(clinicalGuidelines.id, appeals.guidelineId),
         );

      if (statusFilter && statusFilter !== 'all') {
         query = query.where(eq(appeals.status, statusFilter));
      }

      const rows = await query.orderBy(desc(appeals.updatedAt));
      return res.status(200).json({ appeals: rows });
   } catch (error) {
      console.error('Failed to fetch appeals queue:', error);
      return res.status(500).json({ error: 'Failed to fetch appeals queue' });
   }
};

export const getAppealDetail = async (req, res) => {
   const appealId = Number(req.params.id);
   if (!Number.isInteger(appealId) || appealId < 1) {
      return res.status(400).json({ error: 'Invalid appeal ID' });
   }

   try {
      const [appealRecord] = await db
         .select({
            id: appeals.id,
            priorAuthorizationId: appeals.priorAuthorizationId,
            guidelineId: appeals.guidelineId,
            chartJustificationText: appeals.chartJustificationText,
            appealLetterText: appeals.appealLetterText,
            status: appeals.status,
            reviewedBy: appeals.reviewedBy,
            submittedBy: appeals.submittedBy,
            submittedAt: appeals.submittedAt,
            decisionAt: appeals.decisionAt,
            createdAt: appeals.createdAt,
            updatedAt: appeals.updatedAt,
            guidelineTitle: clinicalGuidelines.title,
            guidelineExcerpt: clinicalGuidelines.excerptText,
            guidelineCitation: clinicalGuidelines.sourceCitation,
            guidelineDiagnosisCode: clinicalGuidelines.applicableDiagnosisCode,
            priorAuthStatus: priorAuthorizations.status,
            priorAuthDenialReason: priorAuthorizations.denialReason,
            priorAuthJustification: priorAuthorizations.justificationText,
            appointmentId: priorAuthorizations.appointmentId,
            scheduledStart: appointments.scheduledStart,
            patientId: appointments.patientId,
            patientFirstName: patients.firstName,
            patientLastName: patients.lastName,
            patientDob: patients.dateOfBirth,
            providerFirstName: providers.firstName,
            providerLastName: providers.lastName,
            visitTypeName: visitTypes.name,
         })
         .from(appeals)
         .innerJoin(
            priorAuthorizations,
            eq(priorAuthorizations.id, appeals.priorAuthorizationId),
         )
         .innerJoin(
            appointments,
            eq(appointments.id, priorAuthorizations.appointmentId),
         )
         .innerJoin(patients, eq(patients.id, appointments.patientId))
         .innerJoin(providers, eq(providers.id, appointments.providerId))
         .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
         .leftJoin(
            clinicalGuidelines,
            eq(clinicalGuidelines.id, appeals.guidelineId),
         )
         .where(eq(appeals.id, appealId))
         .limit(1);

      if (!appealRecord) {
         return res.status(404).json({ error: 'Appeal not found' });
      }

      return res.status(200).json({ appeal: appealRecord });
   } catch (error) {
      console.error('Failed to fetch appeal detail:', error);
      return res.status(500).json({ error: 'Failed to fetch appeal detail' });
   }
};

export const createAppeal = async (req, res) => {
   const priorAuthId = Number(req.body?.prior_authorization_id);
   let guidelineId = req.body?.guideline_id
      ? Number(req.body.guideline_id)
      : null;
   const appealLetterText = req.body?.appeal_letter_text || '';
   const chartJustificationText = req.body?.chart_justification_text || '';

   if (!Number.isInteger(priorAuthId) || priorAuthId < 1) {
      return res
         .status(400)
         .json({ error: 'Valid prior_authorization_id is required' });
   }

   try {
      const [priorAuth] = await db
         .select({
            id: priorAuthorizations.id,
            status: priorAuthorizations.status,
            justificationText: priorAuthorizations.justificationText,
            appointmentId: appointments.id,
            visitTypeId: appointments.visitTypeId,
            patientId: appointments.patientId,
         })
         .from(priorAuthorizations)
         .innerJoin(
            appointments,
            eq(appointments.id, priorAuthorizations.appointmentId),
         )
         .where(eq(priorAuthorizations.id, priorAuthId))
         .limit(1);

      if (!priorAuth) {
         return res
            .status(404)
            .json({ error: 'Prior authorization not found' });
      }

      if (!['denied', 'appealed'].includes(priorAuth.status)) {
         return res.status(409).json({
            error: `Cannot file appeal for prior authorization with status '${priorAuth.status}'. It must be 'denied'.`,
         });
      }

      // Check if appeal already exists
      const [existingAppeal] = await db
         .select()
         .from(appeals)
         .where(eq(appeals.priorAuthorizationId, priorAuthId))
         .limit(1);

      if (existingAppeal) {
         return res.status(409).json({
            error: 'An appeal already exists for this prior authorization',
            appealId: existingAppeal.id,
         });
      }

      // If guideline_id is omitted, prefer an exact active diagnosis match.
      if (!guidelineId) {
         const patientConditions = await db
            .select({ conditionCode: conditions.conditionCode })
            .from(conditions)
            .where(
               and(
                  eq(conditions.patientId, priorAuth.patientId),
                  isNull(conditions.resolvedDate),
               ),
            );
         const diagnosisCodes = new Set(
            patientConditions.map((condition) =>
               String(condition.conditionCode).trim().toUpperCase(),
            ),
         );
         const candidateGuidelines = await db
            .select({
               id: clinicalGuidelines.id,
               applicableDiagnosisCode:
                  clinicalGuidelines.applicableDiagnosisCode,
            })
            .from(clinicalGuidelines)
            .where(
               eq(
                  clinicalGuidelines.applicableVisitTypeId,
                  priorAuth.visitTypeId,
               ),
            )
            .orderBy(asc(clinicalGuidelines.id));
         const matchedGuideline =
            candidateGuidelines.find(
               (guideline) =>
                  guideline.applicableDiagnosisCode &&
                  diagnosisCodes.has(
                     guideline.applicableDiagnosisCode.trim().toUpperCase(),
                  ),
            ) ||
            candidateGuidelines.find(
               (guideline) => !guideline.applicableDiagnosisCode,
            );
         if (matchedGuideline) guidelineId = matchedGuideline.id;
      }

      const initialChartJustification =
         chartJustificationText || priorAuth.justificationText || '';

      const [newAppeal] = await db.transaction(async (tx) => {
         const [created] = await tx
            .insert(appeals)
            .values({
               priorAuthorizationId: priorAuthId,
               guidelineId,
               chartJustificationText: initialChartJustification,
               appealLetterText: appealLetterText.trim(),
               status: 'drafted',
               reviewedBy: req.user.id,
            })
            .returning();

         await tx
            .update(priorAuthorizations)
            .set({ status: 'appealed', updatedAt: new Date() })
            .where(eq(priorAuthorizations.id, priorAuthId));

         return [created];
      });

      return res.status(201).json({
         message: 'Appeal created successfully',
         appeal: newAppeal,
      });
   } catch (error) {
      console.error('Failed to create appeal:', error);
      return res.status(500).json({ error: 'Failed to create appeal' });
   }
};

export const updateAppealDraft = async (req, res) => {
   const appealId = Number(req.params.id);
   if (!Number.isInteger(appealId) || appealId < 1) {
      return res.status(400).json({ error: 'Invalid appeal ID' });
   }

   const {
      appeal_letter_text: appealLetterText,
      guideline_id: guidelineId,
      chart_justification_text: chartJustificationText,
   } = req.body ?? {};

   try {
      const [existing] = await db
         .select()
         .from(appeals)
         .where(eq(appeals.id, appealId))
         .limit(1);

      if (!existing) {
         return res.status(404).json({ error: 'Appeal not found' });
      }

      if (['submitted', 'approved'].includes(existing.status)) {
         return res.status(409).json({
            error: `Cannot modify appeal in '${existing.status}' status`,
         });
      }

      const updates = {
         reviewedBy: req.user.id,
         updatedAt: new Date(),
      };
      if (typeof appealLetterText === 'string') {
         updates.appealLetterText = appealLetterText.trim();
      }
      if (Number.isInteger(Number(guidelineId)) && Number(guidelineId) > 0) {
         updates.guidelineId = Number(guidelineId);
      }
      if (typeof chartJustificationText === 'string') {
         updates.chartJustificationText = chartJustificationText.trim();
      }

      const [updated] = await db
         .update(appeals)
         .set(updates)
         .where(eq(appeals.id, appealId))
         .returning();

      return res.status(200).json({
         message: 'Appeal draft updated successfully',
         appeal: updated,
      });
   } catch (error) {
      console.error('Failed to update appeal draft:', error);
      return res.status(500).json({ error: 'Failed to update appeal draft' });
   }
};

export const submitAppeal = async (req, res) => {
   // Elevated staff administrator permission required per docs.md
   if (req.user?.role !== 'staff_admin') {
      return res.status(403).json({
         error: 'Staff administrator access required to submit appeals',
      });
   }

   const appealId = Number(req.params.id);
   if (!Number.isInteger(appealId) || appealId < 1) {
      return res.status(400).json({ error: 'Invalid appeal ID' });
   }

   try {
      const [appealRecord] = await db
         .select({
            id: appeals.id,
            status: appeals.status,
            priorAuthorizationId: appeals.priorAuthorizationId,
            guidelineId: appeals.guidelineId,
            appealLetterText: appeals.appealLetterText,
         })
         .from(appeals)
         .where(eq(appeals.id, appealId))
         .limit(1);

      if (!appealRecord) {
         return res.status(404).json({ error: 'Appeal not found' });
      }

      if (!appealRecord.appealLetterText?.trim()) {
         return res.status(400).json({
            error: 'Appeal letter text must not be empty prior to submission',
         });
      }

      if (!['drafted'].includes(appealRecord.status)) {
         return res.status(409).json({
            error: `Cannot submit appeal with status '${appealRecord.status}'. Must be in 'drafted' status.`,
         });
      }

      // Adjudicate via Mock Insurer
      const outcome = mockInsurerService.adjudicateAppeal({
         appeal: appealRecord,
         mockOutcome: req.body?.mock_outcome,
      });

      const [updated] = await db.transaction(async (tx) => {
         const [app] = await tx
            .update(appeals)
            .set({
               status: outcome.status,
               decisionAt: outcome.decisionAt ?? null,
               submittedBy: req.user.id,
               submittedAt: new Date(),
               updatedAt: new Date(),
            })
            .where(eq(appeals.id, appealId))
            .returning();

         // If appeal was approved, update the prior-authorization to approved!
         if (outcome.status === 'approved') {
            await tx
               .update(priorAuthorizations)
               .set({
                  status: 'approved',
                  decisionAt: outcome.decisionAt,
                  updatedAt: new Date(),
               })
               .where(
                  eq(priorAuthorizations.id, appealRecord.priorAuthorizationId),
               );
         }

         // If appeal was denied, keep prior-auth as denied
         if (outcome.status === 'denied') {
            await tx
               .update(priorAuthorizations)
               .set({
                  status: 'denied',
                  updatedAt: new Date(),
               })
               .where(
                  eq(priorAuthorizations.id, appealRecord.priorAuthorizationId),
               );
         }

         return [app];
      });

      return res.status(200).json({
         message: `Appeal submitted to insurer: outcome is ${outcome.status}`,
         appeal: updated,
      });
   } catch (error) {
      console.error('Failed to submit appeal:', error);
      return res.status(500).json({ error: 'Failed to submit appeal' });
   }
};

export const updateAppealDecision = async (req, res) => {
   if (req.user?.role !== 'staff_admin') {
      return res.status(403).json({
         error: 'Staff administrator access required for appeal decision override',
      });
   }

   const appealId = Number(req.params.id);
   const { status } = req.body ?? {};

   if (!Number.isInteger(appealId) || appealId < 1) {
      return res.status(400).json({ error: 'Invalid appeal ID' });
   }

   if (!['approved', 'denied'].includes(status)) {
      return res
         .status(400)
         .json({ error: "Appeal decision must be 'approved' or 'denied'" });
   }

   try {
      const [appealRecord] = await db
         .select()
         .from(appeals)
         .where(eq(appeals.id, appealId))
         .limit(1);

      if (!appealRecord) {
         return res.status(404).json({ error: 'Appeal not found' });
      }

      // Only allow decisions on appeals that have been submitted or already decided
      const DECIDABLE_APPEAL_STATES = ['submitted', 'approved', 'denied'];
      if (!DECIDABLE_APPEAL_STATES.includes(appealRecord.status)) {
         return res.status(409).json({
            error: `Cannot set decision on appeal with status '${appealRecord.status}'. Must be submitted first.`,
         });
      }

      const [updated] = await db.transaction(async (tx) => {
         const [app] = await tx
            .update(appeals)
            .set({
               status,
               decisionAt: new Date(),
               updatedAt: new Date(),
            })
            .where(eq(appeals.id, appealId))
            .returning();

         if (status === 'approved') {
            await tx
               .update(priorAuthorizations)
               .set({
                  status: 'approved',
                  decisionAt: new Date(),
                  updatedAt: new Date(),
               })
               .where(
                  eq(priorAuthorizations.id, appealRecord.priorAuthorizationId),
               );
         }

         if (status === 'denied') {
            await tx
               .update(priorAuthorizations)
               .set({
                  status: 'denied',
                  updatedAt: new Date(),
               })
               .where(
                  eq(priorAuthorizations.id, appealRecord.priorAuthorizationId),
               );
         }

         return [app];
      });

      return res.status(200).json({
         message: `Appeal decision recorded as ${status}`,
         appeal: updated,
      });
   } catch (error) {
      console.error('Failed to update appeal decision:', error);
      return res
         .status(500)
         .json({ error: 'Failed to update appeal decision' });
   }
};

export const getGuidelines = async (req, res) => {
   try {
      const visitTypeId = req.query.visit_type_id
         ? Number(req.query.visit_type_id)
         : null;

      let query = db
         .select({
            id: clinicalGuidelines.id,
            title: clinicalGuidelines.title,
            excerptText: clinicalGuidelines.excerptText,
            applicableVisitTypeId: clinicalGuidelines.applicableVisitTypeId,
            applicableDiagnosisCode: clinicalGuidelines.applicableDiagnosisCode,
            sourceCitation: clinicalGuidelines.sourceCitation,
            visitTypeName: visitTypes.name,
         })
         .from(clinicalGuidelines)
         .leftJoin(
            visitTypes,
            eq(visitTypes.id, clinicalGuidelines.applicableVisitTypeId),
         );

      if (visitTypeId && Number.isInteger(visitTypeId)) {
         query = query.where(
            eq(clinicalGuidelines.applicableVisitTypeId, visitTypeId),
         );
      }

      const list = await query.orderBy(asc(clinicalGuidelines.title));
      return res.status(200).json({ guidelines: list });
   } catch (error) {
      console.error('Failed to fetch clinical guidelines:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch clinical guidelines' });
   }
};

export const createGuideline = async (req, res) => {
   if (req.user?.role !== 'staff_admin') {
      return res.status(403).json({
         error: 'Staff administrator access required to add guidelines',
      });
   }

   const {
      title,
      excerpt_text: excerptText,
      applicable_visit_type_id: visitTypeId,
      applicable_diagnosis_code: diagnosisCode,
      source_citation: sourceCitation,
   } = req.body ?? {};

   if (!title?.trim() || !excerptText?.trim()) {
      return res
         .status(400)
         .json({ error: 'Title and excerpt_text are required' });
   }

   try {
      const [guideline] = await db
         .insert(clinicalGuidelines)
         .values({
            title: title.trim(),
            excerptText: excerptText.trim(),
            applicableVisitTypeId: visitTypeId ? Number(visitTypeId) : null,
            applicableDiagnosisCode: diagnosisCode
               ? diagnosisCode.trim()
               : null,
            sourceCitation: sourceCitation ? sourceCitation.trim() : null,
         })
         .returning();

      return res.status(201).json({ guideline });
   } catch (error) {
      console.error('Failed to create clinical guideline:', error);
      return res
         .status(500)
         .json({ error: 'Failed to create clinical guideline' });
   }
};

export const getUnverifiedCoverages = async (req, res) => {
   try {
      const entries = await db
         .select({
            id: patientCoverage.id,
            patientId: patientCoverage.patientId,
            patientFirstName: patients.firstName,
            patientLastName: patients.lastName,
            patientDob: patients.dateOfBirth,
            patientContactEmail: patients.contactEmail,
            patientContactPhone: patients.contactPhone,
            isNewPatient: patients.isNewPatient,
            policyNumber: patientCoverage.policyNumber,
            memberId: patientCoverage.memberId,
            coverageStart: patientCoverage.coverageStart,
            coverageEnd: patientCoverage.coverageEnd,
            status: patientCoverage.status,
            createdAt: patientCoverage.createdAt,
            insurancePlanId: insurancePlans.id,
            insurerName: insurancePlans.insurerName,
            planName: insurancePlans.planName,
         })
         .from(patientCoverage)
         .innerJoin(patients, eq(patients.id, patientCoverage.patientId))
         .innerJoin(
            insurancePlans,
            eq(insurancePlans.id, patientCoverage.insurancePlanId),
         )
         .where(eq(patientCoverage.status, 'unverified'))
         .orderBy(asc(patientCoverage.createdAt));

      return res.status(200).json({ unverifiedCoverages: entries });
   } catch (error) {
      console.error('Failed to fetch unverified coverage:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch unverified insurance coverages' });
   }
};

export const verifyCoverageStaff = async (req, res) => {
   const coverageId = Number(req.params.id);
   const { status } = req.body ?? {};

   if (!Number.isInteger(coverageId) || coverageId < 1) {
      return res.status(400).json({ error: 'Invalid coverage ID' });
   }

   if (!['active', 'inactive'].includes(status)) {
      return res
         .status(400)
         .json({ error: 'Status must be active or inactive' });
   }

   try {
      const entry = await db.transaction(async (tx) => {
         const [updated] = await tx
            .update(patientCoverage)
            .set({
               status,
               verifiedBy: req.user.id,
               verifiedAt: new Date(),
               updatedAt: new Date(),
            })
            .where(eq(patientCoverage.id, coverageId))
            .returning({
               id: patientCoverage.id,
               patientId: patientCoverage.patientId,
               verifiedAt: patientCoverage.verifiedAt,
            });

         if (!updated) return null;

         // Cascade status update to patient's upcoming scheduled appointments
         const upcoming = await tx
            .select({
               id: appointments.id,
               scheduledStart: appointments.scheduledStart,
            })
            .from(appointments)
            .where(
               and(
                  eq(appointments.patientId, updated.patientId),
                  eq(appointments.status, 'scheduled'),
                  gte(appointments.scheduledStart, new Date()),
               ),
            );

         for (const appointment of upcoming) {
            const insuranceStatus = await getCoverageStatusForAppointment(
               tx,
               updated.patientId,
               appointment.scheduledStart,
            );
            await tx
               .update(appointments)
               .set({ insuranceStatus, updatedAt: new Date() })
               .where(eq(appointments.id, appointment.id));
         }

         return { id: updated.id, status, verifiedAt: updated.verifiedAt };
      });

      if (!entry) {
         return res.status(404).json({ error: 'Coverage record not found' });
      }

      return res.status(200).json({
         message: `Insurance coverage verified as ${status}`,
         coverage: entry,
      });
   } catch (error) {
      console.error('Failed to verify patient coverage:', error);
      return res
         .status(500)
         .json({ error: 'Failed to verify patient coverage' });
   }
};
