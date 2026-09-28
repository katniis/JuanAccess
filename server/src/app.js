import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoute from './routes/auth.route.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
   const start = Date.now();

   res.on('finish', () => {
      const method = req.method.padEnd(10);
      const route = req.originalUrl.padEnd(25);
      const status = res.statusCode.toString().padEnd(10);
      const time = `${Date.now() - start}ms`;

      console.log(`${method}${route}${status}${time}`);
   });

   next();
});

app.use('/auth', authRoute);

app.get('/api/health', async (req, res) => {
   res.json({ status: 'ok' });
});

export default app;
