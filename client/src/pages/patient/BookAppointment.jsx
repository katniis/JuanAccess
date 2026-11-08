import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import PortalActionProgress from '../../components/PortalActionProgress.jsx';
import {
   findAvailableAppointments,
   getAppointmentVisitTypes,
   bookAppointment,
} from '../../services/appointmentBooking.js';
import { getMyPriorAuthorizationStatuses } from '../../services/patientAppointments.js';
import { formatClinicDateTime } from '../../services/patientDates.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const timePeriods = [
   {
      id: 'morning',
      label: 'Morning',
      hours: '8:00 AM – 12:00 PM',
      icon: 'sun',
   },
   {
      id: 'afternoon',
      label: 'Afternoon',
      hours: '12:00 PM – 5:00 PM',
      icon: 'sun',
   },
   {
      id: 'evening',
      label: 'Evening',
      hours: '5:00 PM – 7:00 PM',
      icon: 'moon',
   },
];

function BookAppointment() {
   const [visitTypes, setVisitTypes] = useState([]);
   const [selectedVisitType, setSelectedVisitType] = useState(null);
   const [selectedDateKeys, setSelectedDateKeys] = useState([]);
   const [timePeriod, setTimePeriod] = useState(null);
   const [slots, setSlots] = useState([]);
   const [selectedSlot, setSelectedSlot] = useState(null);
   const [step, setStep] = useState(0);
   const [visibleMonth, setVisibleMonth] = useState(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
   });
   const [loading, setLoading] = useState(true);
   const [isSearching, setIsSearching] = useState(false);
   const [isBooking, setIsBooking] = useState(false);
   const [bookingConfirmed, setBookingConfirmed] = useState(false);
   const [error, setError] = useState('');
   const [booked, setBooked] = useState(false);
   const [bookingResult, setBookingResult] = useState(null);
   const [bookingStage, setBookingStage] = useState(0);
   const [authDraftStatus, setAuthDraftStatus] = useState(null);
   const pageRef = useRef(null);
   usePortalPageReveal(pageRef, booked || !loading, booked);

   useEffect(() => {
      let current = true;

      getAppointmentVisitTypes()
         .then((types) => {
            if (current) setVisitTypes(types);
         })
         .catch(() => {
            if (current)
               setError('Visit types could not be loaded. Please try again.');
         })
         .finally(() => {
            if (current) setLoading(false);
         });

      return () => {
         current = false;
      };
   }, []);

   useEffect(() => {
      if (!isBooking) return undefined;
      const interval = window.setInterval(() => {
         setBookingStage((current) => Math.min(current + 1, 2));
      }, 1700);
      return () => window.clearInterval(interval);
   }, [isBooking]);

   useEffect(() => {
      if (!bookingConfirmed) return undefined;
      const timeout = window.setTimeout(() => {
         setBookingConfirmed(false);
         setBooked(true);
      }, 650);
      return () => window.clearTimeout(timeout);
   }, [bookingConfirmed]);

   useEffect(() => {
      if (!booked || bookingResult?.priorAuthorizationStatus !== 'needs_draft')
         return undefined;
      let current = true;
      let timeout;
      const startedAt = Date.now();

      const checkStatus = async () => {
         try {
            const statuses = await getMyPriorAuthorizationStatuses();
            if (!current) return;
            const status = statuses.find(
               (item) => item.appointmentId === bookingResult.id,
            )?.status;
            if (status && status !== 'needs_draft') {
               setAuthDraftStatus(status);
               return;
            }
         } catch {
            // The appointment is already booked; keep the patient informed while status remains unavailable.
         }
         if (!current) return;
         if (Date.now() - startedAt >= 30000) {
            setAuthDraftStatus('continuing');
            return;
         }
         timeout = window.setTimeout(checkStatus, 3000);
      };

      void checkStatus();
      return () => {
         current = false;
         window.clearTimeout(timeout);
      };
   }, [booked, bookingResult?.id, bookingResult?.priorAuthorizationStatus]);

   const selectDate = (dateKey) => {
      setSelectedDateKeys((selected) =>
         selected[0] === dateKey ? [] : [dateKey],
      );
   };

   const retryVisitTypes = async () => {
      setLoading(true);
      setError('');
      try {
         setVisitTypes(await getAppointmentVisitTypes());
      } catch {
         setError('Visit types could not be loaded. Please try again.');
      } finally {
         setLoading(false);
      }
   };

   const findSlots = async () => {
      setIsSearching(true);
      setError('');
      try {
         const results = await findAvailableAppointments({
            visitTypeId: selectedVisitType.id,
            dateKeys: selectedDateKeys,
            timePeriod,
         });
         setSlots(results);
         setStep(2);
      } catch {
         setError('Available times could not be loaded. Please try again.');
      } finally {
         setIsSearching(false);
      }
   };

   const selectSlot = async (slot) => {
      if (isBooking || bookingConfirmed) return;
      setSelectedSlot(slot);
      setBookingStage(0);
      setIsBooking(true);
      setError('');
      try {
         const result = await bookAppointment({
            visitTypeId: selectedVisitType.id,
            slot,
         });
         setBookingResult(result);
         setBookingConfirmed(true);
      } catch (requestError) {
         setSelectedSlot(null);
         setBookingResult(null);
         if (requestError.status === 409) {
            setSlots([]);
            setStep(1);
            setError(
               'That time is no longer available. Choose another date and search again.',
            );
         } else {
            setError(
               requestError.message ||
                  'This appointment could not be booked. Please try again.',
            );
         }
      } finally {
         setIsBooking(false);
      }
   };

   if ((booked || bookingConfirmed) && selectedSlot) {
      if (bookingConfirmed && !booked) {
         return (
            <section
               className="centered-page booking-success-progress"
               ref={pageRef}>
               <PortalActionProgress
                  title="Your appointment is confirmed"
                  detail="The slot, room, and any required equipment were confirmed."
                  steps={[
                     'Checking that the slot is still available',
                     'Assigning a room and any required equipment',
                     'Finalizing your appointment',
                  ]}
                  completedSteps={3}
                  activeStep={-1}
                  complete
               />
            </section>
         );
      }
      const bookedStart = bookingResult?.scheduledStart || selectedSlot.start;
      return (
         <section className="centered-page booking-success" ref={pageRef}>
            <span className="success-icon">
               <Icon name="check" />
            </span>
            <h1>Appointment Booked!</h1>
            <p>
               {selectedSlot.providerName} · {formatClinicDateTime(bookedStart)}
            </p>
            {bookingResult?.id && <p>Appointment #{bookingResult.id}</p>}
            <p>Your appointment has been confirmed.</p>
            {bookingResult?.priorAuthorizationStatus === 'needs_draft' && (
               <div
                  className="booking-auth-feedback"
                  role="status"
                  aria-live="polite">
                  <strong>
                     {authDraftStatus === 'drafted' ||
                     authDraftStatus === 'submitted'
                        ? 'Authorization draft prepared'
                        : authDraftStatus === 'approved'
                          ? 'Authorization approved'
                          : authDraftStatus === 'denied'
                            ? 'Authorization needs staff follow-up'
                            : 'Authorization draft in progress'}
                  </strong>
                  <span>
                     {authDraftStatus === 'drafted'
                        ? 'The draft is ready for clinic staff review.'
                        : authDraftStatus === 'submitted'
                          ? 'The request is with clinic staff for review.'
                          : authDraftStatus === 'approved'
                            ? 'Your clinic has recorded an approval.'
                            : authDraftStatus === 'denied'
                              ? 'Your clinic will follow up with the next steps.'
                              : authDraftStatus === 'continuing'
                                ? 'Your booking is confirmed. Draft preparation is continuing; check your appointments for updates.'
                                : 'We’re preparing the authorization draft for clinic staff review.'}
                  </span>
               </div>
            )}
            <Link className="button button-primary" to="/patient">
               Back to Dashboard
            </Link>
         </section>
      );
   }

   return (
      <div className="centered-page booking-page" ref={pageRef}>
         <header className="booking-heading">
            <h1>Book an Appointment</h1>
            <p>Find a time that works for you</p>
         </header>

         <StepIndicator currentStep={step} />

         {error && (
            <ErrorState
               compact
               title={
                  step === 0
                     ? 'Visit types couldn’t load'
                     : 'We couldn’t complete that step'
               }
               message={error}
               retryLabel="Try again"
               onRetry={step === 0 ? retryVisitTypes : null}
            />
         )}

         {step === 0 && (
            <section className="booking-panel">
               <h2>What's the reason for your visit?</h2>
               <p className="booking-subtitle">
                  Select the option that best describes your needs.
               </p>
               {loading ? (
                  <LoadingSkeleton
                     variant="booking-reasons"
                     label="visit reasons"
                  />
               ) : (
                  <fieldset className="reason-list">
                     <legend className="sr-only">Visit reason</legend>
                     {visitTypes.map((visitType) => (
                        <label
                           className={`reason-option${selectedVisitType?.id === visitType.id ? ' selected' : ''}`}
                           key={visitType.id}>
                           <input
                              type="radio"
                              name="visit-reason"
                              value={visitType.id}
                              checked={selectedVisitType?.id === visitType.id}
                              onChange={() => setSelectedVisitType(visitType)}
                           />
                           <span>{visitType.name}</span>
                        </label>
                     ))}
                  </fieldset>
               )}
               <div className="booking-actions right reason-step-actions">
                  <button
                     className="button button-primary"
                     type="button"
                     disabled={!selectedVisitType || loading}
                     onClick={() => setStep(1)}>
                     Continue <span aria-hidden="true">→</span>
                  </button>
               </div>
            </section>
         )}

         {step === 1 && (
            <section className="booking-panel">
               <h2>When are you available?</h2>
               <p className="booking-subtitle">
                  Select one preferred date, and optionally a time of day.
               </p>

               <div className="availability-grid">
                  <div>
                     <h3 className="booking-label">Preferred dates</h3>
                     <MiniCalendar
                        visibleMonth={visibleMonth}
                        onChangeMonth={setVisibleMonth}
                        selectedDateKeys={selectedDateKeys}
                        onSelectDate={selectDate}
                     />
                     {selectedDateKeys.length > 0 && (
                        <p className="selected-date-count">1 date selected</p>
                     )}
                  </div>

                  <fieldset className="time-preferences">
                     <legend className="booking-label">
                        Preferred time of day
                     </legend>
                     <div className="time-period-list">
                        {timePeriods.map((period) => (
                           <button
                              className={`time-period${timePeriod === period.id ? ' selected' : ''}`}
                              type="button"
                              key={period.id}
                              aria-pressed={timePeriod === period.id}
                              onClick={() =>
                                 setTimePeriod((current) =>
                                    current === period.id ? null : period.id,
                                 )
                              }>
                              <Icon name={period.icon} />
                              <span>
                                 <strong>{period.label}</strong>
                                 <small>{period.hours}</small>
                              </span>
                           </button>
                        ))}
                     </div>
                     <p className="time-hint">
                        No preference? We'll show all available slots.
                     </p>
                  </fieldset>
               </div>

               {isSearching && (
                  <PortalActionProgress
                     title="Finding available times"
                     detail="Checking the schedule for your preferred date and visit type."
                  />
               )}

               <div className="booking-actions between">
                  <button
                     className="button button-quiet"
                     type="button"
                     onClick={() => setStep(0)}>
                     ← Back
                  </button>
                  <button
                     className="button button-primary"
                     type="button"
                     disabled={!selectedDateKeys.length || isSearching}
                     onClick={findSlots}>
                     {isSearching ? 'Finding slots…' : 'Find Slots →'}
                  </button>
               </div>
            </section>
         )}

         {step === 2 && (
            <div className="slot-selection">
               <section className="booking-summary">
                  <span>
                     <small>Reason</small>
                     {selectedVisitType?.name}
                  </span>
                  <span>
                     <small>Date</small>
                     {selectedDateKeys.map(formatDateKey).join(', ')}
                  </span>
                  {timePeriod && (
                     <span>
                        <small>Time</small>
                        {
                           timePeriods.find(
                              (period) => period.id === timePeriod,
                           )?.label
                        }
                     </span>
                  )}
               </section>

               <header className="available-heading">
                  <h2>Available Appointments</h2>
                  <p>Select a slot to confirm your booking.</p>
               </header>

               {isBooking && (
                  <PortalActionProgress
                     title="Confirming your appointment"
                     detail="We’re checking the selected slot and matching the resources needed for your visit. We’ll confirm everything when the booking request succeeds."
                     steps={[
                        'Checking that the slot is still available',
                        'Assigning a room and any required equipment',
                        'Finalizing your appointment',
                     ]}
                     activeStep={bookingStage}
                  />
               )}

               {slots.length === 0 ? (
                  <section className="empty-slots">
                     <h3>No appointments available right now</h3>
                     <p>
                        Try different dates, or join the waitlist to hear when a
                        slot opens.
                     </p>
                     <div className="booking-actions center">
                        <button
                           className="button button-outline"
                           type="button"
                           onClick={() => setStep(1)}>
                           Change dates
                        </button>
                        <Link
                           className="button button-primary"
                           to="/patient/waitlist"
                           state={{
                              waitlistPreferences: {
                                 visitTypeId: selectedVisitType.id,
                                 dateStart: selectedDateKeys[0],
                                 dateEnd: selectedDateKeys[0],
                                 timePeriod,
                              },
                           }}>
                           Join Waitlist
                        </Link>
                     </div>
                  </section>
               ) : (
                  <div className="slot-list">
                     {slots.map((slot) => (
                        <article className="slot-card" key={slot.id}>
                           <div className="slot-date">
                              <span>{slot.monthLabel}</span>
                              <strong>{slot.dayLabel}</strong>
                           </div>
                           <div className="slot-details">
                              <strong>{slot.providerName}</strong>
                              <span className="slot-time">
                                 {slot.timeLabel}
                              </span>
                           </div>
                           <button
                              className="button button-primary slot-select"
                              type="button"
                              disabled={isBooking || bookingConfirmed}
                              onClick={() => selectSlot(slot)}>
                              {isBooking && selectedSlot?.id === slot.id
                                 ? 'Booking…'
                                 : 'Select'}
                           </button>
                        </article>
                     ))}
                  </div>
               )}

               <div className="booking-actions back-only">
                  <button
                     className="button button-quiet"
                     type="button"
                     disabled={isBooking || bookingConfirmed}
                     onClick={() => setStep(1)}>
                     ← Back
                  </button>
               </div>
            </div>
         )}
      </div>
   );
}

