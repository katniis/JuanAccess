import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { patientCoverage } from '../db/schema/patientCoverage.js';
import { insurerService } from './insurer.service.js';
import { refreshPatientAppointmentInsurance } from './insurance.service.js';
import { notifyPatient } from './notification.service.js';
import { recordAudit } from './audit.service.js';

export async function verifyCoverage({ coverageId, requestedStatus, userId }) {
   const status = (
      await insurerService.verifyEligibility({
         eligibilityStatus: requestedStatus,
      })
   ).status;
   const coverage = await db.transaction(async (tx) => {
      const [updated] = await tx
         .update(patientCoverage)
         .set({
            status,
            verifiedBy: userId,
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

      await notifyPatient(
         tx,
         updated.patientId,
         'coverage_simulation',
         `Your insurance coverage was simulated as ${status}.`,
      );
      await refreshPatientAppointmentInsurance(tx, updated.patientId);
      return { ...updated, status };
   });

   if (coverage) {
      void recordAudit({
         entityType: 'patient_coverage',
         entityId: coverage.id,
         action: 'coverage_simulation',
         changedBy: userId,
         newValue: { status, source: 'local_plan' },
      });
   }
   return coverage;
}
