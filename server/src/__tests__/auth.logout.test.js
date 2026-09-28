import { startServer, readJson } from './helpers.js';

describe('POST /auth/logout', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   it('returns 200 and clears the token cookie', async () => {
      const res = await fetch(`${ctx.baseUrl}/auth/logout`, { method: 'POST' });

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({
         message: 'Logged out successfully.',
      });

      const cleared = res.headers
         .getSetCookie()
         .find((cookie) => cookie.startsWith('token='));
      expect(cleared).toBeTruthy();
      expect(cleared).toMatch(/token=;/);
   });
});
