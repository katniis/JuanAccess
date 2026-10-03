import { and, desc, eq } from 'drizzle-orm';
import { insurancePlans } from '../db/schema/insurancePlans.js';
import { patientCoverage } from '../db/schema/patientCoverage.js';

export async function findOrCreateInsurancePlan(tx, insurerName, planName) {
   await tx
      .insert(insurancePlans)
      .values({ insurerName, planName })
      .onConflictDoNothing({
         target: [insurancePlans.insurerName, insurancePlans.planName],
      });
   const [plan] = await tx
      .select({ id: insurancePlans.id })
      .from(insurancePlans)
      .where(
         and(
            eq(insurancePlans.insurerName, insurerName),
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
   const effective = coverages.find(
      (coverage) =>
         coverage.status === 'active' &&
         (!coverage.coverageStart || coverage.coverageStart <= date) &&
         (!coverage.coverageEnd || coverage.coverageEnd >= date),
   );
   if (effective) return 'active';
   if (coverages.some((coverage) => coverage.status === 'unverified'))
      return 'unverified';
   return coverages.length ? 'inactive' : 'unverified';
}

function clinicDate(value) {
   const date = new Date(value);
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
