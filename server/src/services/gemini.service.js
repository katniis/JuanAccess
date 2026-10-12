const DEFAULT_MODEL = 'gemini-2.5-flash';

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
