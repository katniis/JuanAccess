import express from 'express';
import {
   confirmWaitlistOffer,
   cancelWaitlistEntry,
   declineWaitlistOffer,
   getMyWaitlist,
   joinWaitlist,
} from '../controller/waitlist.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/', verifyToken, joinWaitlist);
router.get('/mine', verifyToken, getMyWaitlist);
router.delete('/:id', verifyToken, cancelWaitlistEntry);
router.post('/:id/confirm', verifyToken, confirmWaitlistOffer);
router.post('/:id/decline', verifyToken, declineWaitlistOffer);

export default router;
