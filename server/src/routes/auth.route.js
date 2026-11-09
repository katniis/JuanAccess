import express from 'express';
import {
   login,
   logout,
   patientRegister,
   providerRegister,
   acceptStaffInvitation,
   getSettings,
   patchSettings,
   changePassword,
   forgotPassword,
   resetPassword,
   requestEmailChange,
   confirmEmailChange,
} from '../controller/auth.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

//Login
router.post('/login', login);

// Register Patient
router.post('/register', patientRegister);

//Register Provier
const requireStaffAdmin = (req, res, next) => {
   if (req.user?.role !== 'staff_admin') {
      return res
         .status(403)
         .json({ message: 'Staff administrator access required.' });
   }

   return next();
};

router.post(
   '/register/provider',
   verifyToken,
   requireStaffAdmin,
   providerRegister,
);

router.post('/accept-invite', acceptStaffInvitation);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/email-change/confirm', confirmEmailChange);
router.get('/settings', verifyToken, getSettings);
router.patch('/settings', verifyToken, patchSettings);
router.patch('/password', verifyToken, changePassword);
router.post('/email-change/request', verifyToken, requestEmailChange);

//Logout
router.post('/logout', logout);

//me
router.get('/me', verifyToken, (req, res) => {
   res.json({ user: req.user });
});

export default router;
