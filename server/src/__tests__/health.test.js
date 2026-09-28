import { startServer, readJson } from './helpers.js';

describe('GET /api/health', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   it('responds with 200 and { status: "ok" }', async () => {
      const res = await fetch(`${ctx.baseUrl}/api/health`);

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ status: 'ok' });
   });
});
