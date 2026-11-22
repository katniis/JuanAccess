import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { appointments, visitTypes } from '../db/schema/index.js';
import { generateGeminiDraft } from './gemini.service.js';

const MAX_LETTER_LENGTH = 5000;

// Trims a submitted Cancellation Letter; empty means none was sent.
export function parseCancellationLetter(value) {
   const text =
      typeof value === 'string' ? value.trim().slice(0, MAX_LETTER_LENGTH) : '';
   return text || null;
}

function parseCandidateDates(value) {
   if (!Array.isArray(value)) return [];
   return value
      .filter((item) => typeof item === 'string' && item.trim())
      .slice(0, 5)
      .map((item) => item.trim().slice(0, 60));
}

const readable = (reason) => reason.replace(/_/g, ' ');

// Only the reason category, free text, visit type and candidate dates go to the AI: never patient names or contact details.
export function buildCancellationLetterPrompt({
   direction,
   reason,
   reasonText,
   visitType,
   candidateDates,
}) {
   const lines =
      direction === 'patient'
         ? [
              'Write a short, polite message from a patient to a clinic cancelling their appointment.',
              'Polish the rough reason below; do not add facts, names, or contact details.',
           ]
         : [
              'Write a short, warm message from clinic staff to a patient about a cancelled appointment.',
              'Explain the reason, apologise, and offer the other dates listed if any; do not invent dates, names, or contact details.',
           ];
   return [
      ...lines,
      `Visit type: ${visitType}.`,
      `Reason category: ${readable(reason)}.`,
      `Reason details: ${reasonText || 'none given'}.`,
      ...(direction === 'staff'
         ? [`Other dates: ${candidateDates.join('; ') || 'none listed'}.`]
         : []),
      'Return only the message text, with no greeting placeholder like [Name] and no signature.',
   ].join('\n');
}

function fallbackLetter({
   direction,
   reason,
   reasonText,
   visitType,
   candidateDates,
}) {
   const why = reasonText || readable(reason);
   if (direction === 'patient') {
      return `Hello, I need to cancel my ${visitType} appointment because of ${why}. Thank you for understanding.`;
   }
   const dates = candidateDates.length
      ? ` We can offer these other dates instead: ${candidateDates.join('; ')}.`
      : ' Please book a new time that suits you.';
   return `We apologise, but we have had to cancel your ${visitType} appointment because of ${why}.${dates}`;
}

// Returns { letter, source } or null when the appointment is not cancellable.
export async function draftCancellationLetter({
   appointmentId,
   patientId = null,
   direction,
   reason,
   reasonText,
   candidateDates,
}) {
   const conditions = [
      eq(appointments.id, appointmentId),
      eq(appointments.status, 'scheduled'),
   ];
   if (patientId) conditions.push(eq(appointments.patientId, patientId));
   const [appointment] = await db
      .select({ visitTypeName: visitTypes.name })
      .from(appointments)
      .innerJoin(visitTypes, eq(visitTypes.id, appointments.visitTypeId))
      .where(and(...conditions))
      .limit(1);
   if (!appointment) return null;

   const facts = {
      direction,
      reason,
      reasonText,
      visitType: appointment.visitTypeName || 'clinic',
      candidateDates:
         direction === 'staff' ? parseCandidateDates(candidateDates) : [],
   };
   const { text, source } = await generateGeminiDraft({
      prompt: buildCancellationLetterPrompt(facts),
      fallback: fallbackLetter(facts),
   });
   return { letter: text, source };
}
