import express from 'express';
import {
   getDoctorDirectory,
   getDoctorProfileHandler,
} from '../controller/doctor-directory.controller.js';

// Public: the Doctor Directory is viewable without logging in.
const router = express.Router();
router.get('/', getDoctorDirectory);
router.get('/:id', getDoctorProfileHandler);

export default router;
