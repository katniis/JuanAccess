import crypto from 'node:crypto';
import { getClient, getConfig } from './bill-storage.service.js';

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = {
   'image/png': 'png',
   'image/jpeg': 'jpg',
   'image/webp': 'webp',
};

export const isSupportedPhotoType = (mimeType) =>
   Boolean(PHOTO_TYPES[String(mimeType || '').toLowerCase()]);

// Returns the URL to store as the Practitioner's photo. Without Supabase
// Storage the image is kept inline as a data URL (capped at PHOTO_MAX_BYTES).
export async function storePractitionerPhoto({ practitionerId, file }) {
   const mimeType = file.mimetype.toLowerCase();
   const config = getConfig();
   if (!config) {
      return `data:${mimeType};base64,${file.buffer.toString('base64')}`;
   }
   const bucket =
      process.env.SUPABASE_PRACTITIONER_PHOTO_BUCKET?.trim() ||
      'practitioner-photos';
   const path = `practitioners/${practitionerId}/${crypto.randomUUID()}.${PHOTO_TYPES[mimeType]}`;
   const storage = getClient(config).storage.from(bucket);
   const { error } = await storage.upload(path, file.buffer, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: false,
   });
   if (error) throw new Error('Practitioner photo upload failed');
   // The bucket must be public: photos appear on the public Doctor Directory.
   return storage.getPublicUrl(path).data.publicUrl;
}
