import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import AppointmentCancelDialog from '../../components/AppointmentCancelDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import {
   StatCard,
   WaitlistRow,
} from '../../components/PatientDashboardWidgets.jsx';
import { cancelPatientAppointment } from '../../services/patientAppointments.js';
import { getPatientDashboard } from '../../services/patientDashboard.js';
import { formatRemaining } from '../../services/patientDates.js';
import { usePortalFeedback } from '../../contexts/PortalFeedbackContext.jsx';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   confirmWaitlistOffer,
   declineWaitlistOffer,
} from '../../services/patientWaitlist.js';

function PatientDashboard() {
   const { user } = useOutletContext();
   const [dashboard, setDashboard] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
   const [busyAction, setBusyAction] = useState('');
   const [appointmentToCancel, setAppointmentToCancel] = useState(null);
   const [clock, setClock] = useState(Date.now());
   const pageRef = useRef(null);
   const { notify } = usePortalFeedback();
   usePortalPageReveal(pageRef, Boolean(dashboard) && !isLoading);

   useEffect(() => {
      let current = true;
      getPatientDashboard()
         .then((data) => {
            if (current) setDashboard(data);
         })
         .catch(() => {
            if (current) setHasError(true);
         })
         .finally(() => {
            if (current) setIsLoading(false);
         });
      return () => {
         current = false;
      };
   }, []);

   useEffect(() => {
      if (!dashboard?.offeredSlot) return undefined;
      const interval = window.setInterval(() => setClock(Date.now()), 1000);
      return () => window.clearInterval(interval);
   }, [dashboard?.offeredSlot?.id]);

   const refreshDashboard = async () => {
      const nextDashboard = await getPatientDashboard();
      setDashboard(nextDashboard);
      setHasError(false);
   };

   const respondToOffer = async (action) => {
      const offer = dashboard?.offeredSlot;
      if (!offer) return;
      setBusyAction(action);
      try {
         if (action === 'confirm') {
            await confirmWaitlistOffer(offer.id);
            notify({ type: 'success', message: 'Appointment confirmed.' });
         } else {
            await declineWaitlistOffer(offer.id);
            notify({ type: 'success', message: 'Offer declined.' });
         }
         await refreshDashboard();
      } catch (error) {
         notify({
            type: 'error',
            message:
               error.message ||
               'We could not update this offer. Please try again.',
         });
         if (error.status === 409) await refreshDashboard().catch(() => {});
      } finally {
         setBusyAction('');
      }
   };

   const cancelUpcomingAppointment = async () => {
      const appointment = appointmentToCancel;
      if (!appointment) return;
      setBusyAction('cancel');
      try {
         await cancelPatientAppointment(appointment.id);
         await refreshDashboard();
         notify({ type: 'success', message: 'Appointment cancelled.' });
      } catch (error) {
         notify({
            type: 'error',
            message:
               error.message ||
               'We could not cancel this appointment. Please try again.',
         });
      } finally {
         setBusyAction('');
         setAppointmentToCancel(null);
      }
   };

   if (isLoading) {
      return (
         <LoadingSkeleton variant="patient-dashboard" label="your dashboard" />
      );
   }

   if (hasError || !dashboard) {
      return (
         <ErrorState
            title="Your dashboard couldn’t load"
            message="Check your connection and try again. Your account data is unchanged."
            retryLabel="Try again"
            onRetry={() => {
               setIsLoading(true);
               setHasError(false);
               getPatientDashboard()
                  .then(setDashboard)
                  .catch(() => setHasError(true))
                  .finally(() => setIsLoading(false));
            }}
         />
      );
   }

   const {
      dateLabel,
      offeredSlot,
      upcomingAppointment,
      waitlistEntries,
      summaryCards,
   } = dashboard;
   const firstName = user?.displayName?.trim().split(/\s+/)[0] || 'there';
   const hour = Number(
      new Intl.DateTimeFormat('en-US', {
         timeZone: 'Asia/Manila',
         hour: 'numeric',
         hourCycle: 'h23',
      }).format(new Date()),
   );
   const greeting =
      hour < 12
         ? 'Good morning'
         : hour < 18
           ? 'Good afternoon'
           : 'Good evening';

   return (
      <div className="dashboard" ref={pageRef}>
         <AppointmentCancelDialog
            appointment={appointmentToCancel}
            busy={busyAction === 'cancel'}
            onCancel={() => setAppointmentToCancel(null)}
            onConfirm={() => void cancelUpcomingAppointment()}
         />
         <section className="welcome-row">
            <div>
               <h1>
                  {greeting}, {firstName}
               </h1>
               <p>{dateLabel}</p>
            </div>
            <div className="welcome-actions">
               <Link className="button button-outline" to="/patient/bills">
                  <Icon name="upload" />
                  Upload a Bill
               </Link>
               <Link className="button button-primary" to="/patient/book">
                  <Icon name="calendar" />
                  Book an Appointment
               </Link>
            </div>
         </section>

         <div className="stats-grid">
            {summaryCards.map((stat) => (
               <StatCard key={stat.title} stat={stat} />
            ))}
         </div>

         {offeredSlot && (
            <section className="offer-card" aria-labelledby="offer-title">
               <div className="offer-details">
                  <StatusPill status={offeredSlot.status}>Offered</StatusPill>
                  <h2 id="offer-title">A slot opened up for you</h2>
                  <strong>{offeredSlot.providerName}</strong>
                  <p>
                     {offeredSlot.visitType} · {offeredSlot.dateTimeLabel}
                  </p>
               </div>
               <div className="offer-actions">
                  <span className="countdown">
                     <Icon name="timer" />
                     {formatRemaining(offeredSlot.offerExpiresAt, clock)}{' '}
                     <span>remaining</span>
                  </span>
                  <p>
                     Confirm before the timer ends or the slot goes to the next
                     patient.
                  </p>
                  <div className="button-row">
                     <button
                        className="button button-primary"
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => void respondToOffer('confirm')}>
                        {busyAction === 'confirm'
                           ? 'Confirming…'
                           : 'Confirm Slot'}
                     </button>
                     <button
                        className="button button-light"
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => void respondToOffer('decline')}>
                        {busyAction === 'decline' ? 'Declining…' : 'Decline'}
                     </button>
                  </div>
               </div>
            </section>
         )}

         <div className="dashboard-grid">
            <section
               className="panel appointment-panel"
               aria-labelledby="appointment-heading">
               <div className="panel-heading">
                  <h2 id="appointment-heading">Upcoming appointment</h2>
                  <Link className="text-link" to="/patient/appointments">
                     View all <span aria-hidden="true">→</span>
                  </Link>
               </div>
               {upcomingAppointment ? (
                  <>
                     <div className="appointment-details">
                        <div className="date-tile">
                           <span>{upcomingAppointment.monthLabel}</span>
                           <strong>{upcomingAppointment.dayLabel}</strong>
                        </div>
                        <div className="appointment-copy">
                           <strong>{upcomingAppointment.providerName}</strong>
                           <p>{upcomingAppointment.visitDescription}</p>
                           <strong className="appointment-time">
                              {upcomingAppointment.timeLabel}
                           </strong>
                           <button
                              className="calendar-link"
                              type="button"
                              onClick={() =>
                                 downloadCalendarFile(upcomingAppointment)
                              }>
                              <Icon name="plus" />
                              Add to calendar
                           </button>
                           <div className="coverage-row">
                              <span>Insurance</span>
                              <StatusPill
                                 status={upcomingAppointment.insuranceStatus}>
                                 {upcomingAppointment.insuranceLabel}
                              </StatusPill>
                              <span className="prior-auth-label">
                                 Prior auth
                              </span>
                              <StatusPill
                                 status={
                                    upcomingAppointment.priorAuthorizationStatus
                                 }>
                                 {upcomingAppointment.priorAuthorizationLabel}
                              </StatusPill>
                           </div>
                        </div>
                     </div>
                     <div className="appointment-footer">
                        <Link
                           className="button button-light"
                           to="/patient/book">
                           Reschedule
                        </Link>
                        <button
                           className="button button-quiet"
                           type="button"
                           disabled={Boolean(busyAction)}
                           onClick={() =>
                              setAppointmentToCancel(upcomingAppointment)
                           }>
                           {busyAction === 'cancel' ? 'Cancelling…' : 'Cancel'}
                        </button>
                     </div>
                  </>
               ) : (
                  <div className="dashboard-empty">
                     <p>You don’t have an upcoming appointment.</p>
                     <Link className="button button-outline" to="/patient/book">
                        Book an appointment
                     </Link>
                  </div>
               )}
            </section>

            <section
               className="panel waitlist-panel"
               aria-labelledby="waitlist-heading">
               <div className="panel-heading">
                  <h2 id="waitlist-heading">Active waitlist</h2>
                  <Link
                     className="button button-outline button-small"
                     to="/patient/waitlist">
                     Manage <span aria-hidden="true">→</span>
                  </Link>
               </div>
               {waitlistEntries.length ? (
                  <div className="waitlist-items">
                     {waitlistEntries.map((entry) => (
                        <WaitlistRow key={entry.id} entry={entry} />
                     ))}
                  </div>
               ) : (
                  <div className="dashboard-empty">
                     <p>You’re not on a waitlist.</p>
                  </div>
               )}
               <Link
                  className="button button-light join-button"
                  to="/patient/waitlist">
                  <Icon name="plus" />
                  Join Waitlist
               </Link>
            </section>
         </div>
      </div>
   );
}

