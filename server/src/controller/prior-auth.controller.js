import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { appointments } from '../db/schema/appointments.js';
import { insurancePlans } from '../db/schema/insurancePlans.js';
import { priorAuthRules } from '../db/schema/priorAuthRules.js';
import { priorAuthorizations } from '../db/schema/priorAuthorizations.js';
import { visitTypes } from '../db/schema/visitTypes.js';

const transitions = {
   needs_draft: ['drafted'],
   drafted: ['submitted'],
   submitted: ['approved', 'denied'],
   denied: ['appealed'],
   appealed: ['submitted', 'approved', 'denied'],
};

export const getMyPriorAuthorizationStatuses = async (req, res) => {
   if (!requirePatient(req, res)) return;
   try {
      const records = await db
         .select({
            appointmentId: appointments.id,
            scheduledStart: appointments.scheduledStart,
            visitType: visitTypes.name,
            appointmentStatus: appointments.status,
            status: priorAuthorizations.status,
            updatedAt: priorAuthorizations.updatedAt,
         })
         .from(appointments)
         .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
         .leftJoin(
            priorAuthorizations,
            eq(priorAuthorizations.appointmentId, appointments.id),
         )
         .where(eq(appointments.patientId, req.user.patientId))
         .orderBy(asc(appointments.scheduledStart));
      return res.json({ priorAuthorizations: records });
   } catch (error) {
      console.error(
         'Failed to fetch patient prior authorization status:',
         error,
      );
      return res
         .status(500)
         .json({ error: 'Failed to fetch prior authorization status' });
   }
};

export const getPriorAuthRules = async (req, res) => {
   if (!requireStaff(req, res)) return;
   try {
      const rules = await db
         .select({
            id: priorAuthRules.id,
            visitTypeId: priorAuthRules.visitTypeId,
            visitType: visitTypes.name,
            insurancePlanId: priorAuthRules.insurancePlanId,
            insurerName: insurancePlans.insurerName,
            planName: insurancePlans.planName,
            requiresPriorAuth: priorAuthRules.requiresPriorAuth,
         })
         .from(priorAuthRules)
         .innerJoin(visitTypes, eq(visitTypes.id, priorAuthRules.visitTypeId))
         .leftJoin(
            insurancePlans,
            eq(insurancePlans.id, priorAuthRules.insurancePlanId),
         )
         .orderBy(asc(visitTypes.name), asc(insurancePlans.insurerName));
      return res.json({ rules });
   } catch (error) {
      console.error('Failed to fetch prior authorization rules:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch prior authorization rules' });
   }
};

export const savePriorAuthRule = async (req, res) => {
   if (!requireAdmin(req, res)) return;
   const visitTypeId = Number(req.body?.visit_type_id);
   const insurancePlanId =
      req.body?.insurance_plan_id === undefined ||
      req.body?.insurance_plan_id === null
         ? null
         : Number(req.body.insurance_plan_id);
   const { requires_prior_auth: requiresPriorAuth } = req.body ?? {};
   if (
      !Number.isInteger(visitTypeId) ||
      visitTypeId < 1 ||
      (insurancePlanId !== null &&
         (!Number.isInteger(insurancePlanId) || insurancePlanId < 1)) ||
      typeof requiresPriorAuth !== 'boolean'
   ) {
      return res
         .status(400)
         .json({
            error: 'visit_type_id, optional insurance_plan_id, and boolean requires_prior_auth are required',
         });
   }
   try {
      const [visitType] = await db
         .select({ id: visitTypes.id })
         .from(visitTypes)
         .where(eq(visitTypes.id, visitTypeId))
         .limit(1);
      if (!visitType)
         return res.status(404).json({ error: 'Visit type not found' });
      if (insurancePlanId !== null) {
         const [plan] = await db
            .select({ id: insurancePlans.id })
            .from(insurancePlans)
            .where(eq(insurancePlans.id, insurancePlanId))
            .limit(1);
         if (!plan)
            return res.status(404).json({ error: 'Insurance plan not found' });
      }
      const [existing] = await db
         .select({ id: priorAuthRules.id })
         .from(priorAuthRules)
         .where(
            and(
               eq(priorAuthRules.visitTypeId, visitTypeId),
               insurancePlanId === null
                  ? isNull(priorAuthRules.insurancePlanId)
                  : eq(priorAuthRules.insurancePlanId, insurancePlanId),
            ),
         )
         .limit(1);
      const [rule] = existing
         ? await db
              .update(priorAuthRules)
              .set({ requiresPriorAuth })
              .where(eq(priorAuthRules.id, existing.id))
              .returning()
         : await db
              .insert(priorAuthRules)
              .values({ visitTypeId, insurancePlanId, requiresPriorAuth })
              .returning();
      return res.status(existing ? 200 : 201).json({ rule });
   } catch (error) {
      console.error('Failed to save prior authorization rule:', error);
      return res
         .status(500)
         .json({ error: 'Failed to save prior authorization rule' });
   }
};

