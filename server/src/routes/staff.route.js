import express from 'express';
import multer from 'multer';
import { PHOTO_MAX_BYTES } from '../services/practitioner-photo.service.js';
import {
   cancelAppointmentStaff,
   createAppeal,
   createGuideline,
   draftPriorAuthJustification,
   getAppealDetail,
   getAppealsQueue,
   getAppointmentPreVisitData,
   getAppointmentProcedures,
   getCancellationReportHandler,
   createAppointmentProcedure,
   getStaffDisputes,
   getStaffDisputeDetail,
   getStaffFeeSchedule,
   getDashboard,
   getDoctorScheduleHandler,
   getDoctors,
   getGuidelines,
   getPatientDetails,
   getPatients,
   getPractitionerDutyOverrides,
   getPractitionerOnDuty,
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
import { draftCancellationLetterHandler } from '../controller/appointment.controller.js';
import { requireStaff, requireStaffAdmin } from '../middleware/authRole.js';
import { verifyToken } from '../middleware/verifyToken.js';
import {
   createAdminReference,
   createStaffInvitation,
   deleteAdminReference,
   listAdminReferenceData,
   listAdminUsers,
   resetUserSecondFactor,
   updateAdminReference,
   createAdminPractitioner,
   listAdminPractitioners,
   updateAdminPractitioner,
   uploadAdminPractitionerPhoto,
   updateAdminUser,
   createAdminArrivalWindow,
   deleteAdminArrivalWindow,
   listAdminArrivalWindows,
   updateAdminArrivalWindow,
} from '../controller/admin.controller.js';
import {
   createApePackage,
   deleteApePackage,
   listApePackages,
   updateApePackage,
} from '../controller/ape-package.controller.js';

const router = express.Router();
const photoUpload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: PHOTO_MAX_BYTES },
});

function parsePhotoUpload(req, res, next) {
   photoUpload.single('file')(req, res, (error) => {
      if (!error) return next();
      if (
         error instanceof multer.MulterError &&
         error.code === 'LIMIT_FILE_SIZE'
      ) {
         return res.status(413).json({ error: 'Photo is too large' });
      }
      return res.status(400).json({ error: 'Invalid photo upload' });
   });
}

// All staff routes require an authenticated user with staff or staff_admin role
router.use(verifyToken);
router.use(requireStaff);

// 1. Dashboard & Lookups
router.get('/dashboard', getDashboard);
router.get('/doctors', getDoctors);
router.get('/doctors/:id/schedule', getDoctorScheduleHandler);
router.get('/practitioners/:id/on-duty', getPractitionerOnDuty);
router.get('/practitioners/:id/duty-overrides', getPractitionerDutyOverrides);
router.get('/patients', getPatients);
router.get('/patients/:id', getPatientDetails);
router.get('/appointments/:id/pre-visit-data', getAppointmentPreVisitData);
router.get('/appointments/:id/procedures', getAppointmentProcedures);
router.post('/appointments/:id/procedures', createAppointmentProcedure);
router.get('/disputes', getStaffDisputes);
router.get('/disputes/:id', getStaffDisputeDetail);
router.get('/fee-schedule', getStaffFeeSchedule);

// 2. Slots & Utilization
router.get('/slots/utilization', getSlotsUtilization);
router.patch('/appointments/:id/cancel', cancelAppointmentStaff);
router.post(
   '/appointments/:id/cancellation-letter/draft',
   draftCancellationLetterHandler,
);
router.patch('/appointments/:id/reschedule', rescheduleAppointmentStaff);
router.get('/waitlist', getWaitlistMonitor);
router.get(
   '/reports/cancellations',
   requireStaffAdmin,
   getCancellationReportHandler,
);

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
router.post(
   '/admin/users/:id/second-factor/reset',
   requireStaffAdmin,
   resetUserSecondFactor,
);
router.post('/admin/invitations', requireStaffAdmin, createStaffInvitation);
router.get('/admin/practitioners', requireStaffAdmin, listAdminPractitioners);
router.post('/admin/practitioners', requireStaffAdmin, createAdminPractitioner);
router.patch(
   '/admin/practitioners/:id',
   requireStaffAdmin,
   updateAdminPractitioner,
);
router.post(
   '/admin/practitioners/:id/photo',
   requireStaffAdmin,
   parsePhotoUpload,
   uploadAdminPractitionerPhoto,
);
router.get(
   '/admin/arrival-windows',
   requireStaffAdmin,
   listAdminArrivalWindows,
);
router.post(
   '/admin/arrival-windows',
   requireStaffAdmin,
   createAdminArrivalWindow,
);
router.patch(
   '/admin/arrival-windows/:id',
   requireStaffAdmin,
   updateAdminArrivalWindow,
);
router.delete(
   '/admin/arrival-windows/:id',
   requireStaffAdmin,
   deleteAdminArrivalWindow,
);
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
router.get('/admin/ape-packages', requireStaffAdmin, listApePackages);
router.post('/admin/ape-packages', requireStaffAdmin, createApePackage);
router.patch('/admin/ape-packages/:id', requireStaffAdmin, updateApePackage);
router.delete('/admin/ape-packages/:id', requireStaffAdmin, deleteApePackage);

// 6. Insurance Verification (New Patient Handling)
router.get('/insurance/unverified', requireStaffAdmin, getUnverifiedCoverages);
router.patch(
   '/insurance/coverage/:id/verify',
   requireStaffAdmin,
   verifyCoverageStaff,
);

export default router;
