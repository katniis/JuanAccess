import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { patients } from '../db/schema/patients.js';
import { providers } from '../db/schema/providers.js';
import { users } from '../db/schema/users.js';
import { userInvitations } from '../db/schema/userInvitations.js';
import { patientCoverage } from '../db/schema/patientCoverage.js';
import { accountActionTokens } from '../db/schema/accountActionTokens.js';
import { notifications } from '../db/schema/notifications.js';
import { findOrCreateInsurancePlan } from '../services/insurance.service.js';
import {
   isEmailDeliveryEnabled,
   sendEmail,
} from '../services/email.service.js';

const cookieOptions = {
   httpOnly: true,
   secure: process.env.NODE_ENV === 'production',
   sameSite: 'strict',
};

const persistentCookieOptions = {
   ...cookieOptions,
   maxAge: 30 * 24 * 60 * 60 * 1000,
};

const generateToken = (id, authVersion = 0, rememberMe = false) => {
   if (!process.env.JWT_SECRET) {
      throw new Error(
         'JWT_SECRET is required to create authentication tokens.',
      );
   }

   return jwt.sign({ id, authVersion, rememberMe }, process.env.JWT_SECRET, {
      expiresIn: '30d',
   });
};

const passwordRounds = 10;

const findUserByEmail = async (email) => {
   const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isActive, true)))
      .limit(1);

   return user;
};

const safeUser = (user) => ({
   id: user.id,
   email: user.email,
   role: user.role,
   patientId: user.patientId,
   providerId: user.providerId,
   displayName: user.displayName,
});

export const patientRegister = async (req, res) => {
   try {
      const {
         email,
         password,
         first_name: firstName,
         last_name: lastName,
         date_of_birth: dateOfBirth,
         gender,
         contact_phone: contactPhone,
         address,
         insurer_name: insurerName,
         plan_name: planName,
         policy_number: policyNumber,
         member_id: memberId,
         coverage_start: coverageStart,
         coverage_end: coverageEnd,
      } = req.body ?? {};

      if (!email || !password || !firstName || !lastName || !dateOfBirth) {
         return res.status(400).json({ message: 'Missing required fields.' });
      }
      if (!isValidDate(dateOfBirth)) {
         return res.status(400).json({ message: 'Invalid date of birth.' });
      }

      const hasInsurance = [
         insurerName,
         planName,
         policyNumber,
         memberId,
         coverageStart,
         coverageEnd,
      ].some(Boolean);
      if (
         hasInsurance &&
         (!validText(insurerName, 150) ||
            !validText(planName, 150) ||
            !validText(policyNumber, 100) ||
            (memberId && !validText(memberId, 100)) ||
            (coverageStart && !isValidDate(coverageStart)) ||
            (coverageEnd && !isValidDate(coverageEnd)) ||
            (coverageStart && coverageEnd && coverageStart > coverageEnd))
      ) {
         return res
            .status(400)
            .json({ message: 'Invalid insurance information.' });
      }

      if (await findUserByEmail(email)) {
         return res
            .status(409)
            .json({ message: 'Email is already registered.' });
      }

      const passwordHash = await bcrypt.hash(password, passwordRounds);
      const result = await db.transaction(async (tx) => {
         const [patient] = await tx
            .insert(patients)
            .values({
               firstName,
               lastName,
               dateOfBirth,
               gender,
               contactEmail: email,
               contactPhone,
               address,
            })
            .returning({ id: patients.id });

         if (hasInsurance) {
            const insurancePlanId = await findOrCreateInsurancePlan(
               tx,
               insurerName.trim(),
               planName.trim(),
            );
            await tx.insert(patientCoverage).values({
               patientId: patient.id,
               insurancePlanId,
               policyNumber: policyNumber.trim(),
               memberId: memberId?.trim() || null,
               coverageStart: coverageStart || null,
               coverageEnd: coverageEnd || null,
            });
         }

         const [user] = await tx
            .insert(users)
            .values({
               email,
               passwordHash,
               role: 'patient',
               patientId: patient.id,
               displayName: `${firstName} ${lastName}`,
            })
            .returning({
               id: users.id,
               email: users.email,
               role: users.role,
               patientId: users.patientId,
               providerId: users.providerId,
               displayName: users.displayName,
            });

         return { patient, user };
      });

      res.cookie('token', generateToken(result.user.id), cookieOptions);
      return res.status(201).json({
         message: 'User and patient registered successfully.',
         user: result.user,
         patient: result.patient,
      });
   } catch (error) {
      console.error('Patient registration failed:', error);
      return res.status(500).json({ message: 'Internal server error.' });
   }
};

