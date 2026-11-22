// Bootstrap: issues an Enrolment Code for a staff email when no staff_admin can.
// Usage: npm run issue:enrolment-code -- <email>
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema/index.js';
import { recordAudit } from '../src/services/audit.service.js';
import { issueEnrolmentCode } from '../src/services/second-factor.service.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
   console.error('Usage: npm run issue:enrolment-code -- <email>');
   process.exit(1);
}

try {
   const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
         and(
            sql`lower(${users.email}) = ${email}`,
            eq(users.isActive, true),
            inArray(users.role, ['staff', 'staff_admin']),
         ),
      )
      .limit(1);
   if (!user) {
      console.error('No active staff account has that email.');
      process.exit(1);
   }
   const { enrolmentCode, expiresAt } = await db.transaction((tx) =>
      issueEnrolmentCode(tx, user.id, null),
   );
   await recordAudit({
      entityType: 'user',
      entityId: user.id,
      action: 'enrolment_code_issued',
      changedBy: null,
      newValue: { expiresAt, source: 'cli' },
   });
   console.log(`Enrolment Code: ${enrolmentCode}`);
   console.log(`Expires: ${expiresAt.toISOString()}`);
   console.log(
      'Shown once. Earlier unused codes for this account no longer work.',
   );
   process.exit(0);
} catch (error) {
   console.error('Could not issue an Enrolment Code:', error.message);
   process.exit(1);
}
