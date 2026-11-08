import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   getAppointmentPreVisitData,
   getProviderSchedule,
   getStaffProviders,
} from '../../services/staffSchedule.js';
import { gsap, useGSAP } from '../../utils/portalGsap.js';

function todayInManila() {
   const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
   }).formatToParts(new Date());
   const values = Object.fromEntries(
      parts.map(({ type, value }) => [type, value]),
   );
   return `${values.year}-${values.month}-${values.day}`;
}

function plusDays(date, days) {
   const result = new Date(`${date}T12:00:00+08:00`);
   result.setDate(result.getDate() + days);
   return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
   }).format(result);
}

const dateLabel = (date, options) =>
   new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      ...options,
   }).format(new Date(`${date}T12:00:00+08:00`));
const timeLabel = (value) =>
   new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
   }).format(new Date(value));
const name = (first, last) =>
   [first, last].filter(Boolean).join(' ') || 'Patient record';
const statusLabel = (status) =>
   (status || 'scheduled')
      .replaceAll('_', ' ')
      .replace(/^./, (letter) => letter.toUpperCase());
const formatSummaryText = (summary) =>
   String(summary || '')
      .replace(/\\([*#])/g, '$1')
      .replace(/\s+\*\s+(?=\*\*[^*]+:\*\*)/g, '\n')
      .replace(/\s+\*\s+/g, '\n• ')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .replace(
         /(?:^|\n)\s*(?:pre-visit summary|pre-visit clinical summary)\s*(?=\n|$)/gi,
         '',
      )
      .replace(/\n{3,}/g, '\n\n')
      .trim();

function AppointmentDrawer({
   appointment,
   provider,
   selectedDate,
   onClose,
   closeButtonRef,
}) {
   const drawerRef = useRef(null);
   const [detail, setDetail] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(false);
   const { notify } = usePortalFeedback();

   useEffect(() => {
      let current = true;
      getAppointmentPreVisitData(appointment.id)
         .then((data) => {
            if (current) setDetail(data);
         })
         .catch(() => {
            if (current) {
               setError(true);
               notify({
                  type: 'error',
                  message: 'Pre-visit details could not load.',
               });
            }
         })
         .finally(() => {
            if (current) setLoading(false);
         });
      return () => {
         current = false;
      };
   }, [appointment.id, notify]);

   useGSAP(
      () => {
         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: reduce)', () =>
            gsap.set(drawerRef.current, { x: 0, autoAlpha: 1 }),
         );
         media.add('(prefers-reduced-motion: no-preference)', () =>
            gsap.fromTo(
               drawerRef.current,
               { x: 28, autoAlpha: 0 },
               { x: 0, autoAlpha: 1, duration: 0.24, ease: 'power2.out' },
            ),
         );
         return () => media.revert();
      },
      { scope: drawerRef },
   );

   return (
      <div
         className="staff-detail-backdrop"
         onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
         }}>
         <aside
            className="staff-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-detail-title"
            ref={drawerRef}>
            <header className="staff-detail-heading">
               <h2 id="staff-detail-title">
                  {name(
                     appointment.patientFirstName,
                     appointment.patientLastName,
                  )}{' '}
                  · {timeLabel(appointment.scheduledStart)}
               </h2>
               <button
                  className="staff-detail-close"
                  type="button"
                  ref={closeButtonRef}
                  aria-label="Close appointment details"
                  onClick={onClose}>
                  <Icon name="close" />
               </button>
            </header>
            <div className="staff-detail-body">
               <dl className="staff-detail-grid">
                  <div>
                     <dt>Visit type</dt>
                     <dd>{appointment.visitTypeName}</dd>
                  </div>
                  <div>
                     <dt>Time</dt>
                     <dd>
                        {timeLabel(appointment.scheduledStart)} –{' '}
                        {timeLabel(appointment.scheduledEnd)}
                     </dd>
                  </div>
                  <div>
                     <dt>Provider</dt>
                     <dd>
                        Dr. {provider.firstName} {provider.lastName}
                     </dd>
                  </div>
                  <div>
                     <dt>Date</dt>
                     <dd>
                        {dateLabel(selectedDate, {
                           month: 'short',
                           day: 'numeric',
                           year: 'numeric',
                        })}
                     </dd>
                  </div>
                  <div>
                     <dt>Appointment status</dt>
                     <dd>{statusLabel(appointment.status)}</dd>
                  </div>
                  <div>
                     <dt>Insurance</dt>
                     <dd>{statusLabel(appointment.insuranceStatus)}</dd>
                  </div>
                  <div>
                     <dt>Room</dt>
                     <dd>{appointment.roomName || 'Not assigned'}</dd>
                  </div>
                  <div>
                     <dt>Equipment</dt>
                     <dd>
                        {appointment.equipmentName ||
                           'Not required or assigned'}
                     </dd>
                  </div>
               </dl>
               <section className="staff-previsit-summary" aria-live="polite">
                  <h3>Pre-visit summary</h3>
                  {loading ? (
                     <p role="status">Preparing the patient chart summary…</p>
                  ) : error ? (
                     <p>
                        Pre-visit summary is unavailable. You can close this
                        panel and try again later.
                     </p>
                  ) : (
                     <>
                        <p className="staff-previsit-summary-text">
                           {formatSummaryText(detail?.preVisitSummary) ||
                              'No summary is available.'}
                        </p>
                        {detail?.clinicalData?.conditions?.length > 0 && (
                           <div>
                              <h4>Conditions</h4>
                              <ul>
                                 {detail.clinicalData.conditions.map((item) => (
                                    <li key={item.id}>
                                       {item.description || item.conditionCode}
                                       {item.resolvedDate
                                          ? ` · resolved ${dateLabel(String(item.resolvedDate).slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}`
                                          : ''}
                                    </li>
                                 ))}
                              </ul>
                           </div>
                        )}
                        {detail?.clinicalData?.recentLabs?.length > 0 && (
                           <div>
                              <h4>Recent labs</h4>
                              <ul>
                                 {detail.clinicalData.recentLabs
                                    .slice(0, 5)
                                    .map((item) => (
                                       <li key={item.id}>
                                          {item.testName}:{' '}
                                          {[item.resultValue, item.unit]
                                             .filter(Boolean)
                                             .join(' ') ||
                                             'Result not recorded'}
                                          {item.resultDate
                                             ? ` · ${dateLabel(String(item.resultDate).slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}`
                                             : ''}
                                       </li>
                                    ))}
                              </ul>
                           </div>
                        )}
                        {detail?.clinicalData?.activeMedications?.length >
                           0 && (
                           <div>
                              <h4>Active medications</h4>
                              <ul>
                                 {detail.clinicalData.activeMedications
                                    .slice(0, 5)
                                    .map((item) => (
                                       <li key={item.id}>
                                          {item.medicationName}
                                          {item.dose ? ` · ${item.dose}` : ''}
                                       </li>
                                    ))}
                              </ul>
                           </div>
                        )}
                     </>
                  )}
               </section>
            </div>
         </aside>
      </div>
   );
}

