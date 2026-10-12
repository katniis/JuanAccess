import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import {
   getMyNotifications,
   processNotificationEmails,
   readMyNotification,
} from '../controller/notification.controller.js';

const router = express.Router();
router.use(verifyToken);
router.get('/mine', getMyNotifications);
router.patch('/:id/read', readMyNotification);
router.post('/process-email', processNotificationEmails);

export default router;
