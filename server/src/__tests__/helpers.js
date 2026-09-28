import http from 'node:http';
import { jest } from '@jest/globals';

process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.DATABASE_URL ??= 'postgres://localhost:5432/test_db';
process.env.NODE_ENV = 'test';

export const mockSelectQueue = [];
export const mockTxReturnQueue = [];

jest.unstable_mockModule('../db/index.js', () => {
   const selectQuery = () => ({
      from: () => ({
         where: () => ({
            limit: async () => mockSelectQueue.shift() ?? [],
         }),
      }),
   });

   const tx = {
      insert: () => ({
         values: () => ({
            returning: async () => mockTxReturnQueue.shift() ?? [{}],
         }),
      }),
   };

   return {
      db: {
         select: selectQuery,
         transaction: async (fn) => fn(tx),
      },
   };
});

export const { default: app } = await import('../app.js');

export const startServer = () =>
   new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
         const { port } = server.address();
         resolve({
            server,
            baseUrl: `http://127.0.0.1:${port}`,
            close: () => new Promise((done) => server.close(done)),
         });
      });
   });

export const readJson = async (res) => {
   const text = await res.text();
   return text ? JSON.parse(text) : null;
};

export const getCookie = (res, name) => {
   const cookies = res.headers.getSetCookie?.() ?? [];
   for (const cookie of cookies) {
      const [pair] = cookie.split(';');
      const [key, ...rest] = pair.split('=');
      if (key.trim() === name) {
         return rest.join('=').trim();
      }
   }
   return null;
};

export const resetMocks = () => {
   mockSelectQueue.length = 0;
   mockTxReturnQueue.length = 0;
};

export const postJson = (baseUrl, path, body, headers = {}) =>
   fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
   });