function validText(value, maxLength) {
   return (
      typeof value === 'string' &&
      value.trim().length > 0 &&
      value.trim().length <= maxLength
   );
}

function isValidDate(value) {
   if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
   const date = new Date(`${value}T00:00:00.000Z`);
   return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
   );
}

export const providerRegister = async (req, res) => {
   try {
      const {
         email,
         password,
         first_name: firstName,
         last_name: lastName,
         specialty,
         npi_number: npiNumber,
      } = req.body ?? {};

      if (!email || !password || !firstName || !lastName) {
         return res.status(400).json({ message: 'Missing required fields.' });
      }

      if (await findUserByEmail(email)) {
         return res
            .status(409)
            .json({ message: 'Email is already registered.' });
      }

      const passwordHash = await bcrypt.hash(password, passwordRounds);
      const result = await db.transaction(async (tx) => {
         const [provider] = await tx
            .insert(providers)
            .values({ firstName, lastName, specialty, npiNumber })
            .returning({ id: providers.id });

         const [user] = await tx
            .insert(users)
            .values({
               email,
               passwordHash,
               role: 'staff',
               providerId: provider.id,
               displayName: `${firstName} ${lastName}`,
            })
            .returning({
               id: users.id,
               email: users.email,
               role: users.role,
               patientId: users.patientId,
               providerId: users.providerId,
               displayName: users.displayName,
            });

         return { provider, user };
      });

      res.cookie('token', generateToken(result.user.id), cookieOptions);
      return res.status(201).json({
         message: 'User and provider registered successfully.',
         user: result.user,
         provider: result.provider,
      });
   } catch (error) {
      console.error('Provider registration failed:', error);
      return res.status(500).json({ message: 'Internal server error.' });
   }
};

export const acceptStaffInvitation = async (req, res) => {
   const token =
      typeof req.body?.token === 'string' ? req.body.token.trim() : '';
   const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
   if (!token || password.length < 8) {
      return res
         .status(400)
         .json({ message: 'A valid token and password are required.' });
   }
   const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
   try {
      const result = await db.transaction(async (tx) => {
         const [invite] = await tx
            .select()
            .from(userInvitations)
            .where(
               and(
                  eq(userInvitations.tokenHash, tokenHash),
                  isNull(userInvitations.acceptedAt),
                  gt(userInvitations.expiresAt, new Date()),
               ),
            )
            .limit(1);
         if (!invite) return null;
         const existing = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, invite.email))
            .limit(1);
         if (existing.length) return { conflict: true };
         const passwordHash = await bcrypt.hash(password, passwordRounds);
         const [user] = await tx
            .insert(users)
            .values({
               email: invite.email,
               passwordHash,
               role: invite.role,
               providerId: null,
               displayName: `${invite.firstName} ${invite.lastName}`,
            })
            .returning();
         await tx
            .update(userInvitations)
            .set({ acceptedAt: new Date() })
            .where(eq(userInvitations.id, invite.id));
         return { user };
      });
      if (!result)
         return res
            .status(400)
            .json({ message: 'Invitation is invalid or expired.' });
      if (result.conflict)
         return res
            .status(409)
            .json({ message: 'Email is already registered.' });
      res.cookie('token', generateToken(result.user.id), cookieOptions);
      return res.status(201).json({ user: safeUser(result.user) });
   } catch (error) {
      console.error('Invitation acceptance failed:', error);
      return res.status(500).json({ message: 'Internal server error.' });
   }
};

export const login = async (req, res) => {
   try {
      const { email, password, rememberMe = false } = req.body ?? {};
      if (!email || !password) {
         return res
            .status(400)
            .json({ message: 'Email and password are required.' });
      }

      const user = await findUserByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
         return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const shouldRemember = rememberMe === true;
      res.cookie(
         'token',
         generateToken(user.id, user.authVersion ?? 0, shouldRemember),
         shouldRemember ? persistentCookieOptions : cookieOptions,
      );
      return res.json({ user: safeUser(user) });
   } catch (error) {
      console.error('Login failed:', error);
      return res.status(500).json({ message: 'Internal server error.' });
   }
};

