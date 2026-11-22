process.env.TRUST_PROXY_HOPS = '1';
const { startServer, resetMocks, postJson } = await import('./helpers.js');

describe('POST /auth/login rate limit with TRUST_PROXY_HOPS set', () => {
   let ctx;

   beforeAll(async () => {
      ctx = await startServer();
   });

   afterAll(async () => {
      await ctx.close();
   });

   beforeEach(resetMocks);

   const login = (clientIp) =>
      postJson(ctx.baseUrl, '/auth/login', {}, { 'x-forwarded-for': clientIp });

   it('gives each forwarded client its own bucket', async () => {
      for (let i = 0; i < 20; i += 1) {
         expect((await login('203.0.113.10')).status).toBe(400);
      }
      expect((await login('203.0.113.10')).status).toBe(429);

      expect((await login('198.51.100.20')).status).toBe(400);
   });
});
