import crypto from 'node:crypto';
import { Secret, TOTP } from 'otpauth';
import { and, eq, isNull } from 'drizzle-orm';
import { enrolmentCodes } from '../db/schema/enrolmentCodes.js';

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

// Returns the time step the code belongs to, or null when the code is invalid.
export const totpStep = (secret, code) => {
   if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null;
   const timestamp = Date.now();
   const generator = totp(secret);
   const delta = generator.validate({ token: code, timestamp, window: 1 });
   return delta === null ? null : generator.counter({ timestamp }) + delta;
};

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

// Same keyed hash as Recovery Codes, domain-separated so the two can never match.
export const hashEnrolmentCode = (code) =>
   crypto
      .createHmac('sha256', encryptionKey())
      .update(`enrolment:${normalizeRecoveryCode(code)}`)
      .digest('hex');

const enrolmentCodeMs = () =>
   (Number(process.env.ENROLMENT_CODE_HOURS) || 24) * 60 * 60 * 1000;

// Replaces any unused Enrolment Code for the user; returns the plaintext once.
export async function issueEnrolmentCode(executor, userId, issuedByUserId) {
   const code = crypto
      .randomBytes(8)
      .toString('hex')
      .replace(/(.{4})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4');
   const expiresAt = new Date(Date.now() + enrolmentCodeMs());
   await executor
      .delete(enrolmentCodes)
      .where(
         and(eq(enrolmentCodes.userId, userId), isNull(enrolmentCodes.usedAt)),
      );
   await executor.insert(enrolmentCodes).values({
      userId,
      codeHash: hashEnrolmentCode(code),
      expiresAt,
      issuedByUserId,
   });
   return { enrolmentCode: code, expiresAt };
}
