import express from 'express';
import { getDoctorProfileHandler } from '../controller/doctor-directory.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

// Doctor Profiles are shown only to signed-in users (any role).
const router = express.Router();
router.get('/:id', verifyToken, getDoctorProfileHandler);

export default router;
