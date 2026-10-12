import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const BILL_MAX_BYTES = 10 * 1024 * 1024;
export const BILL_MIME_TYPES = new Set([
   'application/pdf',
   'image/png',
   'image/jpeg',
   'image/jpg',
   'image/webp',
   'image/heic',
   'image/heif',
]);

const signedUrlSeconds = 5 * 60;

function getConfig() {
   const url = process.env.SUPABASE_URL?.trim();
   const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
   if (!url || !key) return null;
   return {
      url,
      key,
      bucket: process.env.SUPABASE_BILL_BUCKET?.trim() || 'patient-bills',
   };
}

function getClient(config) {
   return createClient(config.url, config.key, {
      auth: { autoRefreshToken: false, persistSession: false },
   });
}

export function isSupportedBillMimeType(mimeType) {
   return BILL_MIME_TYPES.has(String(mimeType || '').toLowerCase());
}

export function billStoragePath(patientId, fileName) {
   const extension = String(fileName || '')
      .split('.')
      .pop()
      ?.toLowerCase();
   const safeExtension =
      extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : 'bin';
   return `patients/${patientId}/bills/${crypto.randomUUID()}.${safeExtension}`;
}

export function isPatientBillPath(path, patientId) {
   return (
      typeof path === 'string' &&
      path.startsWith(`patients/${patientId}/bills/`) &&
      !path.includes('..')
   );
}

export class BillStorageNotConfiguredError extends Error {
   constructor() {
      super('Bill storage is not configured');
      this.name = 'BillStorageNotConfiguredError';
   }
}

export async function uploadBillFile({ patientId, file }) {
   if (!isSupportedBillMimeType(file.mimetype)) {
      throw new Error('Unsupported bill file type');
   }
   if (!file.buffer?.length || file.size > BILL_MAX_BYTES) {
      throw new Error('Bill file is empty or too large');
   }

   const config = getConfig();
   if (!config) throw new BillStorageNotConfiguredError();

   const path = billStoragePath(patientId, file.originalname);
   const { error } = await getClient(config)
      .storage.from(config.bucket)
      .upload(path, file.buffer, {
         cacheControl: '3600',
         contentType: file.mimetype,
         upsert: false,
      });
   if (error) throw new Error('Bill file storage upload failed');
   return { path, bucket: config.bucket };
}

export async function createBillSignedUrl(path, patientId) {
   if (!isPatientBillPath(path, patientId)) return null;
   const config = getConfig();
   if (!config) return null;
   const { data, error } = await getClient(config)
      .storage.from(config.bucket)
      .createSignedUrl(path, signedUrlSeconds);
   if (error) return null;
   return data?.signedUrl || null;
}
