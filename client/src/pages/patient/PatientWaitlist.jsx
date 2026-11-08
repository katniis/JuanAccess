import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import { getAppointmentVisitTypes } from '../../services/appointmentBooking.js';
import { clinicDateKey, formatRemaining } from '../../services/patientDates.js';
import {
   confirmWaitlistOffer,
   declineWaitlistOffer,
   getMyWaitlist,
   joinPatientWaitlist,
   removeWaitlistEntry,
} from '../../services/patientWaitlist.js';

const timeOptions = [
   { id: '', label: 'No preference' },
   { id: 'morning', label: 'Morning' },
   { id: 'afternoon', label: 'Afternoon' },
   { id: 'evening', label: 'Evening' },
];

function PatientWaitlist() {
   const location = useLocation();
   const initialPreferences = location.state?.waitlistPreferences;
   const [entries, setEntries] = useState([]);
   const [visitTypes, setVisitTypes] = useState([]);
   const [loading, setLoading] = useState(true);
   const [busyId, setBusyId] = useState(null);
   const [busyOfferAction, setBusyOfferAction] = useState(null);
   const [isJoining, setIsJoining] = useState(false);
   const [isFormOpen, setIsFormOpen] = useState(Boolean(initialPreferences));
   const [form, setForm] = useState(() => ({
      visitTypeId: initialPreferences?.visitTypeId || '',
      dateStart: initialPreferences?.dateStart || clinicDateKey(),
      dateEnd:
         initialPreferences?.dateEnd ||
         initialPreferences?.dateStart ||
         clinicDateKey(),
      timePeriod: initialPreferences?.timePeriod || '',
   }));
   const [loadError, setLoadError] = useState('');
   const [formError, setFormError] = useState('');
   const [clock, setClock] = useState(0);
   const pageRef = useRef(null);
   const { notify } = usePortalFeedback();
   usePortalPageReveal(pageRef, !loading);

   const reloadEntries = useCallback(async () => {
      const nextEntries = await getMyWaitlist();
      setEntries(nextEntries);
      setLoadError('');
   }, []);

   useEffect(() => {
      let current = true;
      Promise.all([getMyWaitlist(), getAppointmentVisitTypes()])
         .then(([nextEntries, nextVisitTypes]) => {
            if (!current) return;
            setEntries(nextEntries);
            setVisitTypes(nextVisitTypes);
            setClock(Date.now());
         })
         .catch((error) => {
            if (current)
               setLoadError(
                  error.message ||
                     'Your waitlist could not be loaded. Please try again.',
               );
         })
         .finally(() => {
            if (current) setLoading(false);
         });
      return () => {
         current = false;
      };
   }, []);

   useEffect(() => {
      const interval = window.setInterval(() => setClock(Date.now()), 1000);
      return () => window.clearInterval(interval);
   }, []);

   const submitWaitlistRequest = async (event) => {
      event.preventDefault();
      setIsJoining(true);
      setFormError('');
      try {
         await joinPatientWaitlist(form);
         await reloadEntries();
         setIsFormOpen(false);
         notify({ type: 'success', message: 'You joined the waitlist.' });
      } catch (error) {
         setFormError(
            error.message ||
               'We could not join the waitlist. Please review your preferences and try again.',
         );
      } finally {
         setIsJoining(false);
      }
   };

   const respondToOffer = async (entry, action) => {
      setBusyOfferAction({ id: entry.id, action });
      try {
         if (action === 'confirm') {
            await confirmWaitlistOffer(entry.id);
            notify({ type: 'success', message: 'Appointment confirmed.' });
         } else {
            await declineWaitlistOffer(entry.id);
            notify({ type: 'success', message: 'Offer declined.' });
         }
         await reloadEntries();
      } catch (error) {
         notify({
            type: 'error',
            message:
               error.message ||
               'We could not update this offer. Please try again.',
         });
         if (error.status === 409) await reloadEntries().catch(() => {});
      } finally {
         setBusyOfferAction(null);
      }
   };

   const removeEntry = async (entry) => {
      setBusyId(entry.id);
      try {
         await removeWaitlistEntry(entry.id);
         await reloadEntries();
         notify({ type: 'success', message: 'Waitlist request removed.' });
      } catch (error) {
         notify({
            type: 'error',
            message:
               error.message ||
               'We could not remove this request. Please try again.',
         });
      } finally {
         setBusyId(null);
      }
   };

   const activeEntries = entries.filter((entry) =>
      ['waiting', 'offered'].includes(entry.status),
   );

   return (
      <div className="centered-page waitlist-page" ref={pageRef}>
         <header className="waitlist-page-heading">
            <div>
               <h1>My Waitlist</h1>
               <p>You’ll be notified when a slot becomes available</p>
            </div>
            <button
               className="button button-outline"
               type="button"
               onClick={() => setIsFormOpen((open) => !open)}>
               <Icon name="plus" />
               Join Waitlist
            </button>
         </header>

         {isFormOpen && (
            <form className="waitlist-form" onSubmit={submitWaitlistRequest}>
               <div className="waitlist-form-heading">
                  <div>
                     <h2>Waitlist preferences</h2>
                     <p>
                        Choose when you’re available. We’ll look for any
                        provider.
                     </p>
                  </div>
                  <button
                     className="button button-quiet"
                     type="button"
                     onClick={() => setIsFormOpen(false)}>
                     Cancel
                  </button>
               </div>
               <div className="waitlist-form-grid">
                  <label className="waitlist-form-field">
                     <span>Visit type</span>
                     <select
                        required
                        value={form.visitTypeId}
                        onChange={(event) =>
                           setForm((current) => ({
                              ...current,
                              visitTypeId: event.target.value,
                           }))
                        }>
                        <option value="">Choose a visit type</option>
                        {visitTypes.map((visitType) => (
                           <option key={visitType.id} value={visitType.id}>
                              {visitType.name}
                           </option>
                        ))}
                     </select>
                  </label>
                  <label className="waitlist-form-field">
                     <span>Preferred time</span>
                     <select
                        value={form.timePeriod}
                        onChange={(event) =>
                           setForm((current) => ({
                              ...current,
                              timePeriod: event.target.value,
                           }))
                        }>
                        {timeOptions.map((option) => (
                           <option key={option.id} value={option.id}>
                              {option.label}
                           </option>
                        ))}
                     </select>
                  </label>
                  <label className="waitlist-form-field">
                     <span>From</span>
                     <input
                        type="date"
                        min={clinicDateKey()}
                        required
                        value={form.dateStart}
                        onChange={(event) =>
                           setForm((current) => ({
                              ...current,
                              dateStart: event.target.value,
                              dateEnd:
                                 current.dateEnd < event.target.value
                                    ? event.target.value
                                    : current.dateEnd,
                           }))
                        }
                     />
                  </label>
                  <label className="waitlist-form-field">
                     <span>Through</span>
                     <input
                        type="date"
                        min={form.dateStart || clinicDateKey()}
                        required
                        value={form.dateEnd}
                        onChange={(event) =>
                           setForm((current) => ({
                              ...current,
                              dateEnd: event.target.value,
                           }))
                        }
                     />
                  </label>
               </div>
               <div className="waitlist-form-actions">
                  <button
                     className="button button-primary"
                     type="submit"
                     disabled={isJoining || loading || !visitTypes.length}>
                     {isJoining ? 'Joining…' : 'Join Waitlist'}
                  </button>
               </div>
               {formError && (
                  <p className="waitlist-form-error" role="alert">
                     {formError}
                  </p>
               )}
            </form>
         )}

         {loadError && (
            <ErrorState
               compact
               title="Your waitlist couldn’t refresh"
               message={loadError}
               retryLabel="Try again"
               onRetry={() => {
                  setLoading(true);
                  Promise.all([reloadEntries(), getAppointmentVisitTypes()])
                     .then(([, nextTypes]) => setVisitTypes(nextTypes))
                     .catch((error) =>
                        setLoadError(
                           error.message ||
                              'Your waitlist could not be loaded.',
                        ),
                     )
                     .finally(() => setLoading(false));
               }}
            />
         )}

         {loading ? (
            <LoadingSkeleton variant="waitlist-list" label="your waitlist" />
         ) : activeEntries.length ? (
            <div className="waitlist-card-list">
               {activeEntries.map((entry) => (
                  <section
                     className={'waitlist-card ' + entry.status}
                     key={entry.id}>
                     <div className="waitlist-card-content">
                        <div className="waitlist-card-status">
                           <StatusPill status={entry.statusClass}>
                              {entry.statusLabel}
                           </StatusPill>
                           {entry.status === 'offered' && (
                              <span className="offer-reminder">
                                 Slot available — respond soon
                              </span>
                           )}
                        </div>
                        <h2>{entry.providerName}</h2>
                        <p className="waitlist-visit-type">{entry.visitType}</p>
                        <p className="requested-window">
                           <Icon name="calendar" />
                           Requested window: {entry.requestedWindow}
                        </p>
                        {entry.offeredDateTime && (
                           <div className="offered-slot-info">
                              <strong>Offered: {entry.offeredDateTime}</strong>
                              <span className="countdown">
                                 <Icon name="timer" />
                                 {formatRemaining(
                                    entry.offerExpiresAt,
                                    clock,
                                 )}{' '}
                                 <span>remaining</span>
                              </span>
                           </div>
                        )}
                     </div>
                     <div className="waitlist-card-actions">
                        {entry.status === 'offered' ? (
                           <>
                              <button
                                 className="button button-primary"
                                 type="button"
                                 disabled={
                                    busyOfferAction?.id === entry.id ||
                                    busyId === entry.id
                                 }
                                 onClick={() =>
                                    void respondToOffer(entry, 'confirm')
                                 }>
                                 {busyOfferAction?.id === entry.id &&
                                 busyOfferAction.action === 'confirm'
                                    ? 'Confirming…'
                                    : 'Confirm'}
                              </button>
                              <button
                                 className="button button-outline"
                                 type="button"
                                 disabled={
                                    busyOfferAction?.id === entry.id ||
                                    busyId === entry.id
                                 }
                                 onClick={() =>
                                    void respondToOffer(entry, 'decline')
                                 }>
                                 {busyOfferAction?.id === entry.id &&
                                 busyOfferAction.action === 'decline'
                                    ? 'Declining…'
                                    : 'Decline'}
                              </button>
                           </>
                        ) : (
                           <button
                              className="remove-waitlist"
                              type="button"
                              disabled={busyId === entry.id}
                              onClick={() => void removeEntry(entry)}>
                              {busyId === entry.id ? 'Removing…' : 'Remove'}
                           </button>
                        )}
                     </div>
                  </section>
               ))}
            </div>
         ) : !loadError ? (
            <section className="empty-waitlist">
               <h2>You are not on a waitlist</h2>
               <p>Join one to hear about earlier appointments.</p>
               <button
                  className="button button-primary"
                  type="button"
                  onClick={() => setIsFormOpen(true)}>
                  Set preferences
               </button>
               <Link className="text-link" to="/patient/book">
                  Find an appointment
               </Link>
            </section>
         ) : null}
      </div>
   );
}

export default PatientWaitlist;
