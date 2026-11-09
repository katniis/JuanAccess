import jwt from 'jsonwebtoken';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';

export const verifyToken = async (req, res, next) => {
   const token = req.cookies?.token;
   if (!token) {
      return res.status(401).json({ message: 'Not authorized: no token.' });
   }

   if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured.');
      return res
         .status(500)
         .json({ message: 'Authentication is not configured.' });
   }

   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (typeof decoded !== 'object' || typeof decoded.id !== 'number') {
         return res
            .status(401)
            .json({ message: 'Not authorized: invalid token.' });
      }

      const [user] = await db
         .select({
            id: users.id,
            email: users.email,
            role: users.role,
            patientId: users.patientId,
            providerId: users.providerId,
            displayName: users.displayName,
            authVersion: users.authVersion,
         })
         .from(users)
         .where(and(eq(users.id, decoded.id), eq(users.isActive, true)))
         .limit(1);

      if (!user) {
         return res
            .status(401)
            .json({ message: 'Not authorized: user not found.' });
      }

      if ((decoded.authVersion ?? 0) !== (user.authVersion ?? 0)) {
         return res
            .status(401)
            .json({ message: 'Not authorized: session expired.' });
      }

      const { authVersion, ...safeUser } = user;
      req.user = safeUser;
      req.auth = {
         rememberMe: decoded.rememberMe === true,
         authVersion: decoded.authVersion ?? 0,
      };
      return next();
   } catch (error) {
      if (
         error?.name !== 'JsonWebTokenError' &&
         error?.name !== 'TokenExpiredError'
      ) {
         console.error('Token verification failed:', error);
         return res.status(500).json({ message: 'Internal server error.' });
      }
      return res.status(401).json({ message: 'Not authorized: token failed.' });
   }
};
