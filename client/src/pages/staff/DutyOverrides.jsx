import { useEffect, useState } from 'react';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import {
   createDutyOverride,
   deleteDutyOverride,
   getDutyOverrides,
} from '../../services/staffSchedule.js';

const hours = (time) => String(time || '').slice(0, 5);

function DutyOverrides({ practitioner, defaultDate }) {
   const { notify } = usePortalFeedback();
   const [overrides, setOverrides] = useState(null);
   const [pending, setPending] = useState(false);
   const [error, setError] = useState('');
   const [form, setForm] = useState({
      overrideDate: defaultDate,
      isDayOff: true,
      startTime: '08:00',
      endTime: '17:00',
   });

   useEffect(() => {
      let current = true;
      getDutyOverrides(practitioner.id)
         .then((list) => current && setOverrides(list))
         .catch(() => current && setError('Duty overrides couldn’t load.'));
      return () => {
         current = false;
      };
   }, [practitioner.id]);

   const submit = async (event) => {
      event.preventDefault();
      setPending(true);
      setError('');
      try {
         const created = await createDutyOverride({
            providerId: practitioner.id,
            overrideDate: form.overrideDate,
            isDayOff: form.isDayOff,
            startTime: form.isDayOff ? null : form.startTime,
            endTime: form.isDayOff ? null : form.endTime,
         });
         setOverrides((list) =>
            [...(list || []), created].sort((a, b) =>
               a.overrideDate.localeCompare(b.overrideDate),
            ),
         );
         notify({ type: 'success', message: 'Duty override saved.' });
      } catch {
         setError(
            'The override couldn’t be saved. Each date can have one override, and custom hours must end after they start.',
         );
      } finally {
         setPending(false);
      }
   };

   const remove = async (id) => {
      setError('');
      try {
         await deleteDutyOverride(id);
         setOverrides((list) => list.filter((item) => item.id !== id));
      } catch {
         setError('The override couldn’t be removed.');
      }
   };

   return (
      <section className="staff-card" aria-label="Duty Schedule overrides">
         <header className="staff-card-heading">
            <div>
               <h2>Duty Schedule overrides</h2>
               <p>
                  A day off or custom hours on a date replaces the weekly hours
                  for that date.
               </p>
            </div>
         </header>
         <form className="staff-invite-form" onSubmit={submit}>
            <label>
               Date
               <input
                  type="date"
                  required
                  value={form.overrideDate}
                  onChange={(event) =>
                     setForm({ ...form, overrideDate: event.target.value })
                  }
               />
            </label>
            <label>
               <input
                  type="checkbox"
                  checked={form.isDayOff}
                  onChange={(event) =>
                     setForm({ ...form, isDayOff: event.target.checked })
                  }
               />{' '}
               Day off
            </label>
            {!form.isDayOff && (
               <>
                  <label>
                     Start
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
                     End
                     <input
                        type="time"
                        required
                        value={form.endTime}
                        onChange={(event) =>
                           setForm({ ...form, endTime: event.target.value })
                        }
                     />
                  </label>
               </>
            )}
            <button
               className="button button-primary"
               type="submit"
               disabled={pending}>
               {pending ? 'Saving…' : 'Add override'}
            </button>
         </form>
         {error && (
            <p className="prior-auth-inline-error" role="alert">
               {error}
            </p>
         )}
         {overrides?.length ? (
            <ul>
               {overrides.map((item) => (
                  <li key={item.id}>
                     {item.overrideDate}:{' '}
                     {item.isDayOff
                        ? 'Day off'
                        : `${hours(item.startTime)}–${hours(item.endTime)}`}{' '}
                     <button
                        className="button button-outline"
                        type="button"
                        onClick={() => remove(item.id)}>
                        Remove
                     </button>
                  </li>
               ))}
            </ul>
         ) : (
            overrides && (
               <p className="staff-record-empty">No overrides scheduled.</p>
            )
         )}
      </section>
   );
}

export default DutyOverrides;