export const getAppointmentPriorAuthorization = async (req, res) => {
   if (!requireStaff(req, res)) return;
   const appointmentId = Number(req.params.appointmentId);
   if (!Number.isInteger(appointmentId) || appointmentId < 1) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
   }
   try {
      const [record] = await db
         .select({
            id: priorAuthorizations.id,
            appointmentId: appointments.id,
            patientId: appointments.patientId,
            scheduledStart: appointments.scheduledStart,
            appointmentStatus: appointments.status,
            visitType: visitTypes.name,
            status: priorAuthorizations.status,
            updatedBy: priorAuthorizations.updatedBy,
            updatedAt: priorAuthorizations.updatedAt,
         })
         .from(appointments)
         .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
         .leftJoin(
            priorAuthorizations,
            eq(priorAuthorizations.appointmentId, appointments.id),
         )
         .where(eq(appointments.id, appointmentId))
         .limit(1);
      if (!record)
         return res.status(404).json({ error: 'Appointment not found' });
      return res.json({ priorAuthorization: record });
   } catch (error) {
      console.error('Failed to fetch appointment prior authorization:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch prior authorization' });
   }
};

export const updatePriorAuthorizationStatus = async (req, res) => {
   if (!requireStaff(req, res)) return;
   const authorizationId = Number(req.params.id);
   const { status } = req.body ?? {};
   if (!Number.isInteger(authorizationId) || authorizationId < 1) {
      return res.status(400).json({ error: 'Invalid prior authorization ID' });
   }
   if (!Object.hasOwn(transitions, status)) {
      return res
         .status(400)
         .json({ error: 'Invalid prior authorization status' });
   }
   try {
      const [record] = await db
         .select()
         .from(priorAuthorizations)
         .where(eq(priorAuthorizations.id, authorizationId))
         .limit(1);
      if (!record)
         return res
            .status(404)
            .json({ error: 'Prior authorization not found' });
      if (!transitions[record.status]?.includes(status)) {
         return res
            .status(409)
            .json({
               error: `Cannot change status from ${record.status} to ${status}`,
            });
      }
      if (status === 'submitted' && req.user.role !== 'staff_admin') {
         return res
            .status(403)
            .json({ error: 'Staff administrator access required to submit' });
      }
      if (
         ['approved', 'denied', 'appealed'].includes(status) &&
         req.user.role !== 'staff_admin'
      ) {
         return res
            .status(403)
            .json({
               error: 'Staff administrator access required for this status change',
            });
      }
      const [updated] = await db
         .update(priorAuthorizations)
         .set({ status, updatedBy: req.user.id, updatedAt: new Date() })
         .where(
            and(
               eq(priorAuthorizations.id, authorizationId),
               eq(priorAuthorizations.status, record.status),
            ),
         )
         .returning({
            id: priorAuthorizations.id,
            status: priorAuthorizations.status,
            updatedAt: priorAuthorizations.updatedAt,
         });
      if (!updated)
         return res
            .status(409)
            .json({
               error: 'Prior authorization status changed; refresh and try again',
            });
      return res.json({ priorAuthorization: updated });
   } catch (error) {
      console.error('Failed to update prior authorization status:', error);
      return res
         .status(500)
         .json({ error: 'Failed to update prior authorization status' });
   }
};

function requirePatient(req, res) {
   if (req.user?.role === 'patient' && req.user.patientId) return true;
   res.status(403).json({ error: 'Patient access required' });
   return false;
}

function requireStaff(req, res) {
   if (['staff', 'staff_admin'].includes(req.user?.role)) return true;
   res.status(403).json({ error: 'Staff access required' });
   return false;
}

function requireAdmin(req, res) {
   if (req.user?.role === 'staff_admin') return true;
   res.status(403).json({ error: 'Staff administrator access required' });
   return false;
}