const settingsColumns = {
   email: users.email,
   role: users.role,
   displayName: users.displayName,
   emailNotificationsEnabled: users.emailNotificationsEnabled,
   firstName: patients.firstName,
   lastName: patients.lastName,
   dateOfBirth: patients.dateOfBirth,
   gender: patients.gender,
   contactPhone: patients.contactPhone,
   address: patients.address,
};

async function loadSettings(userId) {
   const [row] = await db
      .select(settingsColumns)
      .from(users)
      .leftJoin(patients, eq(patients.id, users.patientId))
      .where(eq(users.id, userId))
      .limit(1);
   if (!row) return null;
   const {
      id: _id,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactPhone,
      address,
      ...account
   } = row;
   return {
      ...account,
      emailNotificationsEnabled: account.emailNotificationsEnabled !== false,
      profile:
         account.role === 'patient'
            ? {
                 firstName,
                 lastName,
                 dateOfBirth,
                 gender,
                 contactPhone,
                 address,
              }
            : null,
   };
}

export const getSettings = async (req, res) => {
   try {
      const settings = await loadSettings(req.user.id);
      return settings
         ? res.json({ settings })
         : res.status(404).json({ error: 'Account not found.' });
   } catch (error) {
      console.error('Failed to load account settings:', error);
      return res
         .status(500)
         .json({ error: 'Account settings could not be loaded.' });
   }
};

export const patchSettings = async (req, res) => {
   const body = req.body ?? {};
   if (
      Object.hasOwn(body, 'emailNotificationsEnabled') &&
      !isEmailDeliveryEnabled()
   ) {
      return res
         .status(503)
         .json({ error: 'Email features are under maintenance.' });
   }
   if (Object.hasOwn(body, 'email'))
      return res
         .status(400)
         .json({ error: 'Use email confirmation to change your login email.' });
   if (
      Object.hasOwn(body, 'dateOfBirth') ||
      Object.hasOwn(body, 'date_of_birth')
   )
      return res
         .status(400)
         .json({ error: 'Date of birth cannot be changed here.' });

   const patientFields = [
      'firstName',
      'lastName',
      'gender',
      'contactPhone',
      'address',
   ];
   const staffFields = ['displayName'];
   const allowed = new Set([
      'emailNotificationsEnabled',
      ...(req.user.role === 'patient' ? patientFields : staffFields),
   ]);
   if (
      !Object.keys(body).length ||
      Object.keys(body).some((field) => !allowed.has(field)) ||
      (body.emailNotificationsEnabled !== undefined &&
         typeof body.emailNotificationsEnabled !== 'boolean')
   ) {
      return res
         .status(400)
         .json({ error: 'Settings contain invalid fields.' });
   }

   const patientValues = {};
   for (const field of patientFields) {
      if (body[field] === undefined) continue;
      const maxLength =
         field === 'firstName' || field === 'lastName'
            ? 100
            : field === 'gender'
              ? 20
              : field === 'contactPhone'
                ? 30
                : 1000;
      const value = body[field];
      if (typeof value !== 'string' || value.trim().length > maxLength) {
         return res.status(400).json({ error: 'Profile details are invalid.' });
      }
      if ((field === 'firstName' || field === 'lastName') && !value.trim()) {
         return res.status(400).json({ error: 'Name fields cannot be blank.' });
      }
      patientValues[field] = value.trim() || null;
   }
   if (
      body.displayName !== undefined &&
      (typeof body.displayName !== 'string' ||
         !body.displayName.trim() ||
         body.displayName.trim().length > 150)
   ) {
      return res.status(400).json({ error: 'Display name is invalid.' });
   }

   try {
      await db.transaction(async (tx) => {
         if (req.user.role === 'patient' && Object.keys(patientValues).length) {
            const [current] = await tx
               .select({
                  firstName: patients.firstName,
                  lastName: patients.lastName,
               })
               .from(patients)
               .where(eq(patients.id, req.user.patientId))
               .limit(1);
            if (!current) throw new Error('patient_profile_not_found');
            await tx
               .update(patients)
               .set(patientValues)
               .where(eq(patients.id, req.user.patientId));
            await tx
               .update(users)
               .set({
                  displayName: `${patientValues.firstName ?? current.firstName} ${patientValues.lastName ?? current.lastName}`,
               })
               .where(eq(users.id, req.user.id));
         }
         if (body.displayName !== undefined) {
            await tx
               .update(users)
               .set({ displayName: body.displayName.trim() })
               .where(eq(users.id, req.user.id));
         }
         if (body.emailNotificationsEnabled !== undefined) {
            await tx
               .update(users)
               .set({
                  emailNotificationsEnabled: body.emailNotificationsEnabled,
               })
               .where(eq(users.id, req.user.id));
            if (!body.emailNotificationsEnabled) {
               await tx
                  .update(notifications)
                  .set({
                     emailStatus: 'skipped',
                     emailNextAttemptAt: null,
                     emailLastError: null,
                  })
                  .where(
                     and(
                        eq(notifications.userId, req.user.id),
                        or(
                           eq(notifications.emailStatus, 'pending'),
                           eq(notifications.emailStatus, 'failed'),
                        ),
                     ),
                  );
            }
         }
      });
      const settings = await loadSettings(req.user.id);
      return res.json({ settings });
   } catch (error) {
      console.error('Failed to update account settings:', error);
      return res
         .status(500)
         .json({ error: 'Account settings could not be saved.' });
   }
};

