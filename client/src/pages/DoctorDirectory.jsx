import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState.jsx';
import {
   doctorName,
   formatConsultationFee,
   getDoctorDirectory,
   getDoctorProfile,
} from '../services/doctorDirectory.js';

function PublicShell({ children }) {
   return (
      <main className="privacy-policy doctor-directory">
         <header className="auth-brand">
            <Link className="auth-brand-mark" to="/" aria-label="JuanAccess">
               <img src="/juanaccess-logo.svg" alt="JuanAccess" />
            </Link>
            <Link className="public-nav-link" to="/doctors">
               Meet Our Doctors
            </Link>
         </header>
         <article>{children}</article>
      </main>
   );
}

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

function useLoad(load, key) {
   const [state, setState] = useState({ data: null, error: '' });
   useEffect(() => {
      let current = true;
      load()
         .then((data) => current && setState({ data, error: '' }))
         .catch(
            (error) =>
               current && setState({ data: null, error: error.message }),
         );
      return () => {
         current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [key]);
   return state;
}

export function DoctorDirectory() {
   const { data: doctors, error } = useLoad(getDoctorDirectory, 'all');

   return (
      <PublicShell>
         <h1>Meet Our Doctors</h1>
         {error ? (
            <ErrorState
               compact
               title="Doctors couldn’t load"
               message={error}
               onRetry={null}
            />
         ) : !doctors ? (
            <p role="status">Loading doctors…</p>
         ) : doctors.length === 0 ? (
            <p>No doctors are listed right now.</p>
         ) : (
            <ul className="doctor-list">
               {doctors.map((doctor) => (
                  <li key={doctor.id}>
                     <Link className="doctor-card" to={'/doctors/' + doctor.id}>
                        <DoctorPhoto doctor={doctor} />
                        <span>
                           <strong>{doctorName(doctor)}</strong>
                           <span>{doctor.specialty || 'General practice'}</span>
                           {doctor.years_of_experience != null && (
                              <span>
                                 {doctor.years_of_experience} years of
                                 experience
                              </span>
                           )}
                        </span>
                     </Link>
                  </li>
               ))}
            </ul>
         )}
      </PublicShell>
   );
}

export function DoctorProfile() {
   const { doctorId } = useParams();
   const { data: doctor, error } = useLoad(
      () => getDoctorProfile(doctorId),
      doctorId,
   );

   if (error)
      return (
         <PublicShell>
            <ErrorState
               title="We couldn’t find that doctor"
               message={error}
               onRetry={null}>
               <Link className="button button-primary" to="/doctors">
                  See all doctors
               </Link>
            </ErrorState>
         </PublicShell>
      );
   if (!doctor)
      return (
         <PublicShell>
            <p role="status">Loading doctor…</p>
         </PublicShell>
      );

   const fee = formatConsultationFee(doctor.consultation_fee);
   const details = [
      ['Specialization', doctor.specialty],
      ['Education', doctor.education],
      ['PRC license', doctor.prc_license_number],
      ['Board certifications', doctor.board_certifications],
      [
         'Experience',
         doctor.years_of_experience != null &&
            `${doctor.years_of_experience} years (practicing since ${doctor.practice_start_year})`,
      ],
      ['Consultation Fee', fee],
   ].filter(([, value]) => value);

   return (
      <PublicShell>
         <Link to="/doctors">← All doctors</Link>
         <header className="doctor-profile-header">
            <DoctorPhoto doctor={doctor} />
            <h1>{doctorName(doctor)}</h1>
         </header>
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
               <h2>Background</h2>
               <p>{doctor.background}</p>
            </>
         )}
         <Link
            className="button button-primary"
            to={'/patient/book?doctor=' + doctor.id}>
            Book a consult with {doctorName(doctor)}
         </Link>
      </PublicShell>
   );
}
