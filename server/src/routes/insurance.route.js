import express from 'express';
import {
   addMyCoverage,
   getMyCoverage,
   getPatientCoverage,
   verifyPatientCoverage,
} from '../controller/insurance.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/mine', verifyToken, getMyCoverage);
router.post('/mine', verifyToken, addMyCoverage);
router.get('/patients/:patientId', verifyToken, getPatientCoverage);
router.patch(
   '/coverage/:coverageId/verify',
   verifyToken,
   verifyPatientCoverage,
);

export default router;
