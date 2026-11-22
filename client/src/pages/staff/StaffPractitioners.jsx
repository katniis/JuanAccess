import { useEffect, useState } from 'react';
import ErrorState from '../../components/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import {
   PROFESSIONS,
   getPractitioners,
   savePractitioner,
   uploadPractitionerPhoto,
} from '../../services/staffPractitioners.js';

const emptyForm = {
   first_name: '',
   last_name: '',
   profession: 'physician',
   specialty: '',
   education: '',
   prc_license_number: '',
   board_certifications: '',
   practice_start_year: '',
   background: '',
   consultation_fee: '',
   is_active: true,
};

const toForm = (p) => ({
   first_name: p.firstName ?? '',
   last_name: p.lastName ?? '',
   profession: p.profession ?? 'physician',
   specialty: p.specialty ?? '',
   education: p.education ?? '',
   prc_license_number: p.prcLicenseNumber ?? '',
   board_certifications: p.boardCertifications ?? '',
   practice_start_year: p.practiceStartYear ?? '',
   background: p.background ?? '',
   consultation_fee: p.consultationFee ?? '',
   is_active: p.isActive ?? true,
});

// Blank optional fields are sent as null so they can be cleared.
const toBody = (form) => ({
   ...form,
   practice_start_year:
      form.practice_start_year === '' ? null : Number(form.practice_start_year),
   consultation_fee:
      form.consultation_fee === '' ? null : Number(form.consultation_fee),
   prc_license_number: form.prc_license_number || null,
});

const professionLabel = (value) =>
   PROFESSIONS.find(([key]) => key === value)?.[1] ?? value;

function StaffPractitioners() {
   const { notify } = usePortalFeedback();
   const [practitioners, setPractitioners] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [form, setForm] = useState(emptyForm);
   const [photo, setPhoto] = useState(null);
   const [pending, setPending] = useState(false);
   const [error, setError] = useState('');

   useEffect(() => {
      let current = true;
      getPractitioners()
         .then((list) => current && setPractitioners(list))
         .catch(() => current && setHasError(true));
      return () => {
         current = false;
      };
   }, []);

   const field = (key) => ({
      value: form[key],
      onChange: (event) => setForm({ ...form, [key]: event.target.value }),
   });

   const startEdit = (practitioner) => {
      setEditingId(practitioner?.id ?? null);
      setForm(practitioner ? toForm(practitioner) : emptyForm);
      setPhoto(null);
      setError('');
   };

   const submit = async (event) => {
      event.preventDefault();
      setPending(true);
      setError('');
      try {
         let saved = await savePractitioner(editingId, toBody(form));
         if (photo) saved = await uploadPractitionerPhoto(saved.id, photo);
         setPractitioners((list) =>
            editingId
               ? list.map((p) => (p.id === saved.id ? saved : p))
               : [...list, saved],
         );
         startEdit(saved);
         notify({ type: 'success', message: 'Practitioner saved.' });
      } catch (requestError) {
         setError(requestError.message);
         notify({ type: 'error', message: requestError.message });
      } finally {
         setPending(false);
      }
   };

   if (hasError)
      return (
         <ErrorState
            title="Practitioners couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!practitioners)
      return <LoadingSkeleton variant="queue" label="practitioners" />;

   const isPhysician = form.profession === 'physician';

   return (
      <section className="staff-card staff-access-users">
         <header className="staff-card-heading">
            <div>
               <h2>Practitioners</h2>
               <p>
                  Manage Practitioners and the Doctor Profiles shown in the
                  Doctor Directory.
               </p>
            </div>
            <button
               className="button button-outline"
               type="button"
               onClick={() => startEdit(null)}>
               New practitioner
            </button>
         </header>
         {practitioners.length ? (
            <div className="staff-table-scroll">
               <table className="staff-data-table">
                  <thead>
                     <tr>
                        <th>Name</th>
                        <th>Profession</th>
                        <th>Status</th>
                        <th>
                           <span className="sr-only">Actions</span>
                        </th>
                     </tr>
                  </thead>
                  <tbody>
                     {practitioners.map((p) => (
                        <tr key={p.id}>
                           <td>
                              {p.firstName} {p.lastName}
                           </td>
                           <td>{professionLabel(p.profession)}</td>
                           <td>{p.isActive ? 'Active' : 'Inactive'}</td>
                           <td>
                              <button
                                 className="button button-outline"
                                 type="button"
                                 onClick={() => startEdit(p)}>
                                 Edit
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         ) : (
            <p className="staff-record-empty">No practitioners yet.</p>
         )}
         <form className="staff-invite-form" onSubmit={submit}>
            <h3 className="staff-practitioner-form-title">
               {editingId ? 'Edit practitioner' : 'New practitioner'}
            </h3>
            <label>
               First name
               <input required maxLength={100} {...field('first_name')} />
            </label>
            <label>
               Last name
               <input required maxLength={100} {...field('last_name')} />
            </label>
            <label>
               Profession
               <select {...field('profession')}>
                  {PROFESSIONS.map(([value, label]) => (
                     <option key={value} value={value}>
                        {label}
                     </option>
                  ))}
               </select>
            </label>
            <label>
               Status
               <select
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(event) =>
                     setForm({
                        ...form,
                        is_active: event.target.value === 'active',
                     })
                  }>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (hidden)</option>
               </select>
            </label>
            {isPhysician && (
               <>
                  <label>
                     Specialization
                     <input maxLength={100} {...field('specialty')} />
                  </label>
                  <label>
                     PRC license number
                     <input
                        inputMode="numeric"
                        pattern="\d{7}"
                        title="7 digits"
                        maxLength={7}
                        {...field('prc_license_number')}
                     />
                  </label>
                  <label>
                     Practice start year
                     <input
                        type="number"
                        min={1950}
                        max={new Date().getFullYear()}
                        {...field('practice_start_year')}
                     />
                  </label>
                  <label>
                     Consultation Fee (PHP)
                     <input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field('consultation_fee')}
                     />
                  </label>
                  <label>
                     Education
                     <textarea
                        rows={2}
                        maxLength={2000}
                        {...field('education')}
                     />
                  </label>
                  <label>
                     Board certifications
                     <textarea
                        rows={2}
                        maxLength={2000}
                        {...field('board_certifications')}
                     />
                  </label>
                  <label>
                     Background
                     <textarea
                        rows={3}
                        maxLength={4000}
                        {...field('background')}
                     />
                  </label>
                  <label>
                     Photo (PNG, JPEG or WebP, up to 2 MB)
                     <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) =>
                           setPhoto(event.target.files?.[0] ?? null)
                        }
                     />
                  </label>
               </>
            )}
            <button
               className="button button-primary"
               type="submit"
               disabled={pending}>
               {pending ? 'Saving…' : 'Save practitioner'}
            </button>
         </form>
         {error && (
            <p className="prior-auth-inline-error" role="alert">
               {error}
            </p>
         )}
      </section>
   );
}

export default StaffPractitioners;