function StaffSchedule() {
   const [searchParams, setSearchParams] = useSearchParams();
   const [requestedProviderId] = useState(
      () => Number(searchParams.get('provider')) || null,
   );
   const [providers, setProviders] = useState(null);
   const [providerId, setProviderId] = useState(requestedProviderId);
   const [selectedDate, setSelectedDate] = useState(todayInManila);
   const [view, setView] = useState('day');
   const [providerLoadError, setProviderLoadError] = useState(false);
   const [scheduleResult, setScheduleResult] = useState(null);
   const scheduleKey = JSON.stringify([providerId, selectedDate, view]);
   const hasScheduleResult = scheduleResult?.key === scheduleKey;
   const appointments = hasScheduleResult ? scheduleResult.appointments : null;
   const scheduleError = hasScheduleResult && scheduleResult.error;
   const [selectedAppointment, setSelectedAppointment] = useState(null);
   const pageRef = useRef(null);
   const closeButtonRef = useRef(null);
   const appointmentButtonRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(appointments));

   useEffect(() => {
      let current = true;
      getStaffProviders()
         .then((list) => {
            if (!current) return;
            setProviders(list);
            const fromUrl = requestedProviderId;
            setProviderId(
               list.some((provider) => provider.id === fromUrl)
                  ? fromUrl
                  : (list[0]?.id ?? null),
            );
         })
         .catch(() => {
            if (current) setProviderLoadError(true);
         });
      return () => {
         current = false;
      };
   }, [requestedProviderId]);

   useEffect(() => {
      if (!providerId || !selectedDate) return undefined;
      let current = true;
      const start = `${selectedDate}T00:00:00.000+08:00`;
      const endDate =
         view === 'week' ? plusDays(selectedDate, 6) : selectedDate;
      const end = `${endDate}T23:59:59.999+08:00`;
      getProviderSchedule(
         providerId,
         view === 'week' ? { start, end } : { date: selectedDate },
      )
         .then((list) => {
            if (current)
               setScheduleResult({
                  key: scheduleKey,
                  appointments: list,
                  error: false,
               });
         })
         .catch(() => {
            if (current)
               setScheduleResult({
                  key: scheduleKey,
                  appointments: [],
                  error: true,
               });
         });
      return () => {
         current = false;
      };
   }, [providerId, scheduleKey, selectedDate, view]);

   useEffect(() => {
      if (!selectedAppointment) return undefined;
      const previousOverflow = document.body.style.overflow;
      const closeOnEscape = (event) => {
         if (event.key === 'Escape') setSelectedAppointment(null);
      };
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', closeOnEscape);
      closeButtonRef.current?.focus();
      return () => {
         document.body.style.overflow = previousOverflow;
         document.removeEventListener('keydown', closeOnEscape);
         appointmentButtonRef.current?.focus();
      };
   }, [selectedAppointment]);

   const selectedProvider = providers?.find(
      (provider) => provider.id === providerId,
   );
   const weekDays = useMemo(
      () =>
         Array.from({ length: 7 }, (_, index) => {
            const date = plusDays(selectedDate, index);
            return {
               date,
               day: dateLabel(date, { weekday: 'short' }),
               dateNumber: dateLabel(date, { day: 'numeric' }),
               count: (appointments || []).filter(
                  (appointment) =>
                     new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                     }).format(new Date(appointment.scheduledStart)) === date,
               ).length,
            };
         }),
      [appointments, selectedDate],
   );

   if (providerLoadError || scheduleError)
      return (
         <ErrorState
            title="The provider schedule couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!providers || !appointments)
      return (
         <LoadingSkeleton variant="schedule" label="the provider schedule" />
      );
   if (!selectedProvider)
      return (
         <section className="staff-schedule-page">
            <header className="staff-schedule-heading">
               <h1>Provider Schedule</h1>
               <p>No active providers were returned by the clinic.</p>
            </header>
         </section>
      );

   return (
      <div className="staff-schedule-page" ref={pageRef}>
         <header className="staff-schedule-heading">
            <h1>Provider Schedule</h1>
            <p>View and coordinate appointments across the clinic.</p>
         </header>
         <div className="staff-schedule-controls">
            <div
               className="schedule-provider-tabs"
               role="group"
               aria-label="Select provider">
               {providers.map((provider) => (
                  <button
                     className={
                        selectedProvider.id === provider.id ? 'selected' : ''
                     }
                     type="button"
                     key={provider.id}
                     aria-pressed={selectedProvider.id === provider.id}
                     onClick={() => {
                        setProviderId(provider.id);
                        setSearchParams(
                           { provider: String(provider.id) },
                           { replace: true },
                        );
                        setSelectedAppointment(null);
                     }}>
                     Dr. {provider.firstName} {provider.lastName}
                  </button>
               ))}
            </div>
            <label className="staff-date-field">
               Date
               <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
               />
            </label>
            <div
               className="schedule-view-toggle"
               role="group"
               aria-label="Schedule view">
               {['day', 'week'].map((option) => (
                  <button
                     className={view === option ? 'selected' : ''}
                     type="button"
                     key={option}
                     aria-pressed={view === option}
                     onClick={() => {
                        setView(option);
                        setSelectedAppointment(null);
                     }}>
                     {option === 'day' ? 'Day' : 'Week'}
                  </button>
               ))}
            </div>
         </div>
         <section
            className="schedule-provider-summary"
            aria-label="Selected provider">
            <span className="schedule-provider-avatar">{`${selectedProvider.firstName?.[0] || ''}${selectedProvider.lastName?.[0] || ''}`}</span>
            <div className="schedule-provider-copy">
               <strong>
                  Dr. {selectedProvider.firstName} {selectedProvider.lastName}
               </strong>
               <span>
                  {selectedProvider.specialty || 'Provider'} ·{' '}
                  {appointments.length} appointments{' '}
                  {view === 'day' ? 'on this day' : 'this week'}
               </span>
            </div>
            <time>
               {view === 'day'
                  ? dateLabel(selectedDate, {
                       month: 'short',
                       day: 'numeric',
                       year: 'numeric',
                       weekday: 'long',
                    })
                  : `${dateLabel(selectedDate, { month: 'short', day: 'numeric' })} – ${dateLabel(plusDays(selectedDate, 6), { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </time>
         </section>
         {view === 'day' ? (
            <section
               className="schedule-appointment-list"
               aria-label={`Dr. ${selectedProvider.firstName} ${selectedProvider.lastName} appointments`}>
               {appointments.length ? (
                  appointments.map((appointment) => (
                     <button
                        className="schedule-appointment"
                        type="button"
                        key={appointment.id}
                        aria-haspopup="dialog"
                        aria-label={`${timeLabel(appointment.scheduledStart)}, ${name(appointment.patientFirstName, appointment.patientLastName)}, ${appointment.visitTypeName}, ${statusLabel(appointment.status)}`}
                        onClick={(event) => {
                           appointmentButtonRef.current = event.currentTarget;
                           setSelectedAppointment(appointment);
                        }}>
                        <time>{timeLabel(appointment.scheduledStart)}</time>
                        <span className="schedule-appointment-marker" />
                        <span className="schedule-appointment-copy">
                           <strong>
                              {name(
                                 appointment.patientFirstName,
                                 appointment.patientLastName,
                              )}
                           </strong>
                           <span>{appointment.visitTypeName}</span>
                        </span>
                        <span
                           className={`schedule-checkin ${appointment.status === 'completed' ? 'complete' : 'pending'}`}>
                           {statusLabel(appointment.status)}
                        </span>
                        <Icon name="chevron-right" />
                     </button>
                  ))
               ) : (
                  <p className="staff-record-empty schedule-empty-state">
                     No appointments are scheduled for this provider on this
                     date.
                  </p>
               )}
            </section>
         ) : (
            <section
               className="schedule-week-view"
               aria-label="Weekly appointment counts">
               <header>
                  <h2>
                     Week of{' '}
                     {dateLabel(selectedDate, {
                        month: 'long',
                        day: 'numeric',
                     })}
                  </h2>
                  <p>Appointments scheduled each day</p>
               </header>
               <div className="schedule-week-grid">
                  {weekDays.map((day) => (
                     <article className="schedule-week-day" key={day.date}>
                        <span>{day.day}</span>
                        <strong>{day.dateNumber}</strong>
                        <b>{day.count}</b>
                        <small>appointments</small>
                     </article>
                  ))}
               </div>
            </section>
         )}
         {selectedAppointment && (
            <AppointmentDrawer
               key={selectedAppointment.id}
               appointment={selectedAppointment}
               provider={selectedProvider}
               selectedDate={selectedDate}
               onClose={() => setSelectedAppointment(null)}
               closeButtonRef={closeButtonRef}
            />
         )}
      </div>
   );
}

export default StaffSchedule;
