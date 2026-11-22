import { useRef, useState } from 'react';
import { gsap, useGSAP } from '../utils/portalGsap.js';
import {
   PATIENT_CANCELLATION_REASONS,
   draftPatientCancellationLetter,
} from '../services/patientAppointments.js';
import { draftStaffCancellationLetter } from '../services/staffSchedule.js';

function AppointmentCancelDialog({
   appointment,
   busy = false,
   onCancel,
   onConfirm,
   reasons = PATIENT_CANCELLATION_REASONS,
   direction = 'patient',
}) {
   const dialogRef = useRef(null);
   const contentRef = useRef(null);
   const [displayAppointment, setDisplayAppointment] = useState(null);
   const [reason, setReason] = useState('');
   const [reasonText, setReasonText] = useState('');
   const [candidateDates, setCandidateDates] = useState('');
   const [letter, setLetter] = useState('');
   const [drafting, setDrafting] = useState(false);
   const [draftError, setDraftError] = useState('');
   const isStaff = direction === 'staff';

   useGSAP(
      () => {
         const dialog = dialogRef.current;
         const content = contentRef.current;
         if (!dialog || !content) return undefined;
         const media = gsap.matchMedia();

         if (appointment) {
            if (!dialog.open) {
               setReason('');
               setReasonText('');
               setCandidateDates('');
               setLetter('');
               setDraftError('');
               dialog.showModal();
            }
            media.add('(prefers-reduced-motion: reduce)', () =>
               gsap.set(content, { autoAlpha: 1, y: 0, scale: 1 }),
            );
            media.add('(prefers-reduced-motion: no-preference)', () => {
               gsap.fromTo(
                  content,
                  { autoAlpha: 0, y: 12, scale: 0.98 },
                  {
                     autoAlpha: 1,
                     y: 0,
                     scale: 1,
                     duration: 0.24,
                     ease: 'power2.out',
                  },
               );
            });
         } else if (dialog.open) {
            dialog.close();
            setDisplayAppointment(null);
         }
         return () => media.revert();
      },
      { scope: dialogRef, dependencies: [appointment], revertOnUpdate: true },
   );

   const currentAppointment = appointment || displayAppointment;
   const retainAndCancel = () => {
      if (busy) return;
      setDisplayAppointment(currentAppointment);
      onCancel();
   };
   const needsText = reason === 'other';
   const canConfirm = Boolean(reason) && (!needsText || reasonText.trim());
   const retainAndConfirm = (event) => {
      event.preventDefault();
      if (busy || !canConfirm) return;
      setDisplayAppointment(currentAppointment);
      onConfirm({
         reason,
         reasonText: needsText ? reasonText.trim() : '',
         letter: letter.trim(),
      });
   };
   // The Cancellation Letter draft is optional; it only needs a chosen reason.
   const draftLetter = async () => {
      if (!reason || drafting || busy) return;
      setDrafting(true);
      setDraftError('');
      try {
         const body = { reason, reasonText: reasonText.trim() };
         const draft = isStaff
            ? await draftStaffCancellationLetter(currentAppointment.id, {
                 ...body,
                 candidateDates: candidateDates
                    .split(';')
                    .map((date) => date.trim())
                    .filter(Boolean),
              })
            : await draftPatientCancellationLetter(currentAppointment.id, body);
         setLetter(draft.letter);
      } catch (error) {
         setDraftError(error.message || 'We could not draft a letter.');
      } finally {
         setDrafting(false);
      }
   };

   return (
      <dialog
         ref={dialogRef}
         className="appointment-cancel-dialog"
         aria-labelledby="appointment-cancel-title"
         aria-describedby="appointment-cancel-description"
         onCancel={(event) => {
            event.preventDefault();
            retainAndCancel();
         }}
         onClick={(event) => {
            if (event.target === event.currentTarget) retainAndCancel();
         }}>
         {currentAppointment && (
            <form
               className="appointment-cancel-dialog-content"
               ref={contentRef}
               onSubmit={retainAndConfirm}>
               <h2 id="appointment-cancel-title">Cancel appointment?</h2>
               <p id="appointment-cancel-description">
                  Are you sure you want to cancel this appointment?
               </p>
               <div className="appointment-cancel-summary">
                  <strong>{currentAppointment.providerName}</strong>
                  <span>{currentAppointment.visitType}</span>
                  <span>
                     {currentAppointment.dateLabel ||
                        currentAppointment.monthLabel +
                           ' ' +
                           currentAppointment.dayLabel}{' '}
                     · {currentAppointment.timeLabel}
                  </span>
               </div>
               <label className="appointment-cancel-field">
                  <span>Reason for cancelling</span>
                  <select
                     required
                     value={reason}
                     disabled={busy}
                     onChange={(event) => setReason(event.target.value)}>
                     <option value="" disabled>
                        Choose a reason
                     </option>
                     {reasons.map((option) => (
                        <option key={option.value} value={option.value}>
                           {option.label}
                        </option>
                     ))}
                  </select>
               </label>
               {needsText && (
                  <label className="appointment-cancel-field">
                     <span>Tell us more</span>
                     <textarea
                        required
                        rows={3}
                        maxLength={1000}
                        value={reasonText}
                        disabled={busy}
                        onChange={(event) => setReasonText(event.target.value)}
                     />
                  </label>
               )}
               {isStaff && (
                  <label className="appointment-cancel-field">
                     <span>
                        Other dates to offer (optional, separate with ;)
                     </span>
                     <input
                        type="text"
                        maxLength={300}
                        value={candidateDates}
                        disabled={busy || drafting}
                        placeholder="e.g. Dec 3, 9 AM; Dec 4, 2 PM"
                        onChange={(event) =>
                           setCandidateDates(event.target.value)
                        }
                     />
                  </label>
               )}
               <label className="appointment-cancel-field">
                  <span>
                     {isStaff
                        ? 'Letter to the patient (optional)'
                        : 'Message to the clinic (optional)'}
                  </span>
                  <textarea
                     rows={5}
                     maxLength={5000}
                     value={letter}
                     disabled={busy || drafting}
                     onChange={(event) => setLetter(event.target.value)}
                  />
               </label>
               <button
                  className="button button-light appointment-cancel-draft"
                  type="button"
                  disabled={!reason || busy || drafting}
                  onClick={() => void draftLetter()}>
                  {drafting ? 'Drafting…' : 'Draft with AI'}
               </button>
               {draftError && (
                  <p className="appointment-cancel-error" role="alert">
                     {draftError}
                  </p>
               )}
               <div className="appointment-cancel-actions">
                  <button
                     className="button button-light"
                     type="button"
                     disabled={busy}
                     onClick={retainAndCancel}>
                     Keep appointment
                  </button>
                  <button
                     className="button button-danger"
                     type="submit"
                     disabled={busy || !canConfirm}>
                     {busy ? 'Cancelling…' : 'Cancel appointment'}
                  </button>
               </div>
            </form>
         )}
      </dialog>
   );
}

export default AppointmentCancelDialog;
