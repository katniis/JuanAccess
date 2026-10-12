import {
   createBill,
   getPatientBill,
   explainPatientBill,
   listPatientBills,
   markDisputeDownloaded,
   updatePatientDisputeLetter,
} from '../services/billing.service.js';
import { extractBillLineItems } from '../services/gemini.service.js';
import {
   BillStorageNotConfiguredError,
   createBillSignedUrl,
   isPatientBillPath,
   uploadBillFile,
} from '../services/bill-storage.service.js';

function patientId(req) {
   return req.user?.role === 'patient' ? req.user.patientId : null;
}

export const uploadPatientBill = async (req, res) => {
   const id = patientId(req);
   if (!id) return res.status(403).json({ error: 'Patient access required' });
   if (!req.file) {
      return res.status(400).json({ error: 'A bill file is required' });
   }

   try {
      const stored = await uploadBillFile({ patientId: id, file: req.file });
      const extracted = await extractBillLineItems({
         documentBase64: req.file.buffer.toString('base64'),
         mimeType: req.file.mimetype,
      });
      return res.status(201).json({
         uploadedFileUrl: stored.path,
         previewUrl: await createBillSignedUrl(stored.path, id),
         ...extracted,
      });
   } catch (error) {
      if (error instanceof BillStorageNotConfiguredError) {
         return res.status(503).json({
            error: 'Bill storage is not configured',
         });
      }
      if (error?.message === 'Unsupported bill file type') {
         return res.status(400).json({ error: error.message });
      }
      if (error?.message === 'Bill file is empty or too large') {
         return res.status(413).json({ error: error.message });
      }
      console.error('Failed to upload bill file:', error);
      return res.status(500).json({ error: 'Failed to upload bill file' });
   }
};

export const extractMyBillLineItems = async (req, res) => {
   const id = patientId(req);
   if (!id) return res.status(403).json({ error: 'Patient access required' });

   const documentBase64 = req.body?.document_base64;
   const mimeType = req.body?.mime_type;
   if (
      typeof documentBase64 !== 'string' ||
      !documentBase64.trim() ||
      typeof mimeType !== 'string' ||
      !mimeType.trim()
   ) {
      return res.status(400).json({
         error: 'document_base64 and mime_type are required',
      });
   }

   try {
      const result = await extractBillLineItems({
         documentBase64: documentBase64.trim(),
         mimeType: mimeType.trim(),
      });
      return res.json(result);
   } catch (error) {
      console.error('Failed to extract bill line items:', error);
      return res
         .status(500)
         .json({ error: 'Failed to extract bill line items' });
   }
};

export const createPatientBill = async (req, res) => {
   const id = patientId(req);
   if (!id) return res.status(403).json({ error: 'Patient access required' });
   const {
      appointment_id: appointmentId,
      uploaded_file_url: uploadedFileUrl,
      line_items: lineItems,
   } = req.body ?? {};
   if (
      (appointmentId !== undefined &&
         appointmentId !== null &&
         (!Number.isInteger(Number(appointmentId)) ||
            Number(appointmentId) < 1)) ||
      typeof uploadedFileUrl !== 'string' ||
      !uploadedFileUrl.trim() ||
      !Array.isArray(lineItems)
   ) {
      return res.status(400).json({
         error: 'uploaded_file_url and line_items are required',
      });
   }
   if (
      uploadedFileUrl.startsWith('patients/') &&
      !isPatientBillPath(uploadedFileUrl, id)
   ) {
      return res.status(403).json({ error: 'Invalid bill storage path' });
   }

   const normalizedItems = lineItems.map((item) => ({
      procedureCode:
         typeof item?.procedure_code === 'string'
            ? item.procedure_code.trim()
            : null,
      description:
         typeof item?.description === 'string' ? item.description.trim() : null,
      amount: item?.amount,
   }));
   if (
      normalizedItems.some(
         (item) =>
            item.amount === null ||
            item.amount === undefined ||
            Number.isNaN(Number(item.amount)) ||
            Number(item.amount) < 0,
      )
   ) {
      return res
         .status(400)
         .json({ error: 'Every line item needs a valid amount' });
   }

   try {
      const result = await createBill({
         patientId: id,
         appointmentId: appointmentId ? Number(appointmentId) : null,
         uploadedFileUrl: uploadedFileUrl.trim(),
         lineItems: normalizedItems,
      });
      if (result.error)
         return res.status(result.status).json({ error: result.error });
      const bill = await getPatientBill(id, result.billId);
      return res.status(201).json(bill);
   } catch (error) {
      console.error('Failed to create bill:', error);
      return res.status(500).json({ error: 'Failed to create bill' });
   }
};

export const getMyBills = async (req, res) => {
   const id = patientId(req);
   if (!id) return res.status(403).json({ error: 'Patient access required' });
   try {
      return res.json(await listPatientBills(id));
   } catch (error) {
      console.error('Failed to list bills:', error);
      return res.status(500).json({ error: 'Failed to list bills' });
   }
};

export const getMyBill = async (req, res) => {
   const id = patientId(req);
   const billId = Number(req.params.id);
   if (!id) return res.status(403).json({ error: 'Patient access required' });
   if (!Number.isInteger(billId) || billId < 1)
      return res.status(400).json({ error: 'Invalid bill ID' });
   try {
      const bill = await getPatientBill(id, billId);
      return bill
         ? res.json(bill)
         : res.status(404).json({ error: 'Bill not found' });
   } catch (error) {
      console.error('Failed to fetch bill:', error);
      return res.status(500).json({ error: 'Failed to fetch bill' });
   }
};

export const explainMyBill = async (req, res) => {
   const id = patientId(req);
   const billId = Number(req.params.id);
   if (!id) return res.status(403).json({ error: 'Patient access required' });
   if (!Number.isInteger(billId) || billId < 1)
      return res.status(400).json({ error: 'Invalid bill ID' });
   try {
      const explanation = await explainPatientBill(id, billId);
      return explanation
         ? res.json(explanation)
         : res.status(404).json({ error: 'Bill not found' });
   } catch (error) {
      console.error('Failed to explain bill:', error);
      return res.status(500).json({ error: 'Failed to explain bill' });
   }
};

export const editMyDisputeLetter = async (req, res) => {
   const id = patientId(req);
   const billId = Number(req.params.id);
   const letterText = req.body?.letter_text;
   if (!id) return res.status(403).json({ error: 'Patient access required' });
   if (
      !Number.isInteger(billId) ||
      billId < 1 ||
      typeof letterText !== 'string'
   )
      return res.status(400).json({ error: 'Valid letter_text is required' });
   try {
      const letter = await updatePatientDisputeLetter(
         id,
         billId,
         letterText.trim(),
      );
      return letter
         ? res.json(letter)
         : res.status(404).json({ error: 'Dispute letter not found' });
   } catch (error) {
      console.error('Failed to update dispute letter:', error);
      return res.status(500).json({ error: 'Failed to update dispute letter' });
   }
};

export const markMyDisputeDownloaded = async (req, res) => {
   const id = patientId(req);
   const billId = Number(req.params.id);
   if (!id) return res.status(403).json({ error: 'Patient access required' });
   if (!Number.isInteger(billId) || billId < 1)
      return res.status(400).json({ error: 'Invalid bill ID' });
   try {
      const letter = await markDisputeDownloaded(id, billId);
      return letter
         ? res.json(letter)
         : res.status(404).json({ error: 'Dispute letter not found' });
   } catch (error) {
      console.error('Failed to mark dispute downloaded:', error);
      return res
         .status(500)
         .json({ error: 'Failed to mark dispute downloaded' });
   }
};
