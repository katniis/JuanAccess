import { db } from '../db/index.js';
import { auditLog } from '../db/schema/auditLog.js';

export async function recordAudit({
   entityType,
   entityId,
   action,
   changedBy,
   oldValue,
   newValue,
}) {
   if (process.env.NODE_ENV === 'test') return;
   try {
      await db.insert(auditLog).values({
         entityType,
         entityId,
         action,
         changedBy: changedBy || null,
         oldValue: oldValue || null,
         newValue: newValue || null,
      });
   } catch (error) {
      console.error('Audit record failed:', error.message);
   }
}
