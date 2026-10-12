import { describe, expect, it } from '@jest/globals';
import {
   BILL_MAX_BYTES,
   billStoragePath,
   isPatientBillPath,
   isSupportedBillMimeType,
} from '../services/bill-storage.service.js';

describe('bill storage boundaries', () => {
   it('accepts supported document and image types within the limit', () => {
      expect(isSupportedBillMimeType('application/pdf')).toBe(true);
      expect(isSupportedBillMimeType('image/jpeg')).toBe(true);
      expect(BILL_MAX_BYTES).toBe(10 * 1024 * 1024);
   });

   it('creates and validates patient-scoped paths', () => {
      const path = billStoragePath(12, 'receipt.pdf');
      expect(path).toMatch(/^patients\/12\/bills\/[0-9a-f-]+\.pdf$/);
      expect(isPatientBillPath(path, 12)).toBe(true);
      expect(isPatientBillPath(path, 13)).toBe(false);
      expect(isPatientBillPath('patients/12/bills/../13.pdf', 12)).toBe(false);
   });
});
