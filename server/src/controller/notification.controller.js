import {
   listNotifications,
   markNotificationRead,
   sendPendingNotificationEmails,
} from '../services/notification.service.js';

export async function getMyNotifications(req, res) {
   try {
      return res.json({ notifications: await listNotifications(req.user.id) });
   } catch (error) {
      console.error('Failed to list notifications:', error);
      return res.status(500).json({ error: 'Failed to list notifications' });
   }
}

export async function readMyNotification(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid notification ID' });
   try {
      const notification = await markNotificationRead(req.user.id, id);
      return notification
         ? res.json(notification)
         : res.status(404).json({ error: 'Notification not found' });
   } catch (error) {
      console.error('Failed to mark notification read:', error);
      return res
         .status(500)
         .json({ error: 'Failed to mark notification read' });
   }
}

export async function processNotificationEmails(req, res) {
   if (req.user.role !== 'staff_admin')
      return res
         .status(403)
         .json({ error: 'Staff administrator access required' });
   try {
      return res.json(await sendPendingNotificationEmails());
   } catch (error) {
      console.error('Failed to process notification emails:', error);
      return res
         .status(500)
         .json({ error: 'Failed to process notification emails' });
   }
}
