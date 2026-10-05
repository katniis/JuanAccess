import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoute from './routes/auth.route.js';
import appointmentRoute from './routes/appointment.route.js';
import waitlistRoute from './routes/waitlist.route.js';
import insuranceRoute from './routes/insurance.route.js';
import priorAuthRoute from './routes/prior-auth.route.js';
import staffRoute from './routes/staff.route.js';

process.env.TZ = process.env.CLINIC_TIME_ZONE;

const app = express();
app.use(
   cors({
      origin: process.env.CLIENT_ORIGIN,
      credentials: true,
   }),
);
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
   const start = Date.now();

   res.on('finish', () => {
      const method = req.method.padEnd(10);
      const route = req.originalUrl.padEnd(30);
      const status = res.statusCode.toString().padEnd(10);
      const time = `${Date.now() - start}ms`;

      console.log(`${method}${route}${status}${time}`);
   });

   next();
});

app.use('/auth', authRoute);
app.use('/appointment', appointmentRoute);
app.use('/waitlist', waitlistRoute);
app.use('/insurance', insuranceRoute);
app.use('/prior-auth', priorAuthRoute);
app.use('/staff', staffRoute);

app.get('/api/health', async (req, res) => {
   res.json({ status: 'ok' });
});

export default app;
