import { and, desc, eq, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   insurancePlans,
   patientCoverage,
   priorAuthorizations,
} from '../db/schema/index.js';
import { getAppointmentPreVisitClinicalData } from './staff.service.js';
import { generateGeminiDraft } from './gemini.service.js';
import { notifyPatient } from './notification.service.js';
import { recordAudit } from './audit.service.js';

function listFacts(items, fields) {
   if (!items?.length) return 'None documented.';
   return items
      .map((item) =>
         fields
            .map((field) => item[field])
            .filter(Boolean)
            .join(' — '),
      )
      .join('; ');
}

export function buildPriorAuthPrompt(data, coverage = null) {
   const appointment = data.appointment;
   const clinicalData = data.clinicalData || {};
   return [
      'Draft a concise prior-authorization justification for staff review.',
      'Use only the documented facts below. Do not diagnose, invent treatment history, or make a coverage decision.',
      `Requested visit: ${appointment.visitTypeName || 'unspecified'} (${appointment.visitTypeDescription || 'no description'}).`,
      `Provider specialty: ${appointment.providerSpecialty || 'unspecified'}.`,
      `Reason for visit: ${appointment.intakeReasonNote || 'not documented'}.`,
      `Insurance status: ${appointment.insuranceStatus || 'unverified'}.`,
      `Plan: ${coverage?.planName || 'not documented'} (${coverage?.payerName || 'not documented'}).`,
      `Diagnoses: ${listFacts(clinicalData.conditions, ['conditionCode', 'description'])}`,
      `Recent chart notes: ${listFacts(clinicalData.recentEncounters, ['encounterDate', 'noteText'])}`,
      `Recent labs: ${listFacts(clinicalData.recentLabs, ['testName', 'resultValue', 'unit', 'resultDate'])}`,
      `Active medications: ${listFacts(clinicalData.activeMedications, ['medicationName', 'dose'])}`,
      'Return only the justification text, without a heading or invented patient identifiers.',
   ].join('\n');
}

function fallbackText(data, coverage) {
   const appointment = data.appointment;
   const clinicalData = data.clinicalData || {};
   const diagnosisCount = clinicalData.conditions?.length || 0;
   const noteCount = clinicalData.recentEncounters?.length || 0;
   const labCount = clinicalData.recentLabs?.length || 0;
   const medicationCount = clinicalData.activeMedications?.length || 0;
   return [
      'Staff review draft: Please confirm medical necessity using the documented chart before submission.',
      `Requested service: ${appointment.visitTypeName || 'unspecified'}.`,
      `Reason for visit: ${appointment.intakeReasonNote || 'not documented'}.`,
      `Documented chart evidence includes ${diagnosisCount} diagnosis record(s), ${noteCount} recent note(s), ${labCount} lab result(s), and ${medicationCount} active medication(s).`,
      `Coverage status: ${appointment.insuranceStatus || 'unverified'}${coverage?.planName ? ` under ${coverage.planName}` : ''}.`,
   ].join(' ');
}

async function getCoverage(patientId, appointmentDate) {
   const rows = await db
      .select({
         planName: insurancePlans.planName,
         payerName: insurancePlans.payerName,
         coverageStart: patientCoverage.coverageStart,
         coverageEnd: patientCoverage.coverageEnd,
         status: patientCoverage.status,
      })
      .from(patientCoverage)
      .innerJoin(
         insurancePlans,
         eq(insurancePlans.id, patientCoverage.insurancePlanId),
      )
      .where(
         and(
            eq(patientCoverage.patientId, patientId),
            eq(patientCoverage.status, 'active'),
         ),
      )
      .orderBy(desc(patientCoverage.createdAt));
   return rows.find(
      (row) =>
         (!row.coverageStart || row.coverageStart <= appointmentDate) &&
         (!row.coverageEnd || row.coverageEnd >= appointmentDate),
   );
}

export async function generatePriorAuthDraft(
   priorAuthId,
   { force = false, reviewedBy = null, notify = true } = {},
) {
   const [authorization] = await db
      .select({
         id: priorAuthorizations.id,
         status: priorAuthorizations.status,
         appointmentId: priorAuthorizations.appointmentId,
      })
      .from(priorAuthorizations)
      .where(eq(priorAuthorizations.id, priorAuthId))
      .limit(1);
   if (!authorization) return null;

   const allowedStatuses = force ? ['needs_draft', 'drafted'] : ['needs_draft'];
   if (!allowedStatuses.includes(authorization.status)) return null;

   const data = await getAppointmentPreVisitClinicalData(
      authorization.appointmentId,
   );
   if (!data) return null;

   const appointmentDate = clinicDate(data.appointment.scheduledStart);
   const coverage = await getCoverage(
      data.appointment.patientId,
      appointmentDate,
   );
   const generated = await generateGeminiDraft({
      prompt: buildPriorAuthPrompt(data, coverage),
      fallback: fallbackText(data, coverage),
   });

   const statusFilter = force
      ? or(
           eq(priorAuthorizations.status, 'needs_draft'),
           eq(priorAuthorizations.status, 'drafted'),
        )
      : eq(priorAuthorizations.status, 'needs_draft');
   const [updated] = await db
      .update(priorAuthorizations)
      .set({
         justificationText: generated.text,
         aiGeneratedAt: generated.source === 'gemini' ? new Date() : null,
         status: 'drafted',
         reviewedBy,
         updatedAt: new Date(),
      })
      .where(and(eq(priorAuthorizations.id, priorAuthId), statusFilter))
      .returning();
   if (!updated) return null;

   if (notify) {
      await notifyPatient(
         db,
         data.appointment.patientId,
         'prior_authorization_draft_ready',
         'A prior-authorization draft is ready for staff review.',
      );
   }
   void recordAudit({
      entityType: 'prior_authorization',
      entityId: priorAuthId,
      action:
         generated.source === 'gemini' ? 'ai_generated' : 'fallback_generated',
      newValue: { source: generated.source, status: 'drafted' },
   });
   return { priorAuthorization: updated, source: generated.source };
}

function clinicDate(value) {
   const date = new Date(value);
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function processPendingPriorAuthDrafts(limit = 10) {
   if (process.env.PRIOR_AUTH_DRAFT_WORKER_ENABLED === 'false') {
      return { processed: 0, pending: 0, skipped: true };
   }

   const pending = await db
      .select({ id: priorAuthorizations.id })
      .from(priorAuthorizations)
      .where(eq(priorAuthorizations.status, 'needs_draft'))
      .orderBy(desc(priorAuthorizations.updatedAt))
      .limit(limit);
   let processed = 0;
   for (const authorization of pending) {
      try {
         if (await generatePriorAuthDraft(authorization.id)) processed += 1;
      } catch (error) {
         console.error('Prior-authorization draft job failed:', error.message);
      }
   }
   return { processed, pending: pending.length };
}
