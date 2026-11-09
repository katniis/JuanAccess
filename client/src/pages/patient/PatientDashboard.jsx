import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import AppointmentCancelDialog from '../../components/AppointmentCancelDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import StatusGuide from '../../components/StatusGuide.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import {
   StatCard,
   WaitlistRow,
} from '../../components/PatientDashboardWidgets.jsx';
import { cancelPatientAppointment } from '../../services/patientAppointments.js';
import { getPatientDashboard } from '../../services/patientDashboard.js';
import {
   formatClinicDate,
   formatClinicTime,
   formatRemaining,
} from '../../services/patientDates.js';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   confirmWaitlistOffer,
   declineWaitlistOffer,
} from '../../services/patientWaitlist.js';

const ACTIVITY_PER_PAGE = 3;
const mascotAnimations = [
   {
      name: 'wave',
      sprite: '/images/mascot-explorations/mascot-wave-loop.png',
   },
   {
      name: 'cheer',
      sprite: '/images/mascot-explorations/mascot-cheer-loop.png',
   },
   {
      name: 'clap',
      sprite: '/images/mascot-explorations/mascot-clap-loop.png',
   },
   {
      name: 'thoughtful',
      sprite: '/images/mascot-explorations/mascot-thoughtful-loop.png',
   },
];

