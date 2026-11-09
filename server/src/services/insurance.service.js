import { and, desc, eq, gte } from 'drizzle-orm';
import { insurancePlans } from '../db/schema/insurancePlans.js';
import { patientCoverage } from '../db/schema/patientCoverage.js';
import { appointments } from '../db/schema/appointments.js';

export async function findOrCreateInsurancePlan(tx, insurerName, planName) {
   await tx
      .insert(insurancePlans)
      .values({ payerName: insurerName, planName })
      .onConflictDoNothing({
         target: [insurancePlans.payerName, insurancePlans.planName],
      });
   const [plan] = await tx
      .select({ id: insurancePlans.id })
      .from(insurancePlans)
      .where(
         and(
            eq(insurancePlans.payerName, insurerName),
            eq(insurancePlans.planName, planName),
         ),
      )
      .limit(1);
   if (!plan) {
      throw new Error('Unable to resolve insurance plan');
   }
   return plan.id;
}

export async function getCoverageStatusForAppointment(
   tx,
   patientId,
   startDate,
) {
   const date = clinicDate(startDate);
   const coverages = await tx
      .select()
      .from(patientCoverage)
      .where(eq(patientCoverage.patientId, patientId))
      .orderBy(desc(patientCoverage.createdAt));
   const effective = coverages.filter(
      (coverage) =>
         (!coverage.coverageStart ||
            clinicDate(coverage.coverageStart) <= date) &&
         (!coverage.coverageEnd || clinicDate(coverage.coverageEnd) >= date),
   );
   if (effective.some((coverage) => coverage.status === 'active'))
      return 'active';
   if (effective.some((coverage) => coverage.status === 'unverified'))
      return 'unverified';
   return coverages.length ? 'inactive' : 'unverified';
}

export async function refreshPatientAppointmentInsurance(tx, patientId) {
   const upcoming = await tx
      .select({
         id: appointments.id,
         scheduledStart: appointments.scheduledStart,
      })
      .from(appointments)
      .where(
         and(
            eq(appointments.patientId, patientId),
            eq(appointments.status, 'scheduled'),
            gte(appointments.scheduledStart, new Date()),
         ),
      );
   for (const appointment of upcoming) {
      const insuranceStatus = await getCoverageStatusForAppointment(
         tx,
         patientId,
         appointment.scheduledStart,
      );
      await tx
         .update(appointments)
         .set({ insuranceStatus, updatedAt: new Date() })
         .where(eq(appointments.id, appointment.id));
   }
}

function clinicDate(value) {
   const date = new Date(value);
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
