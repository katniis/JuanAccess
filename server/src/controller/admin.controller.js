import crypto from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { recordAudit } from '../services/audit.service.js';
import {
   equipment,
   feeSchedule,
   insurancePlans,
   providerAvailability,
   providers,
   rooms,
   userInvitations,
   users,
   visitTypes,
} from '../db/schema/index.js';

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
   'fee-schedule': {
      table: feeSchedule,
      fields: ['procedureCode', 'description', 'standardCost'],
   },
};

function resourceValues(resource, body) {
   const definition = resources[resource];
   if (!definition) return null;
   const values = {};
   for (const field of definition.fields) {
      if (body?.[field] !== undefined) values[field] = body[field];
   }
   return values;
}

export async function createStaffInvitation(req, res) {
   const email = clean(req.body?.email)?.toLowerCase();
   const role = req.body?.role;
   const firstName = clean(req.body?.first_name, 100);
   const lastName = clean(req.body?.last_name, 100);
   if (
      !email ||
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
      return res.status(201).json({ invitation, invitation_token: token });
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

export async function updateAdminProvider(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid provider ID' });
   const updates = {};
   for (const [key, field, maxLength] of [
      ['first_name', 'firstName', 100],
      ['last_name', 'lastName', 100],
      ['specialty', 'specialty', 100],
      ['npi_number', 'npiNumber', 20],
   ]) {
      if (req.body?.[key] !== undefined)
         updates[field] = clean(req.body[key], maxLength);
   }
   if (req.body?.is_active !== undefined)
      updates.isActive = Boolean(req.body.is_active);
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
            entityType: 'provider',
            entityId: id,
            action: 'admin_update',
            changedBy: req.user.id,
            newValue: updates,
         });
      return updated
         ? res.json(updated)
         : res.status(404).json({ error: 'Provider not found' });
   } catch (error) {
      console.error('Failed to update provider:', error);
      return res.status(500).json({ error: 'Failed to update provider' });
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
