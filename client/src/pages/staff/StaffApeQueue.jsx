import { useCallback, useEffect, useState } from 'react';
import ErrorState from '../../components/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import {
   assignStation,
   getApeQueue,
   getEligiblePractitioners,
} from '../../services/staffApeQueue.js';

const hhmm = (time) => time?.slice(0, 5) ?? '';
const professionLabel = (profession) => profession.replaceAll('_', ' ');

// Today's APE Bookings by Arrival Window, with Station Assignment per Procedure.
function StaffApeQueue() {
   const { notify } = usePortalFeedback();
   const [windows, setWindows] = useState(null);
   const [hasError, setHasError] = useState(false);

   const load = useCallback(
      () =>
         getApeQueue()
            .then(setWindows)
            .catch(() => setHasError(true)),
      [],
   );

   useEffect(() => {
      load();
   }, [load]);

   if (hasError)
      return (
         <ErrorState
            title="Today’s APE queue couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!windows) return <LoadingSkeleton variant="queue" label="APE queue" />;

   if (!windows.length)
      return (
         <section className="staff-card">
            <h2>Today’s APE queue</h2>
            <p className="staff-record-empty">No APE Bookings today.</p>
         </section>
      );

   return windows.map((window) => (
      <section className="staff-card staff-access-users" key={window.id}>
         <header className="staff-card-heading">
            <div>
               <h2>
                  {window.name} · {hhmm(window.startTime)}–
                  {hhmm(window.endTime)}
               </h2>
               <p>
                  {window.patients.length} patient(s) in this Arrival Window.
               </p>
            </div>
         </header>
         <div className="staff-table-scroll">
            <table className="staff-data-table">
               <thead>
                  <tr>
                     <th>Patient</th>
                     <th>Gender</th>
                     <th>Still needs</th>
                     <th>Assigned</th>
                  </tr>
               </thead>
               <tbody>
                  {window.patients.map((patient) => (
                     <tr key={patient.appointmentId}>
                        <td>
                           {patient.name}
                           <br />
                           <small>{patient.packageName}</small>
                        </td>
                        <td>{patient.gender || 'Not recorded'}</td>
                        <td>
                           {patient.remaining.length ? (
                              patient.remaining.map((procedure) => (
                                 <StationPicker
                                    key={procedure.id}
                                    procedure={procedure}
                                    notify={notify}
                                    onAssigned={load}
                                 />
                              ))
                           ) : (
                              <span>All assigned</span>
                           )}
                        </td>
                        <td>
                           {patient.assigned.map((procedure) => (
                              <StationPicker
                                 key={procedure.id}
                                 procedure={procedure}
                                 notify={notify}
                                 onAssigned={load}
                              />
                           ))}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>
   ));
}

// Offers only on-duty Practitioners whose Profession may perform the Procedure.
function StationPicker({ procedure, notify, onAssigned }) {
   const [options, setOptions] = useState(null);
   const [choice, setChoice] = useState('');
   const [pending, setPending] = useState(false);

   const open = async () => {
      try {
         setOptions(await getEligiblePractitioners(procedure.id));
      } catch (requestError) {
         notify({ type: 'error', message: requestError.message });
      }
   };

   const save = async (event) => {
      event.preventDefault();
      setPending(true);
      try {
         await assignStation(procedure.id, Number(choice));
         notify({
            type: 'success',
            message: `${procedure.description} assigned.`,
         });
         setOptions(null);
         await onAssigned();
      } catch (requestError) {
         notify({ type: 'error', message: requestError.message });
      } finally {
         setPending(false);
      }
   };

   return (
      <form onSubmit={save}>
         <strong>{procedure.description}</strong>
         {procedure.practitioner && <> · {procedure.practitioner.name}</>}{' '}
         {options === null ? (
            <button
               className="button button-outline"
               type="button"
               onClick={open}>
               {procedure.practitioner ? 'Reassign' : 'Assign'}
            </button>
         ) : options.length ? (
            <>
               <label>
                  <span className="sr-only">
                     Practitioner for {procedure.description}
                  </span>
                  <select
                     required
                     value={choice}
                     onChange={(event) => setChoice(event.target.value)}>
                     <option value="">Choose…</option>
                     {options.map((p) => (
                        <option key={p.id} value={p.id}>
                           {p.firstName} {p.lastName} (
                           {professionLabel(p.profession)})
                        </option>
                     ))}
                  </select>
               </label>{' '}
               <button
                  className="button button-primary"
                  type="submit"
                  disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
               </button>
            </>
         ) : (
            <span>
               No eligible Practitioner on duty
               {procedure.allowedProfessions.length
                  ? ''
                  : ' (no Professions allowed yet)'}
               .
            </span>
         )}
      </form>
   );
}

export default StaffApeQueue;
