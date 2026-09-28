import { startServer } from './helpers.js';

describe('error handling', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   it('returns 404 for an unknown route', async () => {
      const res = await fetch(`${ctx.baseUrl}/api/does-not-exist`);

      expect(res.status).toBe(404);
   });

   it('returns 404 for an unsupported method on a known route', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/login`, {
         method: 'DELETE',
      });

      expect(res.status).toBe(404);
   });

   it('returns 400 for a malformed JSON body', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/login`, {
         method: 'POST',
         headers: { 'content-type': 'application/json' },
         body: '{not valid json',
      });

      expect(res.status).toBe(400);
   });
});
