import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { feeSchedule, providers } from '../db/schema/index.js';

// Public Price List: Procedure cash prices and active physicians' Consultation Fees.
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
      return res.json({ procedures, consultationFees });
   } catch (error) {
      console.error('Failed to load price list:', error);
      return res.status(500).json({ error: 'Failed to load price list' });
   }
}
