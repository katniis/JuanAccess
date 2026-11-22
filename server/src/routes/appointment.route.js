import express from 'express';
import {
   cancelAppointment,
   createAppointment,
   draftCancellationLetterHandler,
   getAllVisitTypes,
   getAvailableSlots,
   getMyAppointments,
   getVisitType,
} from '../controller/appointment.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/visit-type', verifyToken, getAllVisitTypes);
router.get('/visit-type/:id', verifyToken, getVisitType);
router.get('/available-slots', verifyToken, getAvailableSlots);
router.post('/', verifyToken, createAppointment);
router.get('/mine', verifyToken, getMyAppointments);
router.delete('/:id', verifyToken, cancelAppointment);
router.post(
   '/:id/cancellation-letter/draft',
   verifyToken,
   draftCancellationLetterHandler,
);

export default router;
