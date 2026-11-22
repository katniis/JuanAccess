import crypto from 'node:crypto';
import { Secret, TOTP } from 'otpauth';

function encryptionKey() {
   const raw = process.env.TOTP_ENCRYPTION_KEY;
   if (!raw) throw new Error('TOTP_ENCRYPTION_KEY is not configured.');
   return crypto.createHash('sha256').update(raw).digest();
}

// AES-256-GCM, stored as base64 "iv.tag.ciphertext".
export function encryptSecret(secret) {
   const iv = crypto.randomBytes(12);
   const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
   const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
   return [iv, cipher.getAuthTag(), data]
      .map((part) => part.toString('base64'))
      .join('.');
}

export function decryptSecret(stored) {
   const [iv, tag, data] = stored
      .split('.')
      .map((part) => Buffer.from(part, 'base64'));
   const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
   decipher.setAuthTag(tag);
   return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
   );
}

const totp = (secret, label = 'staff') =>
   new TOTP({
      issuer: 'JuanAccess',
      label,
      secret: Secret.fromBase32(secret),
   });

export const newTotpSecret = () => new Secret({ size: 20 }).base32;

export const totpUri = (secret, email) => totp(secret, email).toString();

export const isValidTotp = (secret, code) =>
   typeof code === 'string' &&
   /^\d{6}$/.test(code) &&
   totp(secret).validate({ token: code, window: 1 }) !== null;

const normalizeRecoveryCode = (code) =>
   String(code)
      .toLowerCase()
      .replace(/[^a-f0-9]/g, '');

// Keyed hash so a leaked table can't be brute-forced offline without the env key.
export const hashRecoveryCode = (code) =>
   crypto
      .createHmac('sha256', encryptionKey())
      .update(normalizeRecoveryCode(code))
      .digest('hex');

export const newRecoveryCodes = (count = 10) =>
   Array.from({ length: count }, () =>
      crypto
         .randomBytes(6)
         .toString('hex')
         .replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3'),
   );
