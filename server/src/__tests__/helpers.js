import http from 'node:http';
import { jest } from '@jest/globals';

process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.DATABASE_URL ??= 'postgres://localhost:5432/test_db';
process.env.NODE_ENV = 'test';
process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';

export const mockQueryQueue = [];
export const mockSendEmail = jest.fn().mockResolvedValue({ id: 'email-test' });
export const mockMutationLog = [];
export const mockResendConfig = { configured: false };

jest.unstable_mockModule(
   '../services/email.service.js',
   () => ({
      sendEmail: mockSendEmail,
      isResendConfigured: () => mockResendConfig.configured,
      isEmailDeliveryEnabled: () => true,
   }),
   { virtual: true },
);

jest.unstable_mockModule('../db/index.js', () => {
   const take = () => mockQueryQueue.shift() ?? [];

   const make = (value) => {
      const node = {
         from: () => make(value),
         where: () => make(value),
         limit: () => make(value),
         orderBy: () => make(value),
         innerJoin: () => make(value),
         leftJoin: () => make(value),
         values: (values) => {
            mockMutationLog.push({ values });
            return make(value);
         },
         returning: () => make(value),
         onConflictDoNothing: () => make(value),
         set: (set) => {
            mockMutationLog.push({ set });
            return make(value);
         },
      };

      node.then = (onFulfilled, onRejected) =>
         (value instanceof Error
            ? Promise.reject(value)
            : Promise.resolve(value)
         ).then(onFulfilled, onRejected);
      node.catch = (onRejected) => node.then(undefined, onRejected);
      node.finally = (onFinally) =>
         node.then(
            (result) => {
               onFinally();
               return result;
            },
            (error) => {
               onFinally();
               throw error;
            },
         );

      return node;
   };

   const tx = {
      select: () => make(take()),
      insert: () => make(take()),
      update: () => make(take()),
      delete: () => make(take()),
   };

   return {
      db: {
         select: () => make(take()),
         insert: () => make(take()),
         update: () => make(take()),
         delete: () => make(take()),
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
   mockQueryQueue.length = 0;
   mockMutationLog.length = 0;
   mockResendConfig.configured = false;
   mockSendEmail.mockReset().mockResolvedValue({ id: 'email-test' });
};

export const postJson = (baseUrl, path, body, headers = {}) =>
   fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
   });
