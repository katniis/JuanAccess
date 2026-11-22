import crypto from 'node:crypto';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { recordAudit } from '../services/audit.service.js';
import {
   isEmailDeliveryEnabled,
   sendEmail,
} from '../services/email.service.js';
import {
   arrivalWindows,
   dutyScheduleOverrides,
   equipment,
   feeSchedule,
   insurancePlans,
   providerAvailability,
   providers,
   recoveryCodes,
   rooms,
   userInvitations,
   users,
   visitTypes,
} from '../db/schema/index.js';
import { PROFESSIONS } from '../db/schema/providers.js';
import { isPesoAmount } from '../utils/money.js';
import {
   isSupportedPhotoType,
   storePractitionerPhoto,
} from '../services/practitioner-photo.service.js';

const clean = (value, max = 255) =>
   typeof value === 'string' && value.trim()
      ? value.trim().slice(0, max)
      : null;

const resources = {
   rooms: { table: rooms, fields: ['name', 'roomType'] },
   equipment: { table: equipment, fields: ['name', 'equipmentType', 'roomId'] },
   'visit-types': {
      table: visitTypes,
      fields: [
         'name',
         'description',
         'durationMinutes',
         'requiredSpecialty',
         'requiredEquipmentId',
      ],
   },
   'insurance-plans': {
      table: insurancePlans,
      fields: ['payerName', 'planName', 'planType', 'coveragePct'],
   },
   availability: {
      table: providerAvailability,
      fields: ['providerId', 'dayOfWeek', 'startTime', 'endTime'],
   },
   // Hours consistency is enforced by the table's check constraint (violations return 409).
   'duty-overrides': {
      table: dutyScheduleOverrides,
      fields: [
         'providerId',
         'overrideDate',
         'isDayOff',
         'startTime',
         'endTime',
      ],
   },
   'fee-schedule': {
      table: feeSchedule,
      fields: [
         'procedureCode',
         'description',
         'standardCost',
         'offeredDays',
         'capacityPerWindow',
         'allowedProfessions',
      ],
      // Procedure price in PHP, whole centavos only; offered days are distinct
      // 0 (Sunday) … 6 (Saturday); capacity per Arrival Window is a whole number ≥ 0;
      // allowed Professions are distinct known Professions.
      isValid: ({
         standardCost,
         offeredDays,
         capacityPerWindow,
         allowedProfessions,
      }) =>
         (standardCost === undefined || isPesoAmount(standardCost)) &&
         (allowedProfessions === undefined ||
            (Array.isArray(allowedProfessions) &&
               new Set(allowedProfessions).size === allowedProfessions.length &&
               allowedProfessions.every((p) => PROFESSIONS.includes(p)))) &&
         (offeredDays === undefined ||
            (Array.isArray(offeredDays) &&
               new Set(offeredDays).size === offeredDays.length &&
               offeredDays.every(
                  (day) => Number.isInteger(day) && day >= 0 && day <= 6,
               ))) &&
         (capacityPerWindow === undefined ||
            (Number.isInteger(capacityPerWindow) &&
               capacityPerWindow >= 0 &&
               capacityPerWindow <= 100000)),
   },
};

function resourceValues(resource, body) {
   const definition = resources[resource];
   if (!definition) return null;
   const values = {};
   for (const field of definition.fields) {
      if (body?.[field] !== undefined) values[field] = body[field];
   }
   if (definition.isValid && !definition.isValid(values)) return null;
   return values;
}

