import { useRef, useState } from 'react';
import { gsap, useGSAP } from '../utils/portalGsap.js';

function AppointmentCancelDialog({
   appointment,
   busy = false,
   onCancel,
   onConfirm,
}) {
   const dialogRef = useRef(null);
   const contentRef = useRef(null);
   const [displayAppointment, setDisplayAppointment] = useState(null);

   useGSAP(
      () => {
         const dialog = dialogRef.current;
         const content = contentRef.current;
         if (!dialog || !content) return undefined;
         const media = gsap.matchMedia();

         if (appointment) {
            if (!dialog.open) dialog.showModal();
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
   const retainAndConfirm = () => {
      setDisplayAppointment(currentAppointment);
      onConfirm();
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
            <div className="appointment-cancel-dialog-content" ref={contentRef}>
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
                     type="button"
                     disabled={busy}
                     onClick={retainAndConfirm}>
                     {busy ? 'Cancelling…' : 'Cancel appointment'}
                  </button>
               </div>
            </div>
         )}
      </dialog>
   );
}

export default AppointmentCancelDialog;