function StepIndicator({ currentStep }) {
   const steps = ['Reason', 'Availability', 'Select'];

   return (
      <ol className="booking-steps" aria-label="Appointment booking progress">
         {steps.map((label, index) => (
            <li
               className={`booking-step${index < currentStep ? ' complete' : ''}${index === currentStep ? ' current' : ''}`}
               key={label}>
               <span className="step-marker">
                  {index < currentStep ? <Icon name="check" /> : index + 1}
               </span>
               <span className="step-label">{label}</span>
               {index < steps.length - 1 && (
                  <span className="step-line" aria-hidden="true" />
               )}
            </li>
         ))}
      </ol>
   );
}

function MiniCalendar({
   visibleMonth,
   onChangeMonth,
   selectedDateKeys,
   onSelectDate,
}) {
   const year = visibleMonth.getFullYear();
   const month = visibleMonth.getMonth();
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const firstDay = new Date(year, month, 1).getDay();
   const daysInMonth = new Date(year, month + 1, 0).getDate();
   const cells = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
   ];
   while (cells.length % 7) cells.push(null);

   return (
      <div className="mini-calendar">
         <div className="calendar-heading">
            <h4>
               {visibleMonth.toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
               })}
            </h4>
            <div>
               <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => onChangeMonth(new Date(year, month - 1, 1))}>
                  ‹
               </button>
               <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => onChangeMonth(new Date(year, month + 1, 1))}>
                  ›
               </button>
            </div>
         </div>
         <div className="calendar-grid weekday-row" aria-hidden="true">
            {weekdayLabels.map((day) => (
               <span key={day}>{day}</span>
            ))}
         </div>
         <div className="calendar-grid calendar-days">
            {cells.map((day, index) => {
               if (!day)
                  return (
                     <span className="calendar-empty" key={`empty-${index}`} />
                  );
               const date = new Date(year, month, day);
               date.setHours(0, 0, 0, 0);
               const dateKey = makeDateKey(year, month, day);
               const isSelected = selectedDateKeys.includes(dateKey);
               const isToday = date.getTime() === today.getTime();

               return (
                  <button
                     type="button"
                     className={`calendar-day${isSelected ? ' selected' : ''}`}
                     key={dateKey}
                     disabled={date < today}
                     aria-label={date.toLocaleDateString(undefined, {
                        dateStyle: 'full',
                     })}
                     aria-current={isToday ? 'date' : undefined}
                     aria-pressed={isSelected}
                     onClick={() => onSelectDate(dateKey)}>
                     {day}
                  </button>
               );
            })}
         </div>
      </div>
   );
}

function makeDateKey(year, month, day) {
   return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateKey(dateKey) {
   const [year, month, day] = dateKey.split('-').map(Number);
   return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
   });
}

export default BookAppointment;