export async function createStaffInvitation(req, res) {
   const email = clean(req.body?.email)?.toLowerCase();
   const role = req.body?.role;
   const firstName = clean(req.body?.first_name, 100);
   const lastName = clean(req.body?.last_name, 100);
   if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !firstName ||
      !lastName ||
      !['staff', 'staff_admin'].includes(role)
   ) {
      return res.status(400).json({
         error: 'email, role, first_name, and last_name are required',
      });
   }
   try {
      const [existing] = await db
         .select({ id: users.id })
         .from(users)
         .where(eq(users.email, email))
         .limit(1);
      if (existing)
         return res.status(409).json({ error: 'Email is already registered' });
      const token = crypto.randomBytes(32).toString('hex');
      const [invitation] = await db
         .insert(userInvitations)
         .values({
            email,
            role,
            firstName,
            lastName,
            specialty: clean(req.body?.specialty, 100),
            npiNumber: clean(req.body?.npi_number, 20),
            tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            invitedBy: req.user.id,
         })
         .returning({
            id: userInvitations.id,
            email: userInvitations.email,
            expiresAt: userInvitations.expiresAt,
         });
      let emailSent = false;
      try {
         if (!isEmailDeliveryEnabled()) {
            return res.status(201).json({
               invitation,
               invitation_token: token,
               email_sent: false,
            });
         }
         const origin = process.env.CLIENT_ORIGIN?.trim();
         if (!origin) throw new Error('CLIENT_ORIGIN is not configured');
         const link = new URL('/accept-invite', origin);
         link.searchParams.set('token', token);
         await sendEmail({
            to: email,
            subject: 'Your JuanAccess staff invitation',
            text: `Hello ${firstName},\n\nAn administrator invited you to join JuanAccess. Accept the invitation within 48 hours: ${link.toString()}`,
            idempotencyKey: `staff-invitation/${invitation.id}`,
         });
         emailSent = true;
      } catch {
         console.error('Staff invitation email delivery failed.');
      }
      return res
         .status(201)
         .json({ invitation, invitation_token: token, email_sent: emailSent });
   } catch (error) {
      console.error('Failed to create staff invitation:', error);
      return res
         .status(500)
         .json({ error: 'Failed to create staff invitation' });
   }
}

export async function listAdminUsers(_req, res) {
   try {
      return res.json({
         users: await db
            .select({
               id: users.id,
               email: users.email,
               role: users.role,
               patientId: users.patientId,
               providerId: users.providerId,
               displayName: users.displayName,
               isActive: users.isActive,
               createdAt: users.createdAt,
            })
            .from(users)
            .orderBy(asc(users.id)),
      });
   } catch (error) {
      console.error('Failed to list users:', error);
      return res.status(500).json({ error: 'Failed to list users' });
   }
}

export async function updateAdminUser(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid user ID' });
   if (id === req.user.id && req.body?.is_active === false)
      return res
         .status(400)
         .json({ error: 'You cannot deactivate your own account' });
   const updates = {};
   if (req.body?.role !== undefined) {
      if (!['staff', 'staff_admin', 'patient'].includes(req.body.role))
         return res.status(400).json({ error: 'Invalid role' });
      updates.role = req.body.role;
   }
   if (req.body?.is_active !== undefined)
      updates.isActive = Boolean(req.body.is_active);
   if (!Object.keys(updates).length)
      return res.status(400).json({ error: 'No supported updates supplied' });
   try {
      const [updated] = await db
         .update(users)
         .set(updates)
         .where(eq(users.id, id))
         .returning({
            id: users.id,
            email: users.email,
            role: users.role,
            isActive: users.isActive,
         });
      if (updated)
         void recordAudit({
            entityType: 'user',
            entityId: id,
            action: 'admin_update',
            changedBy: req.user.id,
            newValue: updates,
         });
      return updated
         ? res.json(updated)
         : res.status(404).json({ error: 'User not found' });
   } catch (error) {
      console.error('Failed to update user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
   }
}

// Clears the target's Second Factor and bumps authVersion, signing them out everywhere;
// their next login is sent to Second Factor setup.
export async function resetUserSecondFactor(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid user ID' });
   try {
      const reset = await db.transaction(async (tx) => {
         const [row] = await tx
            .update(users)
            .set({
               totpSecretEncrypted: null,
               totpEnabledAt: null,
               failedLoginAttempts: 0,
               lockedUntil: null,
               authVersion: sql`${users.authVersion} + 1`,
            })
            .where(
               and(
                  eq(users.id, id),
                  inArray(users.role, ['staff', 'staff_admin']),
               ),
            )
            .returning({ id: users.id });
         if (!row) return false;
         await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, id));
         return true;
      });
      if (!reset)
         return res.status(404).json({ error: 'Staff user not found' });
      void recordAudit({
         entityType: 'user',
         entityId: id,
         action: 'second_factor_reset',
         changedBy: req.user.id,
      });
      return res.json({ id, secondFactor: 'setup_required' });
   } catch (error) {
      console.error('Failed to reset Second Factor:', error);
      return res.status(500).json({ error: 'Failed to reset Second Factor' });
   }
}

