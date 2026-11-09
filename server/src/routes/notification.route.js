import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import {
   getMyNotifications,
   getNotificationEmailStatus,
   processNotificationEmails,
   dismissAllMyNotifications,
   dismissMyNotification,
   readMyNotification,
} from '../controller/notification.controller.js';

const router = express.Router();
router.use(verifyToken);
router.get('/mine', getMyNotifications);
router.get('/email/status', getNotificationEmailStatus);
router.delete('/mine', dismissAllMyNotifications);
router.delete('/:id', dismissMyNotification);
router.patch('/:id/read', readMyNotification);
router.post('/process-email', processNotificationEmails);

export default router;
