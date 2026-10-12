import 'dotenv/config';
import app from './app.js';
import { processExpiredWaitlistOffers } from './services/waitlist.service.js';
import { sendPendingNotificationEmails } from './services/notification.service.js';

const PORT = process.env.PORT;

app.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
   processExpiredWaitlistOffers().catch((error) => {
      console.error('Waitlist expiry check failed:', error);
   });
   sendPendingNotificationEmails().catch((error) => {
      console.error('Notification email check failed:', error);
   });
   const expiryTimer = setInterval(() => {
      processExpiredWaitlistOffers().catch((error) => {
         console.error('Waitlist expiry check failed:', error);
      });
      sendPendingNotificationEmails().catch((error) => {
         console.error('Notification email check failed:', error);
      });
   }, 60_000);
   expiryTimer.unref();
});
