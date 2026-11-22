import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import {
   bookApe,
   getApeAvailability,
} from '../../services/appointmentBooking.js';
import {
   clinicDateKey,
   formatClinicDate,
   formatClinicTime,
} from '../../services/patientDates.js';
import {
   formatPeso,
   getPriceList,
   HMO_NOTE,
} from '../../services/priceList.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';

const SEARCH_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const sexLabel = { female: 'female', male: 'male' };

const windowLabel = (window) =>
   `${window.name} · ${formatClinicTime(window.start)} – ${formatClinicTime(window.end)}`;

// Patient APE Booking: APE Package, then a date and Arrival Window, then confirm (ADR 0002).
function BookApe() {
   const pageRef = useRef(null);
   usePortalPageReveal(pageRef);
   const [packages, setPackages] = useState([]);
   const [loading, setLoading] = useState(true);
   const [step, setStep] = useState(0);
   const [selectedPackage, setSelectedPackage] = useState(null);
   const [availability, setAvailability] = useState(null);
   const [choice, setChoice] = useState(null);
   const [error, setError] = useState('');
   const [needsSexAtBirth, setNeedsSexAtBirth] = useState(false);
   const [isWorking, setIsWorking] = useState(false);
   const [booked, setBooked] = useState(null);

   useEffect(() => {
      let ignore = false;
      getPriceList()
         .then(({ apePackages = [] }) => !ignore && setPackages(apePackages))
         .catch((requestError) => !ignore && setError(requestError.message))
         .finally(() => !ignore && setLoading(false));
      return () => {
         ignore = true;
      };
   }, []);

   const loadAvailability = async () => {
      setIsWorking(true);
      setError('');
      setNeedsSexAtBirth(false);
      setChoice(null);
      try {
         const result = await getApeAvailability({
            packageId: selectedPackage.id,
            rangeStart: clinicDateKey(),
            rangeEnd: clinicDateKey(
               new Date(Date.now() + (SEARCH_DAYS - 1) * DAY_MS),
            ),
         });
         setAvailability(result);
         setStep(1);
      } catch (requestError) {
         if (requestError.status === 409) setNeedsSexAtBirth(true);
         setError(requestError.message);
      } finally {
         setIsWorking(false);
      }
   };

   const confirm = async () => {
      setIsWorking(true);
      setError('');
      try {
         const result = await bookApe({
            packageId: selectedPackage.id,
            arrivalWindowId: choice.window.id,
            date: choice.date,
         });
         setBooked(result);
      } catch (requestError) {
         if (requestError.status === 409) {
            // The window filled up meanwhile: show fresh availability.
            await loadAvailability();
         }
         setError(requestError.message);
      } finally {
         setIsWorking(false);
      }
   };

   if (booked) {
      return (
         <section className="centered-page booking-success" ref={pageRef}>
            <span className="success-icon">
               <Icon name="check" />
            </span>
            <h1>APE Booked!</h1>
            <p>
               {selectedPackage.name} · {formatClinicDate(choice.window.start)}
            </p>
            <p>Arrive {windowLabel(choice.window)}.</p>
            <p>Practitioners for each Procedure are assigned on the day.</p>
            <Link className="button button-primary" to="/patient/appointments">
               View my appointments
            </Link>
         </section>
      );
   }

   return (
      <div className="centered-page booking-page" ref={pageRef}>
         <header className="booking-heading">
            <h1>Book an Annual Physical Examination</h1>
            <p>
               Pick an APE Package, then a date and Arrival Window. No doctor
               choice needed.
            </p>
         </header>

         {error && (
            <ErrorState
               compact
               title="We couldn’t complete that step"
               message={error}
               onRetry={null}>
               {needsSexAtBirth && (
                  <Link
                     className="button button-primary"
                     to="/patient/settings">
                     Go to Settings
                  </Link>
               )}
            </ErrorState>
         )}

         {step === 0 && (
            <section className="booking-panel">
               <h2>Choose an APE Package</h2>
               <p className="booking-subtitle">{HMO_NOTE}</p>
               {loading ? (
                  <LoadingSkeleton
                     variant="booking-reasons"
                     label="APE Packages"
                  />
               ) : packages.length ? (
                  <fieldset className="reason-list">
                     <legend className="sr-only">APE Package</legend>
                     {packages.map((apePackage) => (
                        <label
                           className={`reason-option${selectedPackage?.id === apePackage.id ? ' selected' : ''}`}
                           key={apePackage.id}>
                           <input
                              type="radio"
                              name="ape-package"
                              checked={selectedPackage?.id === apePackage.id}
                              onChange={() => setSelectedPackage(apePackage)}
                           />
                           <span>
                              {apePackage.name} ·{' '}
                              {formatPeso(apePackage.packagePrice)}
                           </span>
                        </label>
                     ))}
                  </fieldset>
               ) : (
                  <p className="reason-empty">
                     No APE Packages are offered yet.
                  </p>
               )}
               <div className="booking-actions right">
                  <button
                     className="button button-primary"
                     type="button"
                     disabled={!selectedPackage || isWorking}
                     onClick={loadAvailability}>
                     Continue <Icon name="chevron-right" />
                  </button>
               </div>
            </section>
         )}

         {step >= 1 && availability && (
            <section className="booking-panel">
               <h2>{availability.package.name}</h2>
               <p className="booking-subtitle">
                  Package Price{' '}
                  <strong>
                     {formatPeso(availability.package.packagePrice)}
                  </strong>{' '}
                  (itemized {formatPeso(availability.itemizedSum)}). {HMO_NOTE}
               </p>
               <ul>
                  {availability.procedures.map((procedure) => (
                     <li key={procedure.procedureCode}>
                        {procedure.description} ·{' '}
                        {formatPeso(procedure.standardCost)}
                        {procedure.sexAtBirth &&
                           ` (added from your Sex at Birth: ${sexLabel[procedure.sexAtBirth]})`}
                     </li>
                  ))}
               </ul>
            </section>
         )}

         {step === 1 && availability && (
            <section className="booking-panel">
               <h2>Pick a date and Arrival Window</h2>
               <p className="booking-subtitle">
                  Only windows where every Procedure has room are shown. Full
                  windows have no waitlist, so pick another.
               </p>
               {availability.days.length ? (
                  availability.days.map((day) => (
                     <fieldset className="reason-list" key={day.date}>
                        <legend className="booking-label">
                           {formatClinicDate(day.windows[0].start, {
                              weekday: 'long',
                           })}
                        </legend>
                        {day.windows.map((window) => {
                           const selected =
                              choice?.date === day.date &&
                              choice.window.id === window.id;
                           return (
                              <label
                                 className={`reason-option${selected ? ' selected' : ''}`}
                                 key={window.id}>
                                 <input
                                    type="radio"
                                    name="arrival-window"
                                    checked={selected}
                                    onChange={() =>
                                       setChoice({ date: day.date, window })
                                    }
                                 />
                                 <span>
                                    {windowLabel(window)} · {window.spotsLeft}{' '}
                                    {window.spotsLeft === 1 ? 'spot' : 'spots'}{' '}
                                    left
                                 </span>
                              </label>
                           );
                        })}
                     </fieldset>
                  ))
               ) : (
                  <p className="reason-empty">
                     No Arrival Windows are open in the next {SEARCH_DAYS} days.
                     Please check again later.
                  </p>
               )}
               <div className="booking-actions between">
                  <button
                     className="button button-quiet"
                     type="button"
                     onClick={() => setStep(0)}>
                     Back
                  </button>
                  <button
                     className="button button-primary"
                     type="button"
                     disabled={!choice}
                     onClick={() => setStep(2)}>
                     Continue <Icon name="chevron-right" />
                  </button>
               </div>
            </section>
         )}

         {step === 2 && choice && (
            <section className="booking-panel">
               <h2>Confirm your APE</h2>
               <p>
                  {formatClinicDate(choice.window.start, { weekday: 'long' })}.
                  Arrive {windowLabel(choice.window)}.
               </p>
               <p>
                  Practitioners are assigned on the day. Package Price{' '}
                  {formatPeso(availability.package.packagePrice)}.
               </p>
               <div className="booking-actions between">
                  <button
                     className="button button-quiet"
                     type="button"
                     disabled={isWorking}
                     onClick={() => setStep(1)}>
                     Back
                  </button>
                  <button
                     className="button button-primary"
                     type="button"
                     disabled={isWorking}
                     onClick={confirm}>
                     {isWorking ? 'Booking…' : 'Confirm APE Booking'}
                  </button>
               </div>
            </section>
         )}
      </div>
   );
}

export default BookApe;
