import express from 'express';
import {
   addMyCoverage,
   getMyCoverage,
   getPatientCoverage,
   updateMyCoverage,
   verifyPatientCoverage,
} from '../controller/insurance.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { requireStaffAdmin } from '../middleware/authRole.js';

const router = express.Router();

router.get('/mine', verifyToken, getMyCoverage);
router.post('/mine', verifyToken, addMyCoverage);
router.patch('/mine/:coverageId', verifyToken, updateMyCoverage);
router.get('/patients/:patientId', verifyToken, getPatientCoverage);
router.patch(
   '/coverage/:coverageId/verify',
   verifyToken,
   requireStaffAdmin,
   verifyPatientCoverage,
);

export default router;