function downloadCalendarFile(appointment) {
   const formatIcsDate = (value) =>
      new Date(value)
         .toISOString()
         .replace(/[-:]/g, '')
         .replace(/\.\d{3}/, '');
   const escapeIcsText = (value) =>
      String(value)
         .replace(/\\/g, '\\\\')
         .replace(/;/g, '\\;')
         .replace(/,/g, '\\,')
         .replace(/\n/g, '\\n');
   const event = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JuanAccess//Patient Portal//EN',
      'BEGIN:VEVENT',
      'UID:appointment-' + appointment.id + '@juanaccess',
      'DTSTAMP:' + formatIcsDate(new Date()),
      'DTSTART:' + formatIcsDate(appointment.scheduledStart),
      'DTEND:' + formatIcsDate(appointment.scheduledEnd),
      'SUMMARY:' +
         escapeIcsText(
            appointment.visitType + ' with ' + appointment.providerName,
         ),
      'END:VEVENT',
      'END:VCALENDAR',
   ].join('\r\n');
   const url = URL.createObjectURL(
      new Blob([event], { type: 'text/calendar;charset=utf-8' }),
   );
   const link = document.createElement('a');
   link.href = url;
   link.download = 'juanaccess-appointment-' + appointment.id + '.ics';
   document.body.append(link);
   link.click();
   link.remove();
   window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default PatientDashboard;
