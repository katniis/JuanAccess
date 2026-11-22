import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   apePackageProcedures,
   apePackages,
   feeSchedule,
   providers,
} from '../db/schema/index.js';
import { fromCentavos, toCentavos } from '../utils/money.js';

const SEXES = ['female', 'male'];

// Groups joined package/Procedure rows; the itemized sum differs by Sex at Birth when Procedures are sex-specific.
function summarizePackages(rows) {
   const byId = new Map();
   for (const { packageId, name, packagePrice, ...procedure } of rows) {
      if (!byId.has(packageId))
         byId.set(packageId, {
            id: packageId,
            name,
            packagePrice,
            procedures: [],
         });
      byId.get(packageId).procedures.push(procedure);
   }
   return [...byId.values()].map((apePackage) => {
      const itemizedSum = {};
      const savings = {};
      for (const sex of SEXES) {
         const sum = apePackage.procedures
            .filter((p) => !p.sexAtBirth || p.sexAtBirth === sex)
            .reduce((total, p) => total + toCentavos(p.standardCost), 0);
         itemizedSum[sex] = fromCentavos(sum);
         savings[sex] = fromCentavos(sum - toCentavos(apePackage.packagePrice));
      }
      return { ...apePackage, itemizedSum, savings };
   });
}

// Public Price List: Procedure cash prices, active physicians' Consultation Fees, and active APE Packages.
export async function getPriceList(_req, res) {
   try {
      const procedures = await db
         .select({
            procedureCode: feeSchedule.procedureCode,
            description: feeSchedule.description,
            standardCost: feeSchedule.standardCost,
         })
         .from(feeSchedule)
         .orderBy(asc(feeSchedule.description));
      const consultationFees = await db
         .select({
            id: providers.id,
            firstName: providers.firstName,
            lastName: providers.lastName,
            specialty: providers.specialty,
            consultationFee: providers.consultationFee,
         })
         .from(providers)
         .where(
            and(
               eq(providers.isActive, true),
               eq(providers.profession, 'physician'),
               isNotNull(providers.consultationFee),
            ),
         )
         .orderBy(asc(providers.lastName));
      const packageRows = await db
         .select({
            packageId: apePackages.id,
            name: apePackages.name,
            packagePrice: apePackages.packagePrice,
            procedureCode: feeSchedule.procedureCode,
            description: feeSchedule.description,
            standardCost: feeSchedule.standardCost,
            sexAtBirth: apePackageProcedures.sexAtBirth,
         })
         .from(apePackageProcedures)
         .innerJoin(
            apePackages,
            eq(apePackageProcedures.packageId, apePackages.id),
         )
         .innerJoin(
            feeSchedule,
            eq(apePackageProcedures.feeScheduleId, feeSchedule.id),
         )
         .where(eq(apePackages.isActive, true))
         .orderBy(asc(apePackages.name), asc(feeSchedule.description));
      return res.json({
         procedures,
         consultationFees,
         apePackages: summarizePackages(packageRows),
      });
   } catch (error) {
      console.error('Failed to load price list:', error);
      return res.status(500).json({ error: 'Failed to load price list' });
   }
}
