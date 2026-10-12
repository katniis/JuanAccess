import jwt from 'jsonwebtoken';
import {
   mockQueryQueue,
   postJson,
   readJson,
   resetMocks,
   startServer,
} from './helpers.js';

const secret = process.env.JWT_SECRET;
const patientUser = {
   id: 2,
   email: 'patient@example.test',
   role: 'patient',
   patientId: 10,
   providerId: null,
   displayName: 'Test Patient',
};
const staffUser = {
   id: 3,
   email: 'staff@example.test',
   role: 'staff',
   patientId: null,
   providerId: 4,
   displayName: 'Test Staff',
};
const authHeader = (user) => ({
   cookie: `token=${jwt.sign({ id: user.id }, secret)}`,
});

describe('billing and performed-procedure routes', () => {
   let ctx;
   beforeAll(async () => {
      ctx = await startServer();
   });
   afterAll(async () => {
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('returns only the authenticated patient bills', async () => {
      const bill = { id: 7, patientId: 10, status: 'processed' };
      const lines = [{ id: 1, billId: 7, amount: '500.00' }];
      mockQueryQueue.push([patientUser], [bill], [bill], lines, []);
      const res = await fetch(`${ctx.baseUrl}/bills/mine`, {
         headers: authHeader(patientUser),
      });
      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual([
         { ...bill, lineItems: lines, disputeLetter: null },
      ]);
   });

   it('lets staff record a performed procedure for an existing appointment', async () => {
      const procedure = { id: 4, appointmentId: 12, procedureCode: '93000' };
      mockQueryQueue.push([staffUser], [{ id: 12 }], [procedure]);
      const res = await postJson(
         ctx.baseUrl,
         '/staff/appointments/12/procedures',
         { procedure_code: '93000', description: 'Resting ECG' },
         authHeader(staffUser),
      );
      expect(res.status).toBe(201);
      expect(await readJson(res)).toEqual(procedure);
   });

   it('rejects bill creation from staff accounts', async () => {
      mockQueryQueue.push([staffUser]);
      const res = await postJson(
         ctx.baseUrl,
         '/bills',
         { uploaded_file_url: '/uploads/bill.pdf', line_items: [] },
         authHeader(staffUser),
      );
      expect(res.status).toBe(403);
   });

   it('requires a file for bill uploads', async () => {
      mockQueryQueue.push([patientUser]);
      const res = await fetch(`${ctx.baseUrl}/bills/upload`, {
         method: 'POST',
         headers: authHeader(patientUser),
      });
      expect(res.status).toBe(400);
      expect(await readJson(res)).toEqual({ error: 'A bill file is required' });
   });

   it('rejects another patient storage path during reviewed bill creation', async () => {
      mockQueryQueue.push([patientUser]);
      const res = await postJson(
         ctx.baseUrl,
         '/bills',
         {
            uploaded_file_url: 'patients/99/bills/other.pdf',
            line_items: [],
         },
         authHeader(patientUser),
      );
      expect(res.status).toBe(403);
   });
});