export const changePassword = async (req, res) => {
   const currentPassword = req.body?.currentPassword;
   const newPassword = req.body?.newPassword;
   if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
   ) {
      return res.status(400).json({
         error: 'Enter your current password and a new password of at least 8 characters.',
      });
   }
   try {
      const [user] = await db
         .select({
            passwordHash: users.passwordHash,
            authVersion: users.authVersion,
         })
         .from(users)
         .where(eq(users.id, req.user.id))
         .limit(1);
      if (
         !user ||
         !(await bcrypt.compare(currentPassword, user.passwordHash))
      ) {
         return res
            .status(400)
            .json({ error: 'Current password is incorrect.' });
      }
      const passwordHash = await bcrypt.hash(newPassword, passwordRounds);
      const [updated] = await db
         .update(users)
         .set({ passwordHash, authVersion: sql`${users.authVersion} + 1` })
         .where(eq(users.id, req.user.id))
         .returning({ authVersion: users.authVersion });
      const authVersion = updated?.authVersion ?? (user.authVersion ?? 0) + 1;
      const rememberMe = req.auth?.rememberMe === true;
      res.cookie(
         'token',
         generateToken(req.user.id, authVersion, rememberMe),
         rememberMe ? persistentCookieOptions : cookieOptions,
      );
      return res.json({ message: 'Password changed successfully.' });
   } catch (error) {
      console.error('Failed to change password:', error);
      return res.status(500).json({ error: 'Password could not be changed.' });
   }
};

const requestLimits = new Map();
const publicActionMessage =
   'If an account matches that email, a reset link will be sent.';

