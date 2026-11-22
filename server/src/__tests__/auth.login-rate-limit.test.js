import { startServer, resetMocks, postJson } from './helpers.js';

describe('POST /auth/login rate limit', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   it('rejects requests from one IP with 429 once over the limit', async () => {
      for (let i = 0; i < 20; i += 1) {
         const res = await postJson(ctx.baseUrl, '/auth/login', {});
         expect(res.status).toBe(400);
      }

      const res = await postJson(ctx.baseUrl, '/auth/login', {});
      expect(res.status).toBe(429);
   });
});
