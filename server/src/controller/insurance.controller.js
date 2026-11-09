import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { insurancePlans } from '../db/schema/insurancePlans.js';
import { patientCoverage } from '../db/schema/patientCoverage.js';
import { patients } from '../db/schema/patients.js';
import { users } from '../db/schema/users.js';
import { findOrCreateInsurancePlan } from '../services/insurance.service.js';
import { refreshPatientAppointmentInsurance } from '../services/insurance.service.js';
import { verifyCoverage } from '../services/insurance-verification.service.js';

export const getMyCoverage = async (req, res) => {
   if (!requirePatient(req, res)) return;
   try {
      const entries = await db
         .select({
            id: patientCoverage.id,
            insurerName: insurancePlans.insurerName,
            planName: insurancePlans.planName,
            policyNumber: patientCoverage.policyNumber,
            memberId: patientCoverage.memberId,
            coverageStart: patientCoverage.coverageStart,
            coverageEnd: patientCoverage.coverageEnd,
            status: patientCoverage.status,
            verifiedAt: patientCoverage.verifiedAt,
            createdAt: patientCoverage.createdAt,
         })
         .from(patientCoverage)
         .innerJoin(
            insurancePlans,
            eq(insurancePlans.id, patientCoverage.insurancePlanId),
         )
         .where(eq(patientCoverage.patientId, req.user.patientId))
         .orderBy(desc(patientCoverage.createdAt));
      return res.json({ coverages: entries });
   } catch (error) {
      console.error('Failed to fetch patient coverage:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch insurance coverage' });
   }
};

export const addMyCoverage = async (req, res) => {
   if (!requirePatient(req, res)) return;
   const data = parseCoverage(req.body);
   if (!data)
      return res.status(400).json({
         error: 'Valid insurer, plan, policy number, and coverage dates are required',
      });
   try {
      const coverage = await db.transaction(async (tx) => {
         const insurancePlanId = await findOrCreateInsurancePlan(
            tx,
            data.insurerName,
            data.planName,
         );
         const [entry] = await tx
            .insert(patientCoverage)
            .values({
               patientId: req.user.patientId,
               insurancePlanId,
               policyNumber: data.policyNumber,
               memberId: data.memberId,
               coverageStart: data.coverageStart,
               coverageEnd: data.coverageEnd,
            })
            .returning({
               id: patientCoverage.id,
               status: patientCoverage.status,
            });
         return entry;
      });
      return res.status(201).json({ coverage });
   } catch (error) {
      console.error('Failed to add patient coverage:', error);
      return res
         .status(500)
         .json({ error: 'Failed to add insurance coverage' });
   }
};

export const updateMyCoverage = async (req, res) => {
   if (!requirePatient(req, res)) return;
   if (Object.hasOwn(req.body ?? {}, 'status')) {
      return res.status(400).json({
         error: 'Coverage status can only be changed by a staff administrator.',
      });
   }
   const coverageId = Number(req.params.coverageId);
   const data = parseCoverage(req.body);
   if (!Number.isInteger(coverageId) || coverageId < 1 || !data) {
      return res
         .status(400)
         .json({ error: 'Valid insurance details are required.' });
   }
   try {
      const coverage = await db.transaction(async (tx) => {
         const insurancePlanId = await findOrCreateInsurancePlan(
            tx,
            data.insurerName,
            data.planName,
         );
         const [updated] = await tx
            .update(patientCoverage)
            .set({
               insurancePlanId,
               policyNumber: data.policyNumber,
               memberId: data.memberId,
               coverageStart: data.coverageStart,
               coverageEnd: data.coverageEnd,
               status: 'unverified',
               verifiedBy: null,
               verifiedAt: null,
               updatedAt: new Date(),
            })
            .where(
               and(
                  eq(patientCoverage.id, coverageId),
                  eq(patientCoverage.patientId, req.user.patientId),
               ),
            )
            .returning({
               id: patientCoverage.id,
               patientId: patientCoverage.patientId,
               status: patientCoverage.status,
            });
         if (!updated) return null;
         await refreshPatientAppointmentInsurance(tx, updated.patientId);
         return updated;
      });
      return coverage
         ? res.json({ coverage })
         : res.status(404).json({ error: 'Coverage record not found.' });
   } catch (error) {
      console.error('Failed to update patient coverage:', error);
      return res
         .status(500)
         .json({ error: 'Insurance details could not be updated.' });
   }
};

