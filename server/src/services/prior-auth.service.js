import { and, desc, eq, isNull } from 'drizzle-orm';
import { patientCoverage } from '../db/schema/patientCoverage.js';
import { priorAuthRules } from '../db/schema/priorAuthRules.js';
import { priorAuthorizations } from '../db/schema/priorAuthorizations.js';

export async function createPriorAuthorizationForAppointment(tx, appointment) {
   const coverage = await tx
      .select({
         planId: patientCoverage.insurancePlanId,
         coverageStart: patientCoverage.coverageStart,
         coverageEnd: patientCoverage.coverageEnd,
      })
      .from(patientCoverage)
      .where(eq(patientCoverage.patientId, appointment.patientId))
      .orderBy(desc(patientCoverage.createdAt));
   const appointmentDate = clinicDate(appointment.scheduledStart);
   const applicableCoverage = coverage.find(
      (item) =>
         (!item.coverageStart || item.coverageStart <= appointmentDate) &&
         (!item.coverageEnd || item.coverageEnd >= appointmentDate),
   );
   const planId = applicableCoverage?.planId ?? null;
   const rules = await tx
      .select({ requiresPriorAuth: priorAuthRules.requiresPriorAuth })
      .from(priorAuthRules)
      .where(
         and(
            eq(priorAuthRules.visitTypeId, appointment.visitTypeId),
            planId
               ? eq(priorAuthRules.insurancePlanId, planId)
               : isNull(priorAuthRules.insurancePlanId),
         ),
      )
      .limit(1);
   const [genericRule] = planId
      ? await tx
           .select({ requiresPriorAuth: priorAuthRules.requiresPriorAuth })
           .from(priorAuthRules)
           .where(
              and(
                 eq(priorAuthRules.visitTypeId, appointment.visitTypeId),
                 isNull(priorAuthRules.insurancePlanId),
              ),
           )
           .limit(1)
      : [];
   const applicableRule = rules[0] ?? genericRule;
   const [authorization] = await tx
      .insert(priorAuthorizations)
      .values({
         appointmentId: appointment.id,
         status: applicableRule?.requiresPriorAuth
            ? 'needs_draft'
            : 'not_required',
      })
      .onConflictDoNothing({ target: priorAuthorizations.appointmentId })
      .returning();
   if (authorization) return authorization;
   const [existing] = await tx
      .select()
      .from(priorAuthorizations)
      .where(eq(priorAuthorizations.appointmentId, appointment.id))
      .limit(1);
   return existing;
}

function clinicDate(value) {
   const date = new Date(value);
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