const practitionerText = [
   ['first_name', 'firstName', 100],
   ['last_name', 'lastName', 100],
   ['specialty', 'specialty', 100],
   ['npi_number', 'npiNumber', 20],
   ['education', 'education', 2000],
   ['board_certifications', 'boardCertifications', 2000],
   ['background', 'background', 4000],
];

// Returns { values } or { error } for a Practitioner create/update body.
function practitionerValues(body, { creating }) {
   const values = {};
   for (const [key, field, maxLength] of practitionerText) {
      if (body?.[key] !== undefined)
         values[field] = clean(body[key], maxLength);
   }
   if (creating && (!values.firstName || !values.lastName))
      return { error: 'first_name and last_name are required' };
   if (values.firstName === null || values.lastName === null)
      return { error: 'first_name and last_name cannot be blank' };
   if (body?.profession !== undefined || creating) {
      if (!PROFESSIONS.includes(body?.profession))
         return {
            error: `profession must be one of ${PROFESSIONS.join(', ')}`,
         };
      values.profession = body.profession;
   }
   if (body?.prc_license_number !== undefined) {
      const license = clean(String(body.prc_license_number ?? ''), 7);
      if (license !== null && !/^\d{7}$/.test(license))
         return { error: 'prc_license_number must be 7 digits' };
      values.prcLicenseNumber = license;
   }
   if (body?.practice_start_year !== undefined) {
      const year = body.practice_start_year;
      if (
         year !== null &&
         (!Number.isInteger(year) ||
            year < 1950 ||
            year > new Date().getFullYear())
      )
         return { error: 'practice_start_year must be a valid past year' };
      values.practiceStartYear = year;
   }
   if (body?.consultation_fee !== undefined) {
      const fee = body.consultation_fee;
      if (
         fee !== null &&
         (typeof fee !== 'number' ||
            !Number.isFinite(fee) ||
            fee < 0 ||
            fee > 99999999 ||
            Math.round(fee * 100) !== fee * 100)
      )
         return {
            error: 'consultation_fee must be a non-negative amount in PHP',
         };
      values.consultationFee = fee === null ? null : fee.toFixed(2);
   }
   if (body?.is_active !== undefined) values.isActive = Boolean(body.is_active);
   return { values };
}

export async function listAdminPractitioners(_req, res) {
   try {
      return res.json({
         practitioners: await db
            .select()
            .from(providers)
            .orderBy(asc(providers.lastName)),
      });
   } catch (error) {
      console.error('Failed to list practitioners:', error);
      return res.status(500).json({ error: 'Failed to list practitioners' });
   }
}

export async function createAdminPractitioner(req, res) {
   const { values, error } = practitionerValues(req.body, { creating: true });
   if (error) return res.status(400).json({ error });
   try {
      const [created] = await db.insert(providers).values(values).returning();
      void recordAudit({
         entityType: 'practitioner',
         entityId: created.id,
         action: 'admin_create',
         changedBy: req.user.id,
         newValue: values,
      });
      return res.status(201).json(created);
   } catch (err) {
      console.error('Failed to create practitioner:', err);
      return res.status(500).json({ error: 'Failed to create practitioner' });
   }
}

export async function updateAdminPractitioner(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid practitioner ID' });
   const { values: updates, error } = practitionerValues(req.body, {
      creating: false,
   });
   if (error) return res.status(400).json({ error });
   if (!Object.keys(updates).length)
      return res.status(400).json({ error: 'No supported updates supplied' });
   try {
      const [updated] = await db
         .update(providers)
         .set(updates)
         .where(eq(providers.id, id))
         .returning();
      if (updated)
         void recordAudit({
            entityType: 'practitioner',
            entityId: id,
            action: 'admin_update',
            changedBy: req.user.id,
            newValue: updates,
         });
      return updated
         ? res.json(updated)
         : res.status(404).json({ error: 'Practitioner not found' });
   } catch (err) {
      console.error('Failed to update practitioner:', err);
      return res.status(500).json({ error: 'Failed to update practitioner' });
   }
}

