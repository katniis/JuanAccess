import { patientRequest } from './patientApi.js';

export const BILL_MAX_BYTES = 10 * 1024 * 1024;

const supportedMimeTypes = new Set([
   'application/pdf',
   'image/jpg',
   'image/jpeg',
   'image/png',
]);
const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

export function isSupportedBillFile(file) {
   const mimeType = file.type?.toLowerCase() || '';
   const hasSupportedMimeType = supportedMimeTypes.has(mimeType);
   const hasSupportedExtension = supportedExtensions.some((extension) =>
      file.name.toLowerCase().endsWith(extension),
   );
   return hasSupportedMimeType || hasSupportedExtension;
}

export function uploadPatientBill(file) {
   const formData = new FormData();
   formData.append('file', file);
   return patientRequest('/bills/upload', { method: 'POST', body: formData });
}

export function createPatientBill(uploadedFileUrl, lineItems) {
   return patientRequest('/bills', {
      method: 'POST',
      body: {
         uploaded_file_url: uploadedFileUrl,
         line_items: lineItems.map((item) => ({
            procedure_code: item.procedureCode || null,
            description: item.description || null,
            amount: Number(item.amount),
         })),
      },
   });
}

export function getMyBills() {
   return patientRequest('/bills/mine');
}

export function deletePatientBill(billId) {
   return patientRequest('/bills/' + billId, { method: 'DELETE' });
}

export function explainPatientBill(billId) {
   return patientRequest('/bills/' + billId + '/explanation');
}

export function updatePatientDisputeLetter(billId, letterText) {
   return patientRequest('/bills/' + billId + '/dispute-letter', {
      method: 'PATCH',
      body: { letter_text: letterText },
   });
}

export function submitPatientDisputeLetter(billId) {
   return patientRequest('/bills/' + billId + '/dispute-letter/submit', {
      method: 'POST',
   });
}

export function markPatientDisputeDownloaded(billId) {
   return patientRequest('/bills/' + billId + '/dispute-letter/downloaded', {
      method: 'POST',
      body: {},
   });
}
