import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { apePackageProcedures, apePackages } from '../db/schema/index.js';
import { isPesoAmount } from '../utils/money.js';

const packageColumns = {
   id: apePackages.id,
   name: apePackages.name,
   packagePrice: apePackages.packagePrice,
   isActive: apePackages.isActive,
};

// Returns { values, procedures } (each possibly undefined) or { error }.
function parsePackage(body, { partial }) {
   const values = {};
   if (body?.name !== undefined || !partial) {
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 100) return { error: 'name is required' };
      values.name = name;
   }
   if (body?.packagePrice !== undefined || !partial) {
      if (!isPesoAmount(body?.packagePrice))
         return { error: 'packagePrice must be a PHP amount' };
      values.packagePrice = String(body.packagePrice);
   }
   if (body?.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean')
         return { error: 'isActive must be a boolean' };
      values.isActive = body.isActive;
   } else if (!partial) values.isActive = true;

   let procedures;
   if (body?.procedures !== undefined || !partial) {
      const list = body?.procedures;
      if (!Array.isArray(list) || !list.length)
         return { error: 'At least one Procedure is required' };
      procedures = list.map((item) => ({
         feeScheduleId: item?.feeScheduleId,
         sexAtBirth: item?.sexAtBirth ?? null,
      }));
      const ids = procedures.map((p) => p.feeScheduleId);
      if (
         !ids.every((id) => Number.isInteger(id) && id > 0) ||
         new Set(ids).size !== ids.length ||
         !procedures.every((p) =>
            [null, 'female', 'male'].includes(p.sexAtBirth),
         )
      )
         return { error: 'Procedures must be distinct fee schedule IDs' };
   }
   return { values, procedures };
}

const errorCode = (error) => error?.cause?.code ?? error?.code;

function sendWriteError(res, error, action) {
   if (errorCode(error) === '23505')
      return res.status(409).json({ error: 'Package name is already used' });
   if (errorCode(error) === '23503')
      return res.status(400).json({ error: 'Unknown Procedure' });
   console.error(`Failed to ${action} APE Package:`, error);
   return res.status(500).json({ error: `Failed to ${action} APE Package` });
}

async function replaceProcedures(tx, packageId, procedures) {
   await tx
      .insert(apePackageProcedures)
      .values(procedures.map((p) => ({ packageId, ...p })));
   return procedures;
}

export async function listApePackages(_req, res) {
   try {
      const packages = await db
         .select(packageColumns)
         .from(apePackages)
         .orderBy(asc(apePackages.name));
      const procedures = await db
         .select({
            packageId: apePackageProcedures.packageId,
            feeScheduleId: apePackageProcedures.feeScheduleId,
            sexAtBirth: apePackageProcedures.sexAtBirth,
         })
         .from(apePackageProcedures)
         .orderBy(asc(apePackageProcedures.id));
      return res.json({
         apePackages: packages.map((apePackage) => ({
            ...apePackage,
            procedures: procedures
               .filter((p) => p.packageId === apePackage.id)
               .map(({ feeScheduleId, sexAtBirth }) => ({
                  feeScheduleId,
                  sexAtBirth,
               })),
         })),
      });
   } catch (error) {
      console.error('Failed to list APE Packages:', error);
      return res.status(500).json({ error: 'Failed to list APE Packages' });
   }
}

export async function createApePackage(req, res) {
   const { values, procedures, error } = parsePackage(req.body, {
      partial: false,
   });
   if (error) return res.status(400).json({ error });
   try {
      const created = await db.transaction(async (tx) => {
         const [apePackage] = await tx
            .insert(apePackages)
            .values(values)
            .returning(packageColumns);
         return {
            ...apePackage,
            procedures: await replaceProcedures(tx, apePackage.id, procedures),
         };
      });
      return res.status(201).json(created);
   } catch (writeError) {
      return sendWriteError(res, writeError, 'create');
   }
}

export async function updateApePackage(req, res) {
   const id = Number(req.params.id);
   const { values, procedures, error } = parsePackage(req.body, {
      partial: true,
   });
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid package ID' });
   if (error) return res.status(400).json({ error });
   if (!Object.keys(values).length && !procedures)
      return res.status(400).json({ error: 'No supported updates supplied' });
   try {
      const updated = await db.transaction(async (tx) => {
         const [apePackage] = Object.keys(values).length
            ? await tx
                 .update(apePackages)
                 .set(values)
                 .where(eq(apePackages.id, id))
                 .returning(packageColumns)
            : await tx
                 .select(packageColumns)
                 .from(apePackages)
                 .where(eq(apePackages.id, id))
                 .limit(1);
         if (!apePackage || !procedures) return apePackage;
         await tx
            .delete(apePackageProcedures)
            .where(eq(apePackageProcedures.packageId, id));
         return {
            ...apePackage,
            procedures: await replaceProcedures(tx, id, procedures),
         };
      });
      return updated
         ? res.json(updated)
         : res.status(404).json({ error: 'APE Package not found' });
   } catch (writeError) {
      return sendWriteError(res, writeError, 'update');
   }
}

export async function deleteApePackage(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid package ID' });
   try {
      const [deleted] = await db
         .delete(apePackages)
         .where(eq(apePackages.id, id))
         .returning({ id: apePackages.id });
      return deleted
         ? res.json({ deleted: true })
         : res.status(404).json({ error: 'APE Package not found' });
   } catch (error) {
      console.error('Failed to delete APE Package:', error);
      return res.status(500).json({ error: 'Failed to delete APE Package' });
   }
}
