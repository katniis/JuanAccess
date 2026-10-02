import express from 'express';
import {
   getAllVisitType,
   getVisitType,
} from '../controller/appointment.controller.js';

const router = express.Router();

router.get('/visit-type', getAllVisitType);

router.get('/visit-type/:id', getVisitType);

export default router;
