import express from 'express';
import multer from 'multer';
import {
   createPatientBill,
   deleteMyBill,
   editMyDisputeLetter,
   extractMyBillLineItems,
   getMyBill,
   getMyBills,
   explainMyBill,
   markMyDisputeDownloaded,
   submitMyDisputeLetter,
   uploadPatientBill,
} from '../controller/billing.controller.js';
import { BILL_MAX_BYTES } from '../services/bill-storage.service.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const billUpload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: BILL_MAX_BYTES },
});

function parseBillUpload(req, res, next) {
   billUpload.single('file')(req, res, (error) => {
      if (!error) return next();
      if (
         error instanceof multer.MulterError &&
         error.code === 'LIMIT_FILE_SIZE'
      ) {
         return res.status(413).json({ error: 'Bill file is too large' });
      }
      return res.status(400).json({ error: 'Invalid bill file upload' });
   });
}

router.use(verifyToken);
router.post('/upload', parseBillUpload, uploadPatientBill);
router.post('/', createPatientBill);
router.post('/ocr', extractMyBillLineItems);
router.get('/mine', getMyBills);
router.delete('/:id', deleteMyBill);
router.get('/:id', getMyBill);
router.get('/:id/explanation', explainMyBill);
router.patch('/:id/dispute-letter', editMyDisputeLetter);
router.post('/:id/dispute-letter/submit', submitMyDisputeLetter);
router.post('/:id/dispute-letter/downloaded', markMyDisputeDownloaded);

export default router;
