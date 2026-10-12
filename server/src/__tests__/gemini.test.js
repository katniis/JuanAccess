import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { generateGeminiDraft } from '../services/gemini.service.js';

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
});