function PatientDashboard() {
   const { user } = useOutletContext();
   const [dashboard, setDashboard] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
   const [busyAction, setBusyAction] = useState('');
   const [appointmentToCancel, setAppointmentToCancel] = useState(null);
   const [activityPage, setActivityPage] = useState(1);
   const [clock, setClock] = useState(0);
   const [mascotAnimation] = useState(
      () =>
         mascotAnimations[Math.floor(Math.random() * mascotAnimations.length)],
   );
   const pageRef = useRef(null);
   const { notify } = usePortalFeedback();
   usePortalPageReveal(pageRef, Boolean(dashboard) && !isLoading);

   useEffect(() => {
      let current = true;
      getPatientDashboard()
         .then((data) => {
            if (current) {
               setDashboard(data);
               setClock(Date.now());
            }
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

   const offeredSlotId = dashboard?.offeredSlot?.id;

   useEffect(() => {
      if (!offeredSlotId) return undefined;
      const interval = window.setInterval(() => setClock(Date.now()), 1000);
      return () => window.clearInterval(interval);
   }, [offeredSlotId]);

   const refreshDashboard = async () => {
      const nextDashboard = await getPatientDashboard();
      setDashboard(nextDashboard);
      setClock(Date.now());
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
                  .then((nextDashboard) => {
                     setDashboard(nextDashboard);
                     setClock(Date.now());
                  })
                  .catch(() => setHasError(true))
                  .finally(() => setIsLoading(false));
            }}
         />
      );
   }

   const {
      offeredSlot,
      upcomingAppointment,
      summaryCards,
      waitlistEntries = [],
      recentActivity = [],
   } = dashboard;
   const activityPageCount = Math.ceil(
      recentActivity.length / ACTIVITY_PER_PAGE,
   );
   const currentActivityPage = Math.min(activityPage, activityPageCount || 1);
   const activityPageStart = (currentActivityPage - 1) * ACTIVITY_PER_PAGE;
   const visibleActivity = recentActivity.slice(
      activityPageStart,
      activityPageStart + ACTIVITY_PER_PAGE,
   );
   const insuranceNeedsReview = Boolean(
      upcomingAppointment && upcomingAppointment.insuranceLabel !== 'Active',
   );
   const insuranceTaskTitle =
      {
         Unverified: 'Verify insurance information',
         Inactive: 'Update insurance information',
         Unknown: 'Confirm insurance information',
      }[upcomingAppointment?.insuranceLabel] || 'Insurance information on file';
   const priorAuthorizationStatus =
      upcomingAppointment?.priorAuthorizationStatus;
   const priorAuthorizationReady = ['approved', 'not-required'].includes(
      priorAuthorizationStatus,
   );
   const priorAuthorizationDenied = priorAuthorizationStatus === 'denied';
   const priorAuthorizationTone = priorAuthorizationReady
      ? 'complete'
      : priorAuthorizationDenied
        ? 'attention'
        : 'pending';
   const priorAuthorizationIcon = priorAuthorizationReady
      ? 'check'
      : priorAuthorizationDenied
        ? 'alert'
        : 'clock';
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
            <div className="dashboard-welcome-banner">
               <div className="dashboard-welcome-copy">
                  <h1>
                     {greeting}, {firstName}!
                  </h1>
                  <p>Here’s a quick overview of your care with JuanAccess.</p>
               </div>
               <div className="dashboard-mascot" aria-hidden="true">
                  <span
                     className="dashboard-mascot-sprite"
                     data-mascot-animation={mascotAnimation.name}
                     style={{
                        '--mascot-sprite': `url('${mascotAnimation.sprite}')`,
                     }}
                  />
               </div>
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
                        className="button button-destructive"
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => void respondToOffer('decline')}>
                        {busyAction === 'decline' ? 'Declining…' : 'Decline'}
                     </button>
                  </div>
               </div>
            </section>
         )}

         <div className="dashboard-grid dashboard-primary-grid">
            <section
               className="panel appointment-panel"
               aria-labelledby="appointment-heading">
               <div className="panel-heading">
                  <h2 id="appointment-heading">Upcoming appointment</h2>
                  <Link className="text-link" to="/patient/appointments">
                     View all <Icon name="chevron-right" />
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
                              <span className="coverage-label-with-guide">
                                 Insurance
                              </span>
                              <span className="coverage-status-with-guide">
                                 <StatusPill
                                    status={
                                       upcomingAppointment.insuranceStatus
                                    }>
                                    {upcomingAppointment.insuranceLabel}
                                 </StatusPill>
                                 <StatusGuide
                                    type="insurance"
                                    statusLabel={
                                       upcomingAppointment.insuranceLabel
                                    }
                                    description={
                                       upcomingAppointment.insuranceDescription
                                    }
                                 />
                              </span>
                              <span className="coverage-label-with-guide prior-auth-label">
                                 Prior auth
                              </span>
                              <span className="coverage-status-with-guide">
                                 <StatusPill
                                    status={
                                       upcomingAppointment.priorAuthorizationStatus
                                    }>
                                    {
                                       upcomingAppointment.priorAuthorizationLabel
                                    }
                                 </StatusPill>
                                 <StatusGuide
                                    type="priorAuth"
                                    align="end"
                                    statusLabel={
                                       upcomingAppointment.priorAuthorizationLabel
                                    }
                                    description={
                                       upcomingAppointment.priorAuthorizationDescription
                                    }
                                 />
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="appointment-footer">
                        <Link
                           className="button button-primary"
                           to="/patient/book">
                           Reschedule
                        </Link>
                        <button
                           className="button button-destructive"
                           type="button"
                           disabled={Boolean(busyAction)}
                           onClick={() =>
                              setAppointmentToCancel(upcomingAppointment)
                           }>
                           <Icon name="calendar" />
                           {busyAction === 'cancel'
                              ? 'Cancelling…'
                              : 'Cancel Appointment'}
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
               className="panel dashboard-waitlist-panel"
               aria-labelledby="waitlist-heading">
               <div className="panel-heading">
                  <h2 id="waitlist-heading">Active waitlist</h2>
                  <Link
                     className="button button-outline button-small"
                     to="/patient/waitlist">
                     Manage <Icon name="chevron-right" />
                  </Link>
               </div>
               {waitlistEntries.length ? (
                  <div className="dashboard-waitlist-items">
                     {waitlistEntries.map((entry) => (
                        <WaitlistRow key={entry.id} entry={entry} />
                     ))}
                  </div>
               ) : (
                  <div className="dashboard-waitlist-empty">
                     <span className="dashboard-waitlist-empty-icon">
                        <Icon name="clock" />
                     </span>
                     <strong>You’re not on a waitlist.</strong>
                     <span>Join to hear about earlier appointments.</span>
                  </div>
               )}
               <Link
                  className="button button-light dashboard-waitlist-join"
                  to="/patient/waitlist">
                  <Icon name="plus" />
                  Join Waitlist
               </Link>
            </section>
         </div>

         <div
            className={
               'dashboard-grid dashboard-lower-grid' +
               (upcomingAppointment ? '' : ' no-upcoming')
            }>
            <section
               className="panel activity-panel"
               aria-labelledby="activity-heading">
               <div className="panel-heading">
                  <h2 id="activity-heading">Recent activity</h2>
               </div>
               {recentActivity.length ? (
                  <>
                     <ul className="activity-list" id="recent-activity-list">
                        {visibleActivity.map((activity) => (
                           <li key={activity.id}>
                              <Link
                                 className="activity-item"
                                 to={activity.href}>
                                 <span className="activity-icon">
                                    <Icon name={activity.icon} />
                                 </span>
                                 <span className="activity-copy">
                                    <strong>{activity.title}</strong>
                                    <span>{activity.description}</span>
                                 </span>
                                 <time dateTime={activity.occurredAt}>
                                    <span>
                                       {formatClinicDate(activity.occurredAt)}
                                    </span>
                                    <span>
                                       {formatClinicTime(activity.occurredAt)}
                                    </span>
                                 </time>
                              </Link>
                           </li>
                        ))}
                     </ul>
                     {activityPageCount > 1 && (
                        <div className="appointments-pagination">
                           <span aria-live="polite">
                              Showing {activityPageStart + 1}–
                              {Math.min(
                                 activityPageStart + ACTIVITY_PER_PAGE,
                                 recentActivity.length,
                              )}{' '}
                              of {recentActivity.length}
                           </span>
                           <nav aria-label="Recent activity pages">
                              <button
                                 className="button button-quiet"
                                 type="button"
                                 aria-label="Previous activity page"
                                 disabled={currentActivityPage === 1}
                                 onClick={() =>
                                    setActivityPage(currentActivityPage - 1)
                                 }>
                                 <Icon name="chevron-left" />
                                 Previous
                              </button>
                              <span>
                                 Page {currentActivityPage} of{' '}
                                 {activityPageCount}
                              </span>
                              <button
                                 className="button button-quiet"
                                 type="button"
                                 aria-label="Next activity page"
                                 disabled={
                                    currentActivityPage === activityPageCount
                                 }
                                 onClick={() =>
                                    setActivityPage(currentActivityPage + 1)
                                 }>
                                 Next
                                 <Icon name="chevron-right" />
                              </button>
                           </nav>
                        </div>
                     )}
                  </>
               ) : (
                  <div className="activity-empty">
                     <span className="activity-empty-icon">
                        <Icon name="clock" />
                     </span>
                     <p>No recent activity yet.</p>
                     <span>
                        Your appointments, bills, and coverage updates will
                        appear here.
                     </span>
                  </div>
               )}
            </section>

            {upcomingAppointment && (
               <section
                  className="panel before-visit-panel"
                  aria-labelledby="before-visit-heading">
                  <div className="panel-heading before-visit-heading">
                     <div>
                        <h2 id="before-visit-heading">Before your visit</h2>
                        <p>
                           Complete these to make your appointment smooth and
                           hassle-free.
                        </p>
                     </div>
                  </div>
                  <div className="before-visit-content">
                     <ul className="before-visit-list">
                        <li
                           className={
                              'before-visit-item ' +
                              (insuranceNeedsReview ? 'attention' : 'complete')
                           }>
                           <div className="before-visit-top">
                              <span className="before-visit-icon">
                                 <Icon
                                    name={
                                       insuranceNeedsReview ? 'alert' : 'check'
                                    }
                                 />
                              </span>
                              <span className="before-visit-category">
                                 Insurance
                              </span>
                           </div>
                           <span className="before-visit-copy">
                              <strong>{insuranceTaskTitle}</strong>
                              <span>
                                 {upcomingAppointment.insuranceDescription}
                              </span>
                           </span>
                           <div className="before-visit-footer">
                              <StatusPill
                                 status={upcomingAppointment.insuranceStatus}>
                                 {upcomingAppointment.insuranceLabel}
                              </StatusPill>
                              {insuranceNeedsReview && (
                                 <Link
                                    className="text-link before-visit-action"
                                    to="/patient/settings">
                                    Review <Icon name="chevron-right" />
                                 </Link>
                              )}
                           </div>
                        </li>
                        <li className="before-visit-item complete">
                           <div className="before-visit-top">
                              <span className="before-visit-icon">
                                 <Icon name="calendar" />
                              </span>
                              <span className="before-visit-category">
                                 Visit
                              </span>
                           </div>
                           <span className="before-visit-copy">
                              <strong>Appointment scheduled</strong>
                              <span>
                                 {upcomingAppointment.providerName} ·{' '}
                                 {upcomingAppointment.visitDescription}
                              </span>
                           </span>
                           <div className="before-visit-footer before-visit-appointment-footer">
                              <span className="before-visit-appointment-meta">
                                 <strong>Scheduled</strong>
                                 <span>
                                    {upcomingAppointment.dateLabel} ·{' '}
                                    {upcomingAppointment.timeLabel}
                                 </span>
                              </span>
                           </div>
                        </li>
                        <li
                           className={
                              'before-visit-item ' + priorAuthorizationTone
                           }>
                           <div className="before-visit-top">
                              <span className="before-visit-icon">
                                 <Icon name={priorAuthorizationIcon} />
                              </span>
                              <span className="before-visit-category">
                                 Prior authorization
                              </span>
                           </div>
                           <span className="before-visit-copy">
                              <strong>Authorization status</strong>
                              <span>
                                 {
                                    upcomingAppointment.priorAuthorizationDescription
                                 }
                              </span>
                           </span>
                           <div className="before-visit-footer">
                              <StatusPill
                                 status={
                                    upcomingAppointment.priorAuthorizationStatus
                                 }>
                                 {upcomingAppointment.priorAuthorizationLabel}
                              </StatusPill>
                           </div>
                        </li>
                     </ul>
                  </div>
               </section>
            )}
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
