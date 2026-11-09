import { useCallback, useEffect, useRef, useState } from 'react';
import AppointmentCancelDialog from '../../components/AppointmentCancelDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import StatusGuide from '../../components/StatusGuide.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   cancelPatientAppointment,
   getPatientAppointments,
} from '../../services/patientAppointments.js';

const appointmentStatusLabels = {
   scheduled: 'Scheduled',
   completed: 'Completed',
   cancelled: 'Cancelled',
   no_show: 'No show',
};

function PatientAppointments() {
   const [appointments, setAppointments] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [busyId, setBusyId] = useState(null);
   const [appointmentToCancel, setAppointmentToCancel] = useState(null);
   const pageRef = useRef(null);
   const { notify } = usePortalFeedback();
   usePortalPageReveal(pageRef, Boolean(appointments));

   const loadAppointments = useCallback(async () => {
      const data = await getPatientAppointments();
      setAppointments(data);
      setHasError(false);
   }, []);

   useEffect(() => {
      let current = true;
      getPatientAppointments()
         .then((data) => {
            if (current) setAppointments(data);
         })
         .catch(() => {
            if (current) setHasError(true);
         });
      return () => {
         current = false;
      };
   }, []);

   const cancelAppointment = (appointment) => {
      setAppointmentToCancel(appointment);
   };

   const confirmCancellation = async () => {
      const appointment = appointmentToCancel;
      if (!appointment) return;
      setBusyId(appointment.id);
      try {
         await cancelPatientAppointment(appointment.id);
         await loadAppointments();
         notify({ type: 'success', message: 'Appointment cancelled.' });
      } catch (error) {
         notify({
            type: 'error',
            message:
               error.message ||
               'We could not cancel this appointment. Please try again.',
         });
      } finally {
         setBusyId(null);
         setAppointmentToCancel(null);
      }
   };

   if (hasError) {
      return (
         <ErrorState
            title="Your appointments couldn’t load"
            message="Check your connection and try again. Your appointments are unchanged."
            retryLabel="Try again"
            onRetry={() => {
               setHasError(false);
               loadAppointments().catch(() => setHasError(true));
            }}
         />
      );
   }

   if (!appointments) {
      return (
         <LoadingSkeleton variant="appointments" label="your appointments" />
      );
   }

   return (
      <div className="centered-page appointments-page" ref={pageRef}>
         <AppointmentCancelDialog
            appointment={appointmentToCancel}
            busy={Boolean(busyId)}
            onCancel={() => setAppointmentToCancel(null)}
            onConfirm={() => void confirmCancellation()}
         />
         <header className="appointments-heading">
            <h1>My Appointments</h1>
            <p>Your appointment history and upcoming visits</p>
         </header>
         <div
            className="appointment-status-guides-mobile"
            role="group"
            aria-label="Appointment status guides">
            <StatusGuide type="insurance" showLabel />
            <StatusGuide type="priorAuth" align="end" showLabel />
         </div>

         <AppointmentSection
            id="upcoming-appointments"
            title="Upcoming"
            emptyMessage="No upcoming appointments to show."
            appointments={appointments.upcoming}
            busyId={busyId}
            onCancel={cancelAppointment}
            showActions
         />
         <AppointmentSection
            id="past-appointments"
            title="Past Appointments"
            emptyMessage="No past appointments to show."
            appointments={appointments.past}
         />
         {appointments.cancelled.length > 0 && (
            <AppointmentSection
               id="cancelled-appointments"
               title="Cancelled"
               description="Cancelled visits are listed separately from upcoming and past appointments."
               appointments={appointments.cancelled}
            />
         )}
         {appointments.needsReview.length > 0 && (
            <AppointmentSection
               id="appointments-needing-review"
               title="Needs date review"
               description="A visit’s recorded status and date do not match. Clinic staff can help confirm these details."
               appointments={appointments.needsReview}
            />
         )}
      </div>
   );
}

function AppointmentSection({
   id,
   title,
   description,
   emptyMessage,
   appointments,
   busyId,
   onCancel,
   showActions = false,
}) {
   return (
      <section className="appointment-section" aria-labelledby={id}>
         <h2 id={id}>{title}</h2>
         {description && (
            <p className="appointment-section-description">{description}</p>
         )}
         {appointments.length === 0 ? (
            <p className="appointments-empty">{emptyMessage}</p>
         ) : (
            <div className="appointments-table-wrap">
               <table className="appointments-table">
                  <caption className="sr-only">{title}</caption>
                  <thead className="appointments-table-head">
                     <tr>
                        <th scope="col">Date &amp; Time</th>
                        <th scope="col">Provider</th>
                        <th scope="col">Visit Type</th>
                        <th scope="col">
                           <span className="appointment-table-heading">
                              Insurance <StatusGuide type="insurance" />
                           </span>
                        </th>
                        <th scope="col">
                           <span className="appointment-table-heading">
                              Prior Auth{' '}
                              <StatusGuide type="priorAuth" align="end" />
                           </span>
                        </th>
                        {showActions && <th scope="col">Actions</th>}
                     </tr>
                  </thead>
                  <tbody>
                     {appointments.map((appointment) => (
                        <tr key={appointment.id}>
                           <td data-label="Date &amp; Time">
                              <span className="appointment-table-copy">
                                 <time dateTime={appointment.scheduledStart}>
                                    {appointment.dateLabel}
                                 </time>
                                 <span className="appointment-table-secondary">
                                    {appointment.timeLabel}
                                 </span>
                                 <span
                                    className="appointment-status-label"
                                    data-status={appointment.status}>
                                    {appointmentStatusLabels[
                                       appointment.status
                                    ] || 'Status unavailable'}
                                 </span>
                              </span>
                           </td>
                           <td data-label="Provider">
                              <span className="appointment-table-copy">
                                 <strong>{appointment.providerName}</strong>
                              </span>
                           </td>
                           <td data-label="Visit Type">
                              {appointment.visitType}
                           </td>
                           <td data-label="Insurance">
                              <StatusPill status={appointment.insuranceStatus}>
                                 {appointment.insuranceLabel}
                              </StatusPill>
                           </td>
                           <td data-label="Prior Auth">
                              <StatusPill
                                 status={appointment.priorAuthorizationStatus}>
                                 {appointment.priorAuthorizationLabel}
                              </StatusPill>
                           </td>
                           {showActions && (
                              <td data-label="Actions">
                                 <button
                                    className="button button-destructive appointment-cancel"
                                    type="button"
                                    disabled={busyId === appointment.id}
                                    onClick={() => void onCancel(appointment)}>
                                    <Icon name="close" />
                                    {busyId === appointment.id
                                       ? 'Cancelling…'
                                       : 'Cancel'}
                                 </button>
                              </td>
                           )}
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </section>
   );
}

export default PatientAppointments;
