import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

const mockUpload = jest.fn().mockResolvedValue({ error: null });
jest.unstable_mockModule('@supabase/supabase-js', () => ({
   createClient: () => ({
      storage: {
         from: (bucket) => ({
            upload: (path, ...rest) => mockUpload(bucket, path, ...rest),
            getPublicUrl: (path) => ({
               data: {
                  publicUrl: `https://storage.example.test/${bucket}/${path}`,
               },
            }),
         }),
      },
   }),
}));

const { mockMutationLog, mockQueryQueue, resetMocks, startServer } =
   await import('./helpers.js');

const admin = { id: 29, email: 'admin@example.test', role: 'staff_admin' };

describe('Practitioner photo with Supabase Storage configured', () => {
   let ctx;
   beforeAll(async () => {
      process.env.SUPABASE_URL = 'https://storage.example.test';
      process.env.SUPABASE_SECRET_KEY = 'synthetic-test-key';
      ctx = await startServer();
   });
   afterAll(async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;
      await ctx.close();
   });
   beforeEach(resetMocks);

   it('uploads to the practitioner-photos bucket and stores its public URL', async () => {
      mockQueryQueue.push([admin], [{ id: 5 }]);
      const form = new FormData();
      form.append(
         'file',
         new Blob([Buffer.from([1, 2, 3])], { type: 'image/jpeg' }),
         'photo.jpg',
      );
      const res = await fetch(
         `${ctx.baseUrl}/staff/admin/practitioners/5/photo`,
         {
            method: 'POST',
            headers: {
               cookie: `token=${jwt.sign({ id: admin.id }, process.env.JWT_SECRET)}`,
            },
            body: form,
         },
      );

      expect(res.status).toBe(200);
      expect(mockUpload).toHaveBeenCalledWith(
         'practitioner-photos',
         expect.stringMatching(/^practitioners\/5\/[0-9a-f-]+\.jpg$/),
         expect.any(Buffer),
         expect.objectContaining({ contentType: 'image/jpeg' }),
      );
      expect(mockMutationLog[0].set.photoUrl).toMatch(
         /^https:\/\/storage\.example\.test\/practitioner-photos\/practitioners\/5\//,
      );
   });
});
