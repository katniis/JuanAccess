import { useEffect, useState } from 'react';
import ErrorState from '../../components/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import { getFeeSchedule } from '../../services/priceList.js';
import {
   WEEKDAYS,
   deleteArrivalWindow,
   getArrivalWindows,
   saveArrivalWindow,
   saveProcedureCapacity,
} from '../../services/staffApeCapacity.js';

const emptyWindow = { name: '', startTime: '', endTime: '', isActive: true };
const hhmm = (time) => time?.slice(0, 5) ?? '';
const byStart = (a, b) => a.startTime.localeCompare(b.startTime);

// staff_admin editor for Arrival Windows and each Procedure's offered days and capacity.
function StaffApeCapacity() {
   const { notify } = usePortalFeedback();
   const [windows, setWindows] = useState(null);
   const [procedures, setProcedures] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [form, setForm] = useState(emptyWindow);
   const [pending, setPending] = useState(false);
   const [error, setError] = useState('');

   useEffect(() => {
      let current = true;
      Promise.all([getArrivalWindows(), getFeeSchedule()])
         .then(([windowList, procedureList]) => {
            if (!current) return;
            setWindows(windowList);
            setProcedures(procedureList);
         })
         .catch(() => current && setHasError(true));
      return () => {
         current = false;
      };
   }, []);

   const startEdit = (window) => {
      setEditingId(window?.id ?? null);
      setForm(
         window
            ? {
                 name: window.name,
                 startTime: hhmm(window.startTime),
                 endTime: hhmm(window.endTime),
                 isActive: window.isActive,
              }
            : emptyWindow,
      );
      setError('');
   };

   const submit = async (event) => {
      event.preventDefault();
      setPending(true);
      setError('');
      try {
         const saved = await saveArrivalWindow(editingId, form);
         setWindows((list) =>
            (editingId
               ? list.map((w) => (w.id === saved.id ? saved : w))
               : [...list, saved]
            ).sort(byStart),
         );
         startEdit(null);
         notify({ type: 'success', message: 'Arrival Window saved.' });
      } catch (requestError) {
         setError(requestError.message);
         notify({ type: 'error', message: requestError.message });
      } finally {
         setPending(false);
      }
   };

   const remove = async (window) => {
      try {
         await deleteArrivalWindow(window.id);
         setWindows((list) => list.filter((w) => w.id !== window.id));
         if (editingId === window.id) startEdit(null);
         notify({ type: 'success', message: 'Arrival Window deleted.' });
      } catch (requestError) {
         notify({ type: 'error', message: requestError.message });
      }
   };

   if (hasError)
      return (
         <ErrorState
            title="Arrival Windows couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!windows || !procedures)
      return <LoadingSkeleton variant="queue" label="Arrival Windows" />;

   return (
      <>
         <section className="staff-card staff-access-users">
            <header className="staff-card-heading">
               <div>
                  <h2>Arrival Windows</h2>
                  <p>
                     The blocks of time APE patients arrive in. Active windows
                     can’t overlap.
                  </p>
               </div>
               <button
                  className="button button-outline"
                  type="button"
                  onClick={() => startEdit(null)}>
                  New window
               </button>
            </header>
            {windows.length ? (
               <div className="staff-table-scroll">
                  <table className="staff-data-table">
                     <thead>
                        <tr>
                           <th>Name</th>
                           <th>Hours</th>
                           <th>Status</th>
                           <th>
                              <span className="sr-only">Actions</span>
                           </th>
                        </tr>
                     </thead>
                     <tbody>
                        {windows.map((w) => (
                           <tr key={w.id}>
                              <td>{w.name}</td>
                              <td>
                                 {hhmm(w.startTime)}–{hhmm(w.endTime)}
                              </td>
                              <td>{w.isActive ? 'Active' : 'Inactive'}</td>
                              <td>
                                 <button
                                    className="button button-outline"
                                    type="button"
                                    onClick={() => startEdit(w)}>
                                    Edit
                                 </button>{' '}
                                 <button
                                    className="button button-outline"
                                    type="button"
                                    onClick={() => remove(w)}>
                                    Delete
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <p className="staff-record-empty">No Arrival Windows yet.</p>
            )}
            <form className="staff-invite-form" onSubmit={submit}>
               <h3 className="staff-practitioner-form-title">
                  {editingId ? 'Edit Arrival Window' : 'New Arrival Window'}
               </h3>
               <label>
                  Name
                  <input
                     required
                     maxLength={100}
                     value={form.name}
                     onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                     }
                  />
               </label>
               <label>
                  Start time
                  <input
                     type="time"
                     required
                     value={form.startTime}
                     onChange={(event) =>
                        setForm({ ...form, startTime: event.target.value })
                     }
                  />
               </label>
               <label>
                  End time
                  <input
                     type="time"
                     required
                     value={form.endTime}
                     onChange={(event) =>
                        setForm({ ...form, endTime: event.target.value })
                     }
                  />
               </label>
               <label>
                  Status
                  <select
                     value={form.isActive ? 'active' : 'inactive'}
                     onChange={(event) =>
                        setForm({
                           ...form,
                           isActive: event.target.value === 'active',
                        })
                     }>
                     <option value="active">Active</option>
                     <option value="inactive">Inactive (hidden)</option>
                  </select>
               </label>
               <button
                  className="button button-primary"
                  type="submit"
                  disabled={pending}>
                  {pending ? 'Saving…' : 'Save window'}
               </button>
            </form>
            {error && (
               <p className="prior-auth-inline-error" role="alert">
                  {error}
               </p>
            )}
         </section>

         <section className="staff-card staff-access-users">
            <header className="staff-card-heading">
               <div>
                  <h2>Procedure capacity</h2>
                  <p>
                     The days each Procedure is offered and how many patients it
                     can take in each Arrival Window.
                  </p>
               </div>
            </header>
            {procedures.length ? (
               <div className="staff-table-scroll">
                  <table className="staff-data-table">
                     <thead>
                        <tr>
                           <th>Procedure</th>
                           <th>Offered days and capacity per window</th>
                        </tr>
                     </thead>
                     <tbody>
                        {procedures.map((procedure) => (
                           <tr key={procedure.id}>
                              <td>{procedure.description}</td>
                              <td>
                                 <ProcedureCapacityForm
                                    procedure={procedure}
                                    notify={notify}
                                 />
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <p className="staff-record-empty">No Procedures yet.</p>
            )}
         </section>
      </>
   );
}

function ProcedureCapacityForm({ procedure, notify }) {
   const [days, setDays] = useState(procedure.offeredDays ?? []);
   const [capacity, setCapacity] = useState(procedure.capacityPerWindow ?? 0);
   const [pending, setPending] = useState(false);

   const toggleDay = (day) =>
      setDays((list) =>
         list.includes(day)
            ? list.filter((d) => d !== day)
            : [...list, day].sort(),
      );

   const save = async (event) => {
      event.preventDefault();
      setPending(true);
      try {
         await saveProcedureCapacity(procedure.id, days, Number(capacity));
         notify({
            type: 'success',
            message: `${procedure.description} capacity saved.`,
         });
      } catch (requestError) {
         notify({ type: 'error', message: requestError.message });
      } finally {
         setPending(false);
      }
   };

   return (
      <form onSubmit={save}>
         <fieldset>
            <legend className="sr-only">
               Days {procedure.description} is offered
            </legend>
            {WEEKDAYS.map((label, day) => (
               <label key={label}>
                  <input
                     type="checkbox"
                     checked={days.includes(day)}
                     onChange={() => toggleDay(day)}
                  />{' '}
                  {label}{' '}
               </label>
            ))}
         </fieldset>
         <label>
            Capacity per window{' '}
            <input
               type="number"
               min={0}
               step={1}
               required
               value={capacity}
               onChange={(event) => setCapacity(event.target.value)}
            />
         </label>{' '}
         <button
            className="button button-outline"
            type="submit"
            disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
         </button>
      </form>
   );
}

export default StaffApeCapacity;