function allowActionRequest(req, action, max = 5) {
   const now = Date.now();
   for (const [key, limit] of requestLimits) {
      if (limit.expiresAt <= now) requestLimits.delete(key);
   }
   const key = `${action}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
   const limit = requestLimits.get(key);
   if (!limit || limit.expiresAt <= now) {
      requestLimits.set(key, { count: 1, expiresAt: now + 15 * 60 * 1000 });
      return true;
   }
   if (limit.count >= max) return false;
   limit.count += 1;
   return true;
}

function actionUrl(path, token) {
   const origin = process.env.CLIENT_ORIGIN?.trim();
   if (!origin) throw new Error('CLIENT_ORIGIN is not configured');
   const url = new URL(path, origin);
   url.searchParams.set('token', token);
   return url.toString();
}

function hashActionToken(token) {
   return crypto.createHash('sha256').update(token).digest('hex');
}

export const forgotPassword = async (req, res) => {
   if (!allowActionRequest(req, 'forgot-password')) {
      return res
         .status(429)
         .json({ error: 'Too many requests. Try again later.' });
   }
   const email =
      typeof req.body?.email === 'string'
         ? req.body.email.trim().toLowerCase()
         : '';
   if (
      !email ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
   ) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
   }
   if (!isEmailDeliveryEnabled()) {
      return res.json({
         message:
            'Password recovery is under maintenance. Please try again later.',
      });
   }
   try {
      const user = await findUserByEmail(email);
      if (user) {
         const token = crypto.randomBytes(32).toString('hex');
         const [{ id } = {}] = await db.transaction(async (tx) => {
            await tx
               .update(accountActionTokens)
               .set({ consumedAt: new Date() })
               .where(
                  and(
                     eq(accountActionTokens.userId, user.id),
                     eq(accountActionTokens.purpose, 'password_reset'),
                     isNull(accountActionTokens.consumedAt),
                  ),
               );
            return tx
               .insert(accountActionTokens)
               .values({
                  userId: user.id,
                  purpose: 'password_reset',
                  tokenHash: hashActionToken(token),
                  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
               })
               .returning({ id: accountActionTokens.id });
         });
         void sendEmail({
            to: email,
            subject: 'Reset your JuanAccess password',
            text: `Use this link within 30 minutes to reset your password: ${actionUrl('/reset-password', token)}`,
            idempotencyKey: `account-action/${id}`,
         }).catch(() => console.error('Password reset email delivery failed.'));
      }
      return res.json({ message: publicActionMessage });
   } catch (error) {
      console.error('Password reset request could not be processed:', error);
      return res.json({ message: publicActionMessage });
   }
};

export const resetPassword = async (req, res) => {
   if (!isEmailDeliveryEnabled())
      return res
         .status(503)
         .json({ error: 'Email features are under maintenance.' });
   const token = typeof req.body?.token === 'string' ? req.body.token : '';
   const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
   if (token.length < 16 || token.length > 256 || password.length < 8) {
      return res
         .status(400)
         .json({ error: 'The reset link or password is invalid.' });
   }
   if (!allowActionRequest(req, 'reset-password', 10)) {
      return res
         .status(429)
         .json({ error: 'Too many requests. Try again later.' });
   }
   try {
      const passwordHash = await bcrypt.hash(password, passwordRounds);
      const userId = await db.transaction(async (tx) => {
         const [action] = await tx
            .select()
            .from(accountActionTokens)
            .where(
               and(
                  eq(accountActionTokens.tokenHash, hashActionToken(token)),
                  eq(accountActionTokens.purpose, 'password_reset'),
                  isNull(accountActionTokens.consumedAt),
                  gt(accountActionTokens.expiresAt, new Date()),
               ),
            )
            .limit(1);
         if (!action) return null;
         const [consumed] = await tx
            .update(accountActionTokens)
            .set({ consumedAt: new Date() })
            .where(
               and(
                  eq(accountActionTokens.id, action.id),
                  isNull(accountActionTokens.consumedAt),
                  gt(accountActionTokens.expiresAt, new Date()),
               ),
            )
            .returning({ id: accountActionTokens.id });
         if (!consumed) return null;
         const [user] = await tx
            .update(users)
            .set({ passwordHash, authVersion: sql`${users.authVersion} + 1` })
            .where(eq(users.id, action.userId))
            .returning({ id: users.id });
         return user?.id ?? null;
      });
      return userId
         ? res.json({ message: 'Password reset successfully. Please sign in.' })
         : res
              .status(400)
              .json({ error: 'The reset link is invalid or expired.' });
   } catch (error) {
      console.error('Password reset failed:', error);
      return res.status(500).json({ error: 'Password could not be reset.' });
   }
};

export const requestEmailChange = async (req, res) => {
   if (!isEmailDeliveryEnabled())
      return res
         .status(503)
         .json({ error: 'Email features are under maintenance.' });
   const email =
      typeof req.body?.newEmail === 'string'
         ? req.body.newEmail.trim().toLowerCase()
         : '';
   const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
   if (
      !email ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password
   ) {
      return res
         .status(400)
         .json({ error: 'Enter a valid new email and your current password.' });
   }
   try {
      const [user] = await db
         .select({ passwordHash: users.passwordHash, email: users.email })
         .from(users)
         .where(eq(users.id, req.user.id))
         .limit(1);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
         return res
            .status(400)
            .json({ error: 'Current password is incorrect.' });
      }
      if (email === user.email.toLowerCase()) {
         return res
            .status(400)
            .json({ error: 'Enter a different email address.' });
      }
      const [existing] = await db
         .select({ id: users.id })
         .from(users)
         .where(eq(users.email, email))
         .limit(1);
      if (existing)
         return res.status(409).json({ error: 'Email is already in use.' });

      const token = crypto.randomBytes(32).toString('hex');
      const [{ id } = {}] = await db.transaction(async (tx) => {
         await tx
            .update(accountActionTokens)
            .set({ consumedAt: new Date() })
            .where(
               and(
                  eq(accountActionTokens.userId, req.user.id),
                  eq(accountActionTokens.purpose, 'email_change'),
                  isNull(accountActionTokens.consumedAt),
               ),
            );
         return tx
            .insert(accountActionTokens)
            .values({
               userId: req.user.id,
               purpose: 'email_change',
               tokenHash: hashActionToken(token),
               pendingEmail: email,
               expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            })
            .returning({ id: accountActionTokens.id });
      });
      try {
         await sendEmail({
            to: email,
            subject: 'Confirm your JuanAccess email address',
            text: `Use this link within 30 minutes to confirm this email address: ${actionUrl('/confirm-email', token)}`,
            idempotencyKey: `account-action/${id}`,
         });
      } catch {
         return res.status(503).json({
            error: 'The confirmation email could not be sent. Please try again.',
         });
      }
      return res.json({
         message: 'Check your new inbox to confirm the email change.',
      });
   } catch (error) {
      console.error('Email change request failed:', error);
      return res
         .status(500)
         .json({ error: 'Email change could not be requested.' });
   }
};

export const confirmEmailChange = async (req, res) => {
   if (!isEmailDeliveryEnabled())
      return res
         .status(503)
         .json({ error: 'Email features are under maintenance.' });
   const token = typeof req.body?.token === 'string' ? req.body.token : '';
   if (token.length < 16 || token.length > 256) {
      return res
         .status(400)
         .json({ error: 'The confirmation link is invalid or expired.' });
   }
   try {
      const result = await db.transaction(async (tx) => {
         const [action] = await tx
            .select({
               id: accountActionTokens.id,
               userId: accountActionTokens.userId,
               pendingEmail: accountActionTokens.pendingEmail,
               expiresAt: accountActionTokens.expiresAt,
               consumedAt: accountActionTokens.consumedAt,
               currentEmail: users.email,
               patientId: users.patientId,
            })
            .from(accountActionTokens)
            .innerJoin(users, eq(users.id, accountActionTokens.userId))
            .where(
               and(
                  eq(accountActionTokens.tokenHash, hashActionToken(token)),
                  eq(accountActionTokens.purpose, 'email_change'),
                  isNull(accountActionTokens.consumedAt),
                  gt(accountActionTokens.expiresAt, new Date()),
               ),
            )
            .limit(1);
         if (!action) return null;
         const [consumed] = await tx
            .update(accountActionTokens)
            .set({ consumedAt: new Date() })
            .where(
               and(
                  eq(accountActionTokens.id, action.id),
                  isNull(accountActionTokens.consumedAt),
                  gt(accountActionTokens.expiresAt, new Date()),
               ),
            )
            .returning({ id: accountActionTokens.id });
         if (!consumed) return null;
         const [updated] = await tx
            .update(users)
            .set({ email: action.pendingEmail })
            .where(eq(users.id, action.userId))
            .returning({ id: users.id });
         if (!updated) return null;
         if (action.patientId) {
            await tx
               .update(patients)
               .set({ contactEmail: action.pendingEmail })
               .where(
                  and(
                     eq(patients.id, action.patientId),
                     eq(patients.contactEmail, action.currentEmail),
                  ),
               );
         }
         return {
            oldEmail: action.currentEmail,
            newEmail: action.pendingEmail,
            userId: action.userId,
            actionId: action.id,
         };
      });
      if (!result)
         return res
            .status(400)
            .json({ error: 'The confirmation link is invalid or expired.' });
      try {
         await sendEmail({
            to: result.oldEmail,
            subject: 'Your JuanAccess login email was changed',
            text: 'The login email for your JuanAccess account was changed. If you did not make this change, contact the clinic.',
            idempotencyKey: `email-change-confirmed/${result.actionId}`,
         });
      } catch {
         console.error('Email change security notice delivery failed.');
      }
      return res.json({ message: 'Email address confirmed successfully.' });
   } catch (error) {
      if (error?.code === '23505')
         return res.status(409).json({ error: 'Email is already in use.' });
      console.error('Email change confirmation failed:', error);
      return res
         .status(500)
         .json({ error: 'Email address could not be confirmed.' });
   }
};

export const logout = (req, res) => {
   res.clearCookie('token', {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
   });
   return res.json({ message: 'Logged out successfully.' });
};
