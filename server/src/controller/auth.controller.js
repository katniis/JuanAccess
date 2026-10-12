import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { patients } from '../db/schema/patients.js';
import { providers } from '../db/schema/providers.js';
import { users } from '../db/schema/users.js';
import { userInvitations } from '../db/schema/userInvitations.js';
import { patientCoverage } from '../db/schema/patientCoverage.js';
import { findOrCreateInsurancePlan } from '../services/insurance.service.js';

const cookieOptions = {
   httpOnly: true,
   secure: process.env.NODE_ENV === 'production',
   sameSite: 'strict',
   maxAge: 30 * 24 * 60 * 60 * 1000,
};

const generateToken = (id) => {
   if (!process.env.JWT_SECRET) {
      throw new Error(
         'JWT_SECRET is required to create authentication tokens.',
      );
   }

   return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
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
         let providerId = null;
         if (invite.role === 'staff') {
            const [provider] = await tx
               .insert(providers)
               .values({
                  firstName: invite.firstName,
                  lastName: invite.lastName,
                  specialty: invite.specialty,
                  npiNumber: invite.npiNumber,
               })
               .returning({ id: providers.id });
            providerId = provider.id;
         }
         const [user] = await tx
            .insert(users)
            .values({
               email: invite.email,
               passwordHash,
               role: invite.role,
               providerId,
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
      const { email, password } = req.body ?? {};
      if (!email || !password) {
         return res
            .status(400)
            .json({ message: 'Email and password are required.' });
      }

      const user = await findUserByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
         return res.status(401).json({ message: 'Invalid credentials.' });
      }

      res.cookie('token', generateToken(user.id), cookieOptions);
      return res.json({ user: safeUser(user) });
   } catch (error) {
      console.error('Login failed:', error);
      return res.status(500).json({ message: 'Internal server error.' });
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
