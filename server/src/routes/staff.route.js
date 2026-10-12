import express from 'express';
import {
   cancelAppointmentStaff,
   createAppeal,
   createGuideline,
   draftPriorAuthJustification,
   getAppealDetail,
   getAppealsQueue,
   getAppointmentPreVisitData,
   getAppointmentProcedures,
   createAppointmentProcedure,
   getStaffDisputes,
   getStaffFeeSchedule,
   getDashboard,
   getDoctorScheduleHandler,
   getDoctors,
   getGuidelines,
   getPatientDetails,
   getPatients,
   getPriorAuthDetail,
   getPriorAuthQueue,
   getSlotsUtilization,
   getUnverifiedCoverages,
   getWaitlistMonitor,
   rescheduleAppointmentStaff,
   submitAppeal,
   submitPriorAuth,
   updateAppealDecision,
   updateAppealDraft,
   updatePriorAuthDecision,
   verifyCoverageStaff,
} from '../controller/staff.controller.js';
import { requireStaff, requireStaffAdmin } from '../middleware/authRole.js';
import { verifyToken } from '../middleware/verifyToken.js';
import {
   createAdminReference,
   createStaffInvitation,
   deleteAdminReference,
   listAdminReferenceData,
   listAdminUsers,
   updateAdminReference,
   updateAdminProvider,
   updateAdminUser,
} from '../controller/admin.controller.js';

const router = express.Router();

// All staff routes require an authenticated user with staff or staff_admin role
router.use(verifyToken);
router.use(requireStaff);

// 1. Dashboard & Lookups
router.get('/dashboard', getDashboard);
router.get('/doctors', getDoctors);
router.get('/doctors/:id/schedule', getDoctorScheduleHandler);
router.get('/patients', getPatients);
router.get('/patients/:id', getPatientDetails);
router.get('/appointments/:id/pre-visit-data', getAppointmentPreVisitData);
router.get('/appointments/:id/procedures', getAppointmentProcedures);
router.post('/appointments/:id/procedures', createAppointmentProcedure);
router.get('/disputes', getStaffDisputes);
router.get('/fee-schedule', getStaffFeeSchedule);

// 2. Slots & Utilization
router.get('/slots/utilization', getSlotsUtilization);
router.patch('/appointments/:id/cancel', cancelAppointmentStaff);
router.patch('/appointments/:id/reschedule', rescheduleAppointmentStaff);
router.get('/waitlist', getWaitlistMonitor);

// 3. Prior-Authorization Queue
router.get('/prior-auth', getPriorAuthQueue);
router.get('/prior-auth/:id', getPriorAuthDetail);
router.patch('/prior-auth/:id/draft', draftPriorAuthJustification);
router.post('/prior-auth/:id/submit', requireStaffAdmin, submitPriorAuth);
router.patch(
   '/prior-auth/:id/decision',
   requireStaffAdmin,
   updatePriorAuthDecision,
);

// 4. Appeals Queue
router.get('/appeals', getAppealsQueue);
router.get('/appeals/:id', getAppealDetail);
router.post('/appeals', createAppeal);
router.patch('/appeals/:id', updateAppealDraft);
router.post('/appeals/:id/submit', requireStaffAdmin, submitAppeal);
router.patch('/appeals/:id/decision', requireStaffAdmin, updateAppealDecision);

// 5. Clinical Guidelines
router.get('/guidelines', getGuidelines);
router.post('/guidelines', requireStaffAdmin, createGuideline);

router.get('/admin/users', requireStaffAdmin, listAdminUsers);
router.patch('/admin/users/:id', requireStaffAdmin, updateAdminUser);
router.post('/admin/invitations', requireStaffAdmin, createStaffInvitation);
router.patch('/admin/providers/:id', requireStaffAdmin, updateAdminProvider);
router.get('/admin/reference-data', requireStaffAdmin, listAdminReferenceData);
router.post(
   '/admin/reference/:resource',
   requireStaffAdmin,
   createAdminReference,
);
router.patch(
   '/admin/reference/:resource/:id',
   requireStaffAdmin,
   updateAdminReference,
);
router.delete(
   '/admin/reference/:resource/:id',
   requireStaffAdmin,
   deleteAdminReference,
);

// 6. Insurance Verification (New Patient Handling)
router.get('/insurance/unverified', getUnverifiedCoverages);
router.patch('/insurance/coverage/:id/verify', verifyCoverageStaff);

export default router;
