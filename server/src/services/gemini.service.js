const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const SUPPORTED_DOCUMENT_TYPES = new Set([
   'application/pdf',
   'image/png',
   'image/jpeg',
   'image/jpg',
   'image/webp',
   'image/heic',
   'image/heif',
]);

function getEndpoint() {
   const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
   return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

export async function generateGeminiDraft({ prompt, fallback }) {
   const apiKey = process.env.GEMINI_API_KEY?.trim();
   if (!apiKey) return { text: fallback, source: 'fallback' };

   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 12_000);
   try {
      const response = await fetch(
         `${getEndpoint()}?key=${encodeURIComponent(apiKey)}`,
         {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
               contents: [{ role: 'user', parts: [{ text: prompt }] }],
               generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
            }),
            signal: controller.signal,
         },
      );
      if (!response.ok) return { text: fallback, source: 'fallback' };
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts
         ?.map((part) => part.text)
         .filter(Boolean)
         .join('\n')
         .trim();
      return text
         ? { text, source: 'gemini' }
         : { text: fallback, source: 'fallback' };
   } catch {
      return { text: fallback, source: 'fallback' };
   } finally {
      clearTimeout(timeout);
   }
}

function parseJsonResponse(data) {
   const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('')
      .trim();
   if (!text) return null;
   const withoutFence = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
   try {
      return JSON.parse(withoutFence);
   } catch {
      return null;
   }
}

function normalizeDocument(documentBase64, mimeType) {
   const dataUri = documentBase64.match(/^data:([^;]+);base64,(.+)$/s);
   const normalizedMimeType = (dataUri?.[1] || mimeType || '').toLowerCase();
   const data = dataUri?.[2] || documentBase64;
   if (!SUPPORTED_DOCUMENT_TYPES.has(normalizedMimeType)) {
      throw new Error('Unsupported document type');
   }
   if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 === 1) {
      throw new Error('Document must be base64 encoded');
   }
   const byteLength =
      Math.floor((data.length * 3) / 4) -
      (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
   if (byteLength > MAX_DOCUMENT_BYTES) {
      throw new Error('Document is too large');
   }
   return { data, mimeType: normalizedMimeType };
}

function normalizeLineItems(value) {
   const rows = Array.isArray(value) ? value : value?.line_items;
   if (!Array.isArray(rows)) return [];
   return rows
      .map((item) => ({
         procedureCode:
            typeof item?.procedure_code === 'string'
               ? item.procedure_code.trim() || null
               : null,
         description:
            typeof item?.description === 'string'
               ? item.description.trim() || null
               : null,
         amount:
            item?.amount === null || item?.amount === undefined
               ? null
               : Number(item.amount),
      }))
      .filter(
         (item) =>
            (item.procedureCode || item.description) &&
            Number.isFinite(item.amount) &&
            item.amount >= 0,
      );
}

export async function extractBillLineItems({ documentBase64, mimeType }) {
   const fallback = {
      lineItems: [],
      source: 'fallback',
      requiresManualReview: true,
   };
   const apiKey = process.env.GEMINI_API_KEY?.trim();
   if (!apiKey) return fallback;

   let document;
   try {
      document = normalizeDocument(documentBase64, mimeType);
   } catch {
      return fallback;
   }

   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 20_000);
   try {
      const response = await fetch(
         `${getEndpoint()}?key=${encodeURIComponent(apiKey)}`,
         {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
               contents: [
                  {
                     role: 'user',
                     parts: [
                        {
                           text: 'Read this medical bill and return only JSON in the form {"line_items":[{"procedure_code":string|null,"description":string|null,"amount":number}]}. Extract visible charge rows only. Do not infer missing amounts or diagnoses.',
                        },
                        {
                           inline_data: {
                              mime_type: document.mimeType,
                              data: document.data,
                           },
                        },
                     ],
                  },
               ],
               generationConfig: {
                  temperature: 0,
                  maxOutputTokens: 1200,
                  responseMimeType: 'application/json',
               },
            }),
            signal: controller.signal,
         },
      );
      if (!response.ok) return fallback;
      const parsed = parseJsonResponse(await response.json());
      const lineItems = normalizeLineItems(parsed);
      return lineItems.length
         ? { lineItems, source: 'gemini', requiresManualReview: true }
         : fallback;
   } catch {
      return fallback;
   } finally {
      clearTimeout(timeout);
   }
}

export function buildPreVisitPrompt({
   appointment,
   conditions,
   encounters,
   labs,
   medications,
}) {
   return [
      'Write a concise pre-visit clinical summary for staff review. Do not diagnose, prescribe, or invent facts.',
      `Visit type: ${appointment.visitTypeName}. Specialty: ${appointment.providerSpecialty || 'unspecified'}.`,
      `Reason: ${appointment.intakeReasonNote || 'not provided'}.`,
      `Conditions: ${JSON.stringify(conditions.map((item) => ({ code: item.conditionCode, description: item.description })))}`,
      `Recent encounters: ${JSON.stringify(encounters.map((item) => ({ date: item.encounterDate, note: item.noteText })))}`,
      `Labs: ${JSON.stringify(labs.map((item) => ({ name: item.testName, result: item.resultValue, unit: item.unit, date: item.resultDate })))}`,
      `Medications: ${JSON.stringify(medications.map((item) => ({ name: item.medicationName, dose: item.dose })))}`,
   ].join('\n');
}