export const getPatientCoverage = async (req, res) => {
   if (!requireStaff(req, res)) return;
   const patientId = Number(req.params.patientId);
   if (!Number.isInteger(patientId) || patientId < 1) {
      return res.status(400).json({ error: 'Invalid patient ID' });
   }
   try {
      const [patient] = await db
         .select({
            id: patients.id,
            firstName: patients.firstName,
            lastName: patients.lastName,
         })
         .from(patients)
         .where(eq(patients.id, patientId))
         .limit(1);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      const entries = await db
         .select({
            id: patientCoverage.id,
            insurerName: insurancePlans.insurerName,
            planName: insurancePlans.planName,
            policyNumber: patientCoverage.policyNumber,
            memberId: patientCoverage.memberId,
            coverageStart: patientCoverage.coverageStart,
            coverageEnd: patientCoverage.coverageEnd,
            status: patientCoverage.status,
            verifiedBy: patientCoverage.verifiedBy,
            verifiedByName: users.displayName,
            verifiedAt: patientCoverage.verifiedAt,
            createdAt: patientCoverage.createdAt,
         })
         .from(patientCoverage)
         .innerJoin(
            insurancePlans,
            eq(insurancePlans.id, patientCoverage.insurancePlanId),
         )
         .leftJoin(users, eq(users.id, patientCoverage.verifiedBy))
         .where(eq(patientCoverage.patientId, patientId))
         .orderBy(desc(patientCoverage.createdAt));
      return res.json({ patient, coverages: entries });
   } catch (error) {
      console.error('Failed to fetch patient coverage:', error);
      return res
         .status(500)
         .json({ error: 'Failed to fetch patient coverage' });
   }
};

export const verifyPatientCoverage = async (req, res) => {
   const coverageId = Number(req.params.coverageId);
   const status = req.body?.status;
   if (!Number.isInteger(coverageId) || coverageId < 1) {
      return res.status(400).json({ error: 'Invalid coverage ID' });
   }
   if (!['active', 'inactive'].includes(status)) {
      return res
         .status(400)
         .json({ error: 'Status must be active or inactive' });
   }
   try {
      const entry = await verifyCoverage({
         coverageId,
         requestedStatus: status,
         userId: req.user.id,
      });
      if (!entry)
         return res.status(404).json({ error: 'Coverage record not found' });
      return res.json({
         message: `Insurance coverage verified as ${entry.status} (simulated)`,
         coverage: entry,
      });
   } catch (error) {
      console.error('Failed to verify patient coverage:', error);
      return res
         .status(500)
         .json({ error: 'Failed to verify patient coverage' });
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

function parseCoverage(body = {}) {
   const insurerName = clean(body.insurer_name);
   const planName = clean(body.plan_name);
   const policyNumber = clean(body.policy_number);
   const memberId = clean(body.member_id) || null;
   const coverageStart = body.coverage_start || null;
   const coverageEnd = body.coverage_end || null;
   if (
      !insurerName ||
      insurerName.length > 150 ||
      !planName ||
      planName.length > 150 ||
      !policyNumber ||
      policyNumber.length > 100 ||
      (memberId && memberId.length > 100)
   )
      return null;
   if (
      (coverageStart && !isDate(coverageStart)) ||
      (coverageEnd && !isDate(coverageEnd)) ||
      (coverageStart && coverageEnd && coverageStart > coverageEnd)
   )
      return null;
   return {
      insurerName,
      planName,
      policyNumber,
      memberId,
      coverageStart,
      coverageEnd,
   };
}

function clean(value) {
   return typeof value === 'string' ? value.trim() : '';
}

function isDate(value) {
   if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
   const parsed = new Date(`${value}T00:00:00.000Z`);
   return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
   );
}
