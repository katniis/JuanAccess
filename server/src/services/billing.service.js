import { and, asc, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
   appointments,
   billLineItems,
   bills,
   disputeLetters,
   feeSchedule,
   patients,
   proceduresPerformed,
} from '../db/schema/index.js';
import { explainBillLineItems } from './gemini.service.js';
import { createBillSignedUrl, deleteBillFile } from './bill-storage.service.js';
import { notifyPatient } from './notification.service.js';

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

   return {
      ...bill,
      uploadedFileUrl:
         (await createBillSignedUrl(bill.uploadedFileUrl, bill.patientId)) ||
         bill.uploadedFileUrl,
      lineItems,
      disputeLetter: dispute[0] ?? null,
   };
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
         await notifyPatient(
            tx,
            patientId,
            'dispute_letter_available',
            'Your bill dispute letter is ready to review.',
         );
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

export async function deletePatientBill(patientId, billId) {
   return db.transaction(async (tx) => {
      const [bill] = await tx
         .select({
            id: bills.id,
            uploadedFileUrl: bills.uploadedFileUrl,
         })
         .from(bills)
         .where(and(eq(bills.id, billId), eq(bills.patientId, patientId)))
         .limit(1)
         .for('update');
      if (!bill) return { error: 'Bill not found', status: 404 };

      const [dispute] = await tx
         .select({
            id: disputeLetters.id,
            submittedAt: disputeLetters.submittedAt,
         })
         .from(disputeLetters)
         .where(eq(disputeLetters.billId, billId))
         .limit(1)
         .for('update');
      if (dispute?.submittedAt) {
         return {
            error: 'A bill with a dispute submitted to clinic staff cannot be deleted',
            status: 409,
         };
      }

      if (dispute) {
         await tx
            .delete(disputeLetters)
            .where(eq(disputeLetters.id, dispute.id));
      }
      await tx.delete(billLineItems).where(eq(billLineItems.billId, billId));
      await tx.delete(bills).where(eq(bills.id, billId));
      await deleteBillFile(bill.uploadedFileUrl, patientId);

      return { deleted: true };
   });
}

export async function explainPatientBill(patientId, billId) {
   const bill = await getPatientBill(patientId, billId);
   if (!bill) return null;
   return explainBillLineItems(bill.lineItems);
}

export async function updatePatientDisputeLetter(
   patientId,
   billId,
   letterText,
) {
   const bill = await getPatientBill(patientId, billId);
   if (!bill?.disputeLetter) return null;
   if (bill.disputeLetter.submittedAt) {
      return {
         error: 'A submitted dispute letter can no longer be edited',
         status: 409,
      };
   }
   const [updated] = await db
      .update(disputeLetters)
      .set({ letterText, patientEdited: true })
      .where(
         and(
            eq(disputeLetters.id, bill.disputeLetter.id),
            isNull(disputeLetters.submittedAt),
         ),
      )
      .returning();
   return (
      updated || {
         error: 'A submitted dispute letter can no longer be edited',
         status: 409,
      }
   );
}

export async function submitPatientDisputeLetter(patientId, billId) {
   const bill = await getPatientBill(patientId, billId);
   if (!bill?.disputeLetter) return null;
   if (!bill.disputeLetter.letterText.trim()) {
      return {
         error: 'A dispute letter cannot be submitted while it is empty',
         status: 409,
      };
   }
   if (bill.disputeLetter.submittedAt) return bill.disputeLetter;

   const [submitted] = await db
      .update(disputeLetters)
      .set({ submittedAt: new Date() })
      .where(
         and(
            eq(disputeLetters.id, bill.disputeLetter.id),
            isNull(disputeLetters.submittedAt),
         ),
      )
      .returning();
   if (submitted) return submitted;

   const refreshedBill = await getPatientBill(patientId, billId);
   return refreshedBill?.disputeLetter || null;
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
      .select({
         id: bills.id,
         patientFirstName: patients.firstName,
         patientLastName: patients.lastName,
         billDate: bills.uploadDate,
         submittedAt: disputeLetters.submittedAt,
         letterText: disputeLetters.letterText,
      })
      .from(disputeLetters)
      .innerJoin(bills, eq(bills.id, disputeLetters.billId))
      .innerJoin(patients, eq(patients.id, bills.patientId))
      .where(isNotNull(disputeLetters.submittedAt))
      .orderBy(desc(disputeLetters.submittedAt));
   const lineItems = rows.length
      ? await db
           .select()
           .from(billLineItems)
           .where(
              inArray(
                 billLineItems.billId,
                 rows.map((row) => row.id),
              ),
           )
           .orderBy(asc(billLineItems.id))
      : [];
   const itemsByBill = new Map();
   for (const item of lineItems) {
      const items = itemsByBill.get(item.billId) || [];
      items.push(item);
      itemsByBill.set(item.billId, items);
   }
   return rows.map((row) => toStaffDispute(row, itemsByBill.get(row.id) || []));
}

export async function getSubmittedDispute(billId) {
   const [row] = await db
      .select({
         id: bills.id,
         patientFirstName: patients.firstName,
         patientLastName: patients.lastName,
         billDate: bills.uploadDate,
         submittedAt: disputeLetters.submittedAt,
         letterText: disputeLetters.letterText,
      })
      .from(disputeLetters)
      .innerJoin(bills, eq(bills.id, disputeLetters.billId))
      .innerJoin(patients, eq(patients.id, bills.patientId))
      .where(and(eq(bills.id, billId), isNotNull(disputeLetters.submittedAt)))
      .limit(1);
   if (!row) return null;
   const lineItems = await db
      .select()
      .from(billLineItems)
      .where(eq(billLineItems.billId, billId))
      .orderBy(asc(billLineItems.id));
   return toStaffDispute(row, lineItems);
}

function toStaffDispute(record, lineItems) {
   const issueLabels = [
      ...new Set(
         lineItems.flatMap((item) =>
            item.flagReason
               ? item.flagReason.split('; ').map(labelDisputeIssue)
               : [],
         ),
      ),
   ];
   return {
      id: record.id,
      patient: `${record.patientFirstName} ${record.patientLastName}`,
      billDate: record.billDate,
      submittedAt: record.submittedAt,
      status: 'Submitted',
      flaggedIssues: issueLabels,
      lineItems: lineItems.map((item) => ({
         id: item.id,
         code: item.procedureCode || '—',
         description: item.description || 'Unidentified charge',
         billed: Number(item.amount),
         flag: item.flagReason
            ? labelDisputeIssue(item.flagReason.split('; ')[0])
            : '',
         flagReason: item.flagReason,
      })),
      letter: record.letterText,
   };
}

function labelDisputeIssue(reason) {
   const normalized = reason.toLowerCase();
   if (normalized.includes('duplicate')) return 'Duplicate';
   if (normalized.includes('missing procedure code')) return 'Coding Error';
   if (normalized.includes('not performed')) return 'Not Performed';
   if (normalized.includes('fee schedule')) return 'Overcharge';
   return 'Review Needed';
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
