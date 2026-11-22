import { asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { feeSchedule } from '../db/schema/index.js';

// Public Price List: Procedure cash prices only. Consultation Fees name doctors,
// so they are shown to signed-in patients (booking slots, Doctor Profile) instead.
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
      return res.json({ procedures });
   } catch (error) {
      console.error('Failed to load price list:', error);
      return res.status(500).json({ error: 'Failed to load price list' });
   }
}
