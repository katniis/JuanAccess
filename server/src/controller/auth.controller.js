import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { patients } from '../db/schema/patients.js';
import { providers } from '../db/schema/providers.js';
import { users } from '../db/schema/users.js';

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
      .where(eq(users.email, email))
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
      } = req.body ?? {};

      if (!email || !password || !firstName || !lastName || !dateOfBirth) {
         return res.status(400).json({ message: 'Missing required fields.' });
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
