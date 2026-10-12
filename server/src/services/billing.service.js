import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   appointments,
   billLineItems,
   bills,
   disputeLetters,
   feeSchedule,
   proceduresPerformed,
} from '../db/schema/index.js';
import { generateGeminiDraft } from './gemini.service.js';

const money = (value) => Number(value);

async function getBillWithChildren(tx, billId, patientId = null) {
   const conditions = [eq(bills.id, billId)];
   if (patientId !== null) conditions.push(eq(bills.patientId, patientId));

   const [bill] = await tx
      .select()
      .from(bills)
      .where(and(...conditions))
      .limit(1);
   if (!bill) return null;

   const [lineItems, dispute] = await Promise.all([
      tx
         .select()
         .from(billLineItems)
         .where(eq(billLineItems.billId, billId))
         .orderBy(asc(billLineItems.id)),
      tx
         .select()
         .from(disputeLetters)
         .where(eq(disputeLetters.billId, billId))
         .limit(1),
   ]);

   return { ...bill, lineItems, disputeLetter: dispute[0] ?? null };
}

function flagLineItem(lineItem, performedCounts, billedCounts, fees) {
   const reasons = [];
   const code = lineItem.procedureCode?.trim();
   if (!code) reasons.push('Missing procedure code');

   const hasAppointment = performedCounts !== null;
   const performed =
      hasAppointment && code ? (performedCounts.get(code) ?? 0) : 0;
   const billed =
      hasAppointment && code ? (billedCounts.get(code) ?? 0) + 1 : 0;
   if (hasAppointment && code && performed === 0) {
      reasons.push(
         'Not performed — no matching procedure on record for this visit',
      );
   } else if (hasAppointment && code && billed > performed) {
      reasons.push(
         'Duplicate charge — more billable units than recorded procedures',
      );
   }

   const fee = code ? fees.get(code) : null;
   if (fee && money(lineItem.amount) > money(fee.standardCost)) {
      reasons.push('Amount exceeds the internal fee schedule');
   }

   return reasons.length ? reasons.join('; ') : null;
}

function buildDisputeLetter(lineItems) {
   const flagged = lineItems.filter((item) => item.flagReason);
   if (!flagged.length) return null;
   const details = flagged
      .map(
         (item) =>
            `${item.description || item.procedureCode || 'Unidentified charge'} (${item.amount}) — ${item.flagReason}`,
      )
      .join('; ');
   return `Dear Billing Department, I am disputing the following charges on my bill: ${details}. Please review and issue a corrected statement. Sincerely, the patient.`;
}

export async function createBill({
   patientId,
   appointmentId,
   uploadedFileUrl,
   lineItems,
}) {
   return db.transaction(async (tx) => {
      if (appointmentId) {
         const [appointment] = await tx
            .select({ id: appointments.id })
            .from(appointments)
            .where(
               and(
                  eq(appointments.id, appointmentId),
                  eq(appointments.patientId, patientId),
               ),
            )
            .limit(1);
         if (!appointment)
            return { error: 'Appointment not found', status: 404 };
      }

      const [bill] = await tx
         .insert(bills)
         .values({
            patientId,
            appointmentId: appointmentId || null,
            uploadedFileUrl,
         })
         .returning();

      const performed = appointmentId
         ? await tx
              .select()
              .from(proceduresPerformed)
              .where(eq(proceduresPerformed.appointmentId, appointmentId))
         : null;
      const fees = await tx.select().from(feeSchedule);
      const feeMap = new Map(fees.map((fee) => [fee.procedureCode, fee]));
      const performedCounts = performed
         ? new Map(
              performed.map((procedure) => [
                 procedure.procedureCode,
                 performed.filter(
                    (row) => row.procedureCode === procedure.procedureCode,
                 ).length,
              ]),
           )
         : null;

      const billedCounts = new Map();
      const preparedItems = lineItems.map((lineItem) => {
         const flagReason = flagLineItem(
            lineItem,
            performedCounts,
            billedCounts,
            feeMap,
         );
         if (lineItem.procedureCode) {
            billedCounts.set(
               lineItem.procedureCode,
               (billedCounts.get(lineItem.procedureCode) ?? 0) + 1,
            );
         }
         return {
            billId: bill.id,
            procedureCode: lineItem.procedureCode?.trim() || null,
            description: lineItem.description?.trim() || null,
            amount: lineItem.amount,
            isFlagged: Boolean(flagReason),
            flagReason,
         };
      });

      if (preparedItems.length)
         await tx.insert(billLineItems).values(preparedItems);

      const status = preparedItems.some((item) => item.isFlagged)
         ? 'disputed'
         : 'processed';
      await tx.update(bills).set({ status }).where(eq(bills.id, bill.id));

      const letterText = buildDisputeLetter(preparedItems);
      if (letterText) {
         await tx
            .insert(disputeLetters)
            .values({ billId: bill.id, letterText });
      }

      return { billId: bill.id, status };
   });
}

