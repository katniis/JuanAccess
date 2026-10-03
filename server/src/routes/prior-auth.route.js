import express from 'express';
import {
   getAppointmentPriorAuthorization,
   getMyPriorAuthorizationStatuses,
   getPriorAuthRules,
   savePriorAuthRule,
   updatePriorAuthorizationStatus,
} from '../controller/prior-auth.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/mine', verifyToken, getMyPriorAuthorizationStatuses);
router.get('/rules', verifyToken, getPriorAuthRules);
router.put('/rules', verifyToken, savePriorAuthRule);
router.get(
   '/appointments/:appointmentId',
   verifyToken,
   getAppointmentPriorAuthorization,
);
router.patch('/:id/status', verifyToken, updatePriorAuthorizationStatus);

export default router;
