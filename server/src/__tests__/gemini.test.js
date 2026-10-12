import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
   extractBillLineItems,
   generateGeminiDraft,
} from '../services/gemini.service.js';

const originalKey = process.env.GEMINI_API_KEY;
const originalFetch = global.fetch;

afterEach(() => {
   if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
   else process.env.GEMINI_API_KEY = originalKey;
   global.fetch = originalFetch;
});

describe('Gemini draft service', () => {
   it('uses the deterministic fallback when no key is configured', async () => {
      delete process.env.GEMINI_API_KEY;
      const result = await generateGeminiDraft({
         prompt: 'ignored',
         fallback: 'fallback text',
      });
      expect(result).toEqual({ text: 'fallback text', source: 'fallback' });
   });

   it('returns generated text without exposing request details', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
         ok: true,
         json: async () => ({
            candidates: [{ content: { parts: [{ text: 'generated draft' }] } }],
         }),
      });
      const result = await generateGeminiDraft({
         prompt: 'clinical prompt',
         fallback: 'fallback text',
      });
      expect(result).toEqual({ text: 'generated draft', source: 'gemini' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
   });

   it('falls back on provider failure', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockRejectedValue(new Error('network failure'));
      const result = await generateGeminiDraft({
         prompt: 'clinical prompt',
         fallback: 'fallback text',
      });
      expect(result).toEqual({ text: 'fallback text', source: 'fallback' });
   });

   it('extracts bill rows as structured data from Gemini', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
         ok: true,
         json: async () => ({
            candidates: [
               {
                  content: {
                     parts: [
                        {
                           text: '{"line_items":[{"procedure_code":"CBC","description":"Complete blood count","amount":450}]}',
                        },
                     ],
                  },
               },
            ],
         }),
      });

      const result = await extractBillLineItems({
         documentBase64: Buffer.from('bill').toString('base64'),
         mimeType: 'application/pdf',
      });

      expect(result).toEqual({
         lineItems: [
            {
               procedureCode: 'CBC',
               description: 'Complete blood count',
               amount: 450,
            },
         ],
         source: 'gemini',
         requiresManualReview: true,
      });
   });

   it('falls back when bill OCR has no key or invalid input', async () => {
      delete process.env.GEMINI_API_KEY;
      const result = await extractBillLineItems({
         documentBase64: 'not-a-document',
         mimeType: 'application/pdf',
      });
      expect(result).toEqual({
         lineItems: [],
         source: 'fallback',
         requiresManualReview: true,
      });
   });
});