export async function listPatientBills(patientId) {
   const rows = await db
      .select()
      .from(bills)
      .where(eq(bills.patientId, patientId))
      .orderBy(desc(bills.uploadDate));
   return Promise.all(
      rows.map((bill) => getBillWithChildren(db, bill.id, patientId)),
   );
}

export async function getPatientBill(patientId, billId) {
   return getBillWithChildren(db, billId, patientId);
}

export async function explainPatientBill(patientId, billId) {
   const bill = await getPatientBill(patientId, billId);
   if (!bill) return null;
   const fallback = bill.lineItems.length
      ? `This bill contains ${bill.lineItems.length} charge(s). Review each amount against the clinic fee schedule and contact billing about any flagged item.`
      : 'This bill has no itemized charges yet. Contact billing for an itemized statement.';
   return generateGeminiDraft({
      prompt: `Explain this medical bill in plain language for the patient. Do not give legal or coverage advice and do not change any amounts. Bill status: ${bill.status}. Line items: ${JSON.stringify(bill.lineItems.map((item) => ({ description: item.description, amount: item.amount, flagged: item.isFlagged, reason: item.flagReason })))}.`,
      fallback,
   });
}

export async function updatePatientDisputeLetter(
   patientId,
   billId,
   letterText,
) {
   const bill = await getPatientBill(patientId, billId);
   if (!bill?.disputeLetter) return null;
   const [updated] = await db
      .update(disputeLetters)
      .set({ letterText, patientEdited: true })
      .where(eq(disputeLetters.id, bill.disputeLetter.id))
      .returning();
   return updated;
}

export async function markDisputeDownloaded(patientId, billId) {
   const bill = await getPatientBill(patientId, billId);
   if (!bill?.disputeLetter) return null;
   const [updated] = await db
      .update(disputeLetters)
      .set({ downloadedAt: new Date() })
      .where(eq(disputeLetters.id, bill.disputeLetter.id))
      .returning();
   return updated;
}

export async function listDisputes() {
   const rows = await db
      .select()
      .from(bills)
      .where(eq(bills.status, 'disputed'))
      .orderBy(desc(bills.uploadDate));
   return Promise.all(rows.map((bill) => getBillWithChildren(db, bill.id)));
}

export async function listFeeSchedule() {
   return db.select().from(feeSchedule).orderBy(asc(feeSchedule.procedureCode));
}

export async function recordProcedure(
   appointmentId,
   procedureCode,
   description,
) {
   const [appointment] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
   if (!appointment) return null;
   const [procedure] = await db
      .insert(proceduresPerformed)
      .values({ appointmentId, procedureCode, description })
      .returning();
   return procedure;
}

export async function listAppointmentProcedures(appointmentId) {
   return db
      .select()
      .from(proceduresPerformed)
      .where(eq(proceduresPerformed.appointmentId, appointmentId))
      .orderBy(desc(proceduresPerformed.performedAt));
}
