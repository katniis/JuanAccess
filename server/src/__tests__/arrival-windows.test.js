import jwt from 'jsonwebtoken';
import {
   mockMutationLog,
   mockQueryQueue,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;
const admin = {
   id: 29,
   email: 'admin@example.test',
   role: 'staff_admin',
   patientId: null,
   providerId: null,
};
const staff = { ...admin, id: 30, role: 'staff' };
const patient = { ...admin, id: 31, role: 'patient', patientId: 4 };
const cookieFor = (user) => `token=${jwt.sign({ id: user.id }, secret)}`;

const morning = {
   id: 1,
   name: 'Early morning',
   startTime: '07:00:00',
   endTime: '10:00:00',
   isActive: true,
};

describe('Arrival Windows', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   const send = (user, method, path, body) =>
      fetch(`${ctx.baseUrl}/staff/admin/arrival-windows${path}`, {
         method,
         headers: {
            cookie: cookieFor(user),
            'content-type': 'application/json',
         },
         body: body && JSON.stringify(body),
      });

   it('lets a staff_admin create an Arrival Window', async () => {
      mockQueryQueue.push([admin], [], [morning]);
      const res = await send(admin, 'POST', '', {
         name: 'Early morning',
         startTime: '07:00',
         endTime: '10:00',
      });

      expect(res.status).toBe(201);
      expect(await readJson(res)).toEqual(morning);
      expect(mockMutationLog[0].values).toEqual({
         name: 'Early morning',
         startTime: '07:00',
         endTime: '10:00',
      });
   });

   it('lists Arrival Windows for a staff_admin', async () => {
      mockQueryQueue.push([admin], [morning]);
      const res = await send(admin, 'GET', '');

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ arrivalWindows: [morning] });
   });

   it('allows a window that starts when another ends', async () => {
      mockQueryQueue.push([admin], [morning], [{ ...morning, id: 2 }]);
      const res = await send(admin, 'POST', '', {
         name: 'Late morning',
         startTime: '10:00',
         endTime: '12:00',
      });

      expect(res.status).toBe(201);
   });

   it('rejects a window that overlaps an active window', async () => {
      mockQueryQueue.push([admin], [morning]);
      const res = await send(admin, 'POST', '', {
         name: 'Mid morning',
         startTime: '09:00',
         endTime: '11:00',
      });

      expect(res.status).toBe(409);
      expect((await readJson(res)).error).toMatch(/Early morning/);
      expect(mockMutationLog).toHaveLength(0);
   });

   it.each([
      ['end before start', { name: 'X', startTime: '10:00', endTime: '07:00' }],
      [
         'end equal to start',
         { name: 'X', startTime: '07:00', endTime: '07:00' },
      ],
      ['a malformed time', { name: 'X', startTime: '7am', endTime: '10:00' }],
      ['a blank name', { name: ' ', startTime: '07:00', endTime: '10:00' }],
   ])('rejects %s', async (_label, body) => {
      mockQueryQueue.push([admin]);
      const res = await send(admin, 'POST', '', body);

      expect(res.status).toBe(400);
      expect(mockMutationLog).toHaveLength(0);
   });

   it('checks a partial update against the stored window and others', async () => {
      // Moving the start earlier than 10:00 would collide with the morning window.
      mockQueryQueue.push(
         [admin],
         [{ ...morning, id: 2, startTime: '10:00:00', endTime: '12:00:00' }],
         [morning],
      );
      const res = await send(admin, 'PATCH', '/2', { startTime: '09:30' });

      expect(res.status).toBe(409);
      expect(mockMutationLog).toHaveLength(0);
   });

   it('skips the overlap check when deactivating a window', async () => {
      mockQueryQueue.push(
         [admin],
         [morning],
         [{ ...morning, isActive: false }],
      );
      const res = await send(admin, 'PATCH', '/1', { isActive: false });

      expect(res.status).toBe(200);
      expect(mockMutationLog[0].set).toEqual({ isActive: false });
   });

   it('returns 404 when updating a missing window', async () => {
      mockQueryQueue.push([admin], []);
      const res = await send(admin, 'PATCH', '/9', { name: 'Gone' });

      expect(res.status).toBe(404);
   });

   it('deletes an Arrival Window', async () => {
      mockQueryQueue.push([admin], [morning]);
      const res = await send(admin, 'DELETE', '/1');

      expect(res.status).toBe(200);
   });

   it.each([
      ['staff', staff],
      ['patient', patient],
   ])('returns 403 when %s manages Arrival Windows', async (_label, user) => {
      for (const [method, path] of [
         ['GET', ''],
         ['POST', ''],
         ['PATCH', '/1'],
         ['DELETE', '/1'],
      ]) {
         mockQueryQueue.push([user]);
         const res = await send(
            user,
            method,
            path,
            method === 'GET'
               ? undefined
               : { name: 'X', startTime: '07:00', endTime: '10:00' },
         );
         expect(res.status).toBe(403);
      }
      expect(mockMutationLog).toHaveLength(0);
   });
});
