import { useEffect, useRef, useState } from 'react';
import ErrorState from './ErrorState.jsx';
import {
   doctorName,
   formatConsultationFee,
   getDoctorProfile,
} from '../services/doctorDirectory.js';

function DoctorPhoto({ doctor }) {
   return doctor.photo_url ? (
      <img className="doctor-photo" src={doctor.photo_url} alt="" />
   ) : (
      <span className="doctor-photo" aria-hidden="true">
         {doctor.first_name[0]}
         {doctor.last_name[0]}
      </span>
   );
}

// A signed-in patient's view of a Doctor Profile. Mount it (keyed by doctorId)
// to open it; onClose runs after the native dialog closes (Close, Escape, backdrop).
function DoctorProfileDialog({ doctorId, onClose }) {
   const dialogRef = useRef(null);
   const [state, setState] = useState({ doctor: null, error: '' });
   // The button that opened the dialog, captured before focus moves inside.
   const [opener] = useState(() => document.activeElement);

   useEffect(() => {
      const dialog = dialogRef.current;
      let current = true;
      // showModal moves focus to the Close button and traps it inside the dialog.
      if (!dialog.open) dialog.showModal();
      getDoctorProfile(doctorId)
         .then((doctor) => current && setState({ doctor, error: '' }))
         .catch(
            (error) =>
               current &&
               setState({
                  doctor: null,
                  error: error.message || 'This Doctor Profile could not load.',
               }),
         );
      const restoreFocus = () => opener?.focus?.();
      dialog.addEventListener('close', restoreFocus);
      return () => {
         current = false;
         dialog.removeEventListener('close', restoreFocus);
      };
   }, [doctorId, opener]);

   const close = () => dialogRef.current?.close();
   const { doctor, error } = state;
   const details = doctor
      ? [
           ['Specialization', doctor.specialty],
           ['Education', doctor.education],
           ['PRC license', doctor.prc_license_number],
           ['Board certifications', doctor.board_certifications],
           [
              'Experience',
              doctor.years_of_experience != null &&
                 `${doctor.years_of_experience} years (practicing since ${doctor.practice_start_year})`,
           ],
           ['Consultation Fee', formatConsultationFee(doctor.consultation_fee)],
        ].filter(([, value]) => value)
      : [];

   return (
      <dialog
         ref={dialogRef}
         className="appointment-cancel-dialog doctor-profile-dialog"
         aria-labelledby="doctor-profile-title"
         onClose={onClose}
         onClick={(event) => {
            if (event.target === event.currentTarget) close();
         }}>
         <div className="appointment-cancel-dialog-content">
            {doctor ? (
               <header className="doctor-profile-header">
                  <DoctorPhoto doctor={doctor} />
                  <h2 id="doctor-profile-title">{doctorName(doctor)}</h2>
               </header>
            ) : (
               <h2 id="doctor-profile-title">Doctor Profile</h2>
            )}
            {error ? (
               <ErrorState
                  compact
                  title="We couldn’t load this doctor"
                  message={error}
                  onRetry={null}
               />
            ) : !doctor ? (
               <p role="status">Loading doctor…</p>
            ) : (
               <>
                  <dl className="doctor-details">
                     {details.map(([label, value]) => (
                        <div key={label}>
                           <dt>{label}</dt>
                           <dd>{value}</dd>
                        </div>
                     ))}
                  </dl>
                  {doctor.background && (
                     <>
                        <h3>Background</h3>
                        <p>{doctor.background}</p>
                     </>
                  )}
               </>
            )}
            <div className="appointment-cancel-actions">
               <button
                  className="button button-light"
                  type="button"
                  onClick={close}>
                  Close
               </button>
            </div>
         </div>
      </dialog>
   );
}

export default DoctorProfileDialog;