export async function uploadAdminPractitionerPhoto(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid practitioner ID' });
   if (!req.file?.buffer?.length || !isSupportedPhotoType(req.file.mimetype))
      return res
         .status(400)
         .json({ error: 'A PNG, JPEG, or WebP photo is required' });
   try {
      const photoUrl = await storePractitionerPhoto({
         practitionerId: id,
         file: req.file,
      });
      const [updated] = await db
         .update(providers)
         .set({ photoUrl })
         .where(eq(providers.id, id))
         .returning();
      if (!updated)
         return res.status(404).json({ error: 'Practitioner not found' });
      void recordAudit({
         entityType: 'practitioner',
         entityId: id,
         action: 'admin_photo_update',
         changedBy: req.user.id,
      });
      return res.json(updated);
   } catch (error) {
      console.error('Failed to upload practitioner photo:', error);
      return res.status(500).json({ error: 'Failed to upload photo' });
   }
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
// Postgres returns time as HH:MM:SS; pad HH:MM so strings compare in order.
const fullTime = (value) => (value.length === 5 ? `${value}:00` : value);

// Returns { values } or { error } for an Arrival Window create/update body.
function arrivalWindowValues(body, { creating }) {
   const values = {};
   if (body?.name !== undefined || creating) {
      values.name = clean(body?.name, 100);
      if (!values.name) return { error: 'name is required' };
   }
   for (const field of ['startTime', 'endTime']) {
      if (body?.[field] === undefined && !creating) continue;
      if (!TIME_PATTERN.test(body?.[field] ?? ''))
         return { error: `${field} must be a time like 07:00` };
      values[field] = body[field];
   }
   if (body?.isActive !== undefined) values.isActive = Boolean(body.isActive);
   return { values };
}

// Returns an error message when the window is invalid or overlaps another active one.
async function arrivalWindowConflict(window, id) {
   if (fullTime(window.startTime) >= fullTime(window.endTime))
      return { status: 400, error: 'endTime must be after startTime' };
   if (window.isActive === false) return null;
   const others = await db
      .select()
      .from(arrivalWindows)
      .where(
         id
            ? and(eq(arrivalWindows.isActive, true), ne(arrivalWindows.id, id))
            : eq(arrivalWindows.isActive, true),
      );
   const clash = others.find(
      (other) =>
         fullTime(window.startTime) < fullTime(other.endTime) &&
         fullTime(other.startTime) < fullTime(window.endTime),
   );
   return clash
      ? { status: 409, error: `Overlaps the ${clash.name} Arrival Window` }
      : null;
}

export async function listAdminArrivalWindows(_req, res) {
   try {
      return res.json({
         arrivalWindows: await db
            .select()
            .from(arrivalWindows)
            .orderBy(asc(arrivalWindows.startTime)),
      });
   } catch (error) {
      console.error('Failed to list arrival windows:', error);
      return res.status(500).json({ error: 'Failed to list arrival windows' });
   }
}

export async function createAdminArrivalWindow(req, res) {
   const { values, error } = arrivalWindowValues(req.body, { creating: true });
   if (error) return res.status(400).json({ error });
   try {
      const conflict = await arrivalWindowConflict(values);
      if (conflict)
         return res.status(conflict.status).json({ error: conflict.error });
      const [created] = await db
         .insert(arrivalWindows)
         .values(values)
         .returning();
      return res.status(201).json(created);
   } catch (err) {
      console.error('Failed to create arrival window:', err);
      return res.status(500).json({ error: 'Failed to create arrival window' });
   }
}

export async function updateAdminArrivalWindow(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid Arrival Window ID' });
   const { values: updates, error } = arrivalWindowValues(req.body, {
      creating: false,
   });
   if (error) return res.status(400).json({ error });
   if (!Object.keys(updates).length)
      return res.status(400).json({ error: 'No supported updates supplied' });
   try {
      const [stored] = await db
         .select()
         .from(arrivalWindows)
         .where(eq(arrivalWindows.id, id))
         .limit(1);
      if (!stored)
         return res.status(404).json({ error: 'Arrival Window not found' });
      const conflict = await arrivalWindowConflict(
         { ...stored, ...updates },
         id,
      );
      if (conflict)
         return res.status(conflict.status).json({ error: conflict.error });
      const [updated] = await db
         .update(arrivalWindows)
         .set(updates)
         .where(eq(arrivalWindows.id, id))
         .returning();
      return res.json(updated);
   } catch (err) {
      console.error('Failed to update arrival window:', err);
      return res.status(500).json({ error: 'Failed to update arrival window' });
   }
}

export async function deleteAdminArrivalWindow(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid Arrival Window ID' });
   try {
      const [deleted] = await db
         .delete(arrivalWindows)
         .where(eq(arrivalWindows.id, id))
         .returning();
      return deleted
         ? res.json({ deleted: true })
         : res.status(404).json({ error: 'Arrival Window not found' });
   } catch (error) {
      console.error('Failed to delete arrival window:', error);
      return res
         .status(409)
         .json({ error: 'Arrival Window is still in use; deactivate it' });
   }
}

export async function listAdminReferenceData(_req, res) {
   try {
      const [
         providerRows,
         availability,
         roomRows,
         equipmentRows,
         visitRows,
         planRows,
      ] = await Promise.all([
         db.select().from(providers).orderBy(asc(providers.lastName)),
         db
            .select()
            .from(providerAvailability)
            .orderBy(asc(providerAvailability.providerId)),
         db.select().from(rooms).orderBy(asc(rooms.id)),
         db.select().from(equipment).orderBy(asc(equipment.id)),
         db.select().from(visitTypes).orderBy(asc(visitTypes.id)),
         db
            .select()
            .from(insurancePlans)
            .orderBy(asc(insurancePlans.payerName)),
      ]);
      return res.json({
         providers: providerRows,
         availability,
         rooms: roomRows,
         equipment: equipmentRows,
         visitTypes: visitRows,
         insurancePlans: planRows,
      });
   } catch (error) {
      console.error('Failed to list reference data:', error);
      return res.status(500).json({ error: 'Failed to list reference data' });
   }
}

export async function createAdminReference(req, res) {
   const definition = resources[req.params.resource];
   const values = resourceValues(req.params.resource, req.body);
   if (!definition || !values || !Object.keys(values).length) {
      return res
         .status(400)
         .json({ error: 'Unsupported resource or empty payload' });
   }
   try {
      const [created] = await db
         .insert(definition.table)
         .values(values)
         .returning();
      return res.status(201).json(created);
   } catch (error) {
      console.error('Failed to create reference data:', error);
      return res
         .status(409)
         .json({ error: 'Reference data could not be created' });
   }
}

export async function updateAdminReference(req, res) {
   const definition = resources[req.params.resource];
   const values = resourceValues(req.params.resource, req.body);
   const id = Number(req.params.id);
   if (
      !definition ||
      !values ||
      !Object.keys(values).length ||
      !Number.isInteger(id) ||
      id < 1
   ) {
      return res
         .status(400)
         .json({ error: 'Unsupported resource, ID, or empty payload' });
   }
   try {
      const [updated] = await db
         .update(definition.table)
         .set(values)
         .where(eq(definition.table.id, id))
         .returning();
      return updated
         ? res.json(updated)
         : res.status(404).json({ error: 'Reference record not found' });
   } catch (error) {
      console.error('Failed to update reference data:', error);
      return res
         .status(409)
         .json({ error: 'Reference data could not be updated' });
   }
}

export async function deleteAdminReference(req, res) {
   const definition = resources[req.params.resource];
   const id = Number(req.params.id);
   if (!definition || !Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Unsupported resource or ID' });
   }
   try {
      const [deleted] = await db
         .delete(definition.table)
         .where(eq(definition.table.id, id))
         .returning();
      return deleted
         ? res.json({ deleted: true })
         : res.status(404).json({ error: 'Reference record not found' });
   } catch (error) {
      console.error('Failed to delete reference data:', error);
      return res
         .status(409)
         .json({ error: 'Reference record is still in use' });
   }
}
