import express from 'express';
import {
   createPatientBill,
   editMyDisputeLetter,
   extractMyBillLineItems,
   getMyBill,
   getMyBills,
   explainMyBill,
   markMyDisputeDownloaded,
} from '../controller/billing.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.use(verifyToken);
router.post('/', createPatientBill);
router.post('/ocr', extractMyBillLineItems);
router.get('/mine', getMyBills);
router.get('/:id', getMyBill);
router.get('/:id/explanation', explainMyBill);
router.patch('/:id/dispute-letter', editMyDisputeLetter);
router.post('/:id/dispute-letter/downloaded', markMyDisputeDownloaded);

export default router;
