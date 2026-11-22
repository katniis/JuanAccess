import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth.js';
import {
   deleteApePackage,
   formatPeso,
   getApePackages,
   getFeeSchedule,
   getPriceList,
   HMO_NOTE,
   saveApePackage,
   saveProcedurePrice,
} from '../services/priceList.js';
import { sexAtBirthOptions } from '../utils/patientSex.js';

function PriceList() {
   const { user } = useAuth();
   const isAdmin = user?.role === 'staff_admin';
   const [priceList, setPriceList] = useState(null);
   const [error, setError] = useState('');
   const [reloadKey, setReloadKey] = useState(0);

   useEffect(() => {
      let current = true;
      Promise.all([getPriceList(), isAdmin ? getFeeSchedule() : null])
         .then(([list, feeSchedule]) => {
            // Admins edit by id, which only the staff fee schedule carries.
            if (current)
               setPriceList(
                  feeSchedule ? { ...list, procedures: feeSchedule } : list,
               );
         })
         .catch(() => {
            if (current) setError('The Price List could not be loaded.');
         });
      return () => {
         current = false;
      };
   }, [isAdmin, reloadKey]);

   return (
      <main className="privacy-policy">
         <header className="auth-brand">
            <Link className="auth-brand-mark" to="/" aria-label="JuanAccess">
               <img src="/juanaccess-logo.svg" alt="JuanAccess" />
            </Link>
         </header>

         <article>
            <h1>Price List</h1>
            <p className="privacy-policy-draft" role="note">
               {HMO_NOTE}
            </p>
            {error && <p role="alert">{error}</p>}
            {!priceList && !error && <p role="status">Loading prices…</p>}
            {priceList && (
               <>
                  <h2>Consultation Fees</h2>
                  <table className="price-list-table">
                     <tbody>
                        {priceList.consultationFees.map((doctor) => (
                           <tr key={doctor.id}>
                              <th scope="row">
                                 Dr. {doctor.firstName} {doctor.lastName}
                                 {doctor.specialty && (
                                    <small> · {doctor.specialty}</small>
                                 )}
                              </th>
                              <td>{formatPeso(doctor.consultationFee)}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>

                  <h2>Procedures</h2>
                  <table className="price-list-table">
                     <tbody>
                        {priceList.procedures.map((procedure) => (
                           <tr key={procedure.procedureCode}>
                              <th scope="row">{procedure.description}</th>
                              <td>
                                 {isAdmin ? (
                                    <ProcedurePriceInput
                                       procedure={procedure}
                                    />
                                 ) : (
                                    formatPeso(procedure.standardCost)
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>

                  {priceList.apePackages.length > 0 && <h2>APE Packages</h2>}
                  {priceList.apePackages.map((apePackage) => (
                     <ApePackageCard
                        key={apePackage.id}
                        apePackage={apePackage}
                     />
                  ))}

                  {isAdmin && (
                     <ApePackageEditor
                        procedures={priceList.procedures}
                        reloadKey={reloadKey}
                        onSaved={() => setReloadKey((key) => key + 1)}
                     />
                  )}
               </>
            )}
         </article>
      </main>
   );
}

function ProcedurePriceInput({ procedure }) {
   const [value, setValue] = useState(procedure.standardCost);
   const [status, setStatus] = useState('');

   const save = async (event) => {
      event.preventDefault();
      setStatus('Saving…');
      try {
         await saveProcedurePrice(procedure.id, value);
         setStatus('Saved');
      } catch (saveError) {
         setStatus(saveError.message);
      }
   };

   return (
      <form onSubmit={save}>
         <label>
            <span className="sr-only">Price of {procedure.description}</span>
            <input
               type="number"
               min="0"
               step="0.01"
               required
               value={value}
               onChange={(event) => setValue(event.target.value)}
            />
         </label>
         <button className="button button-outline" type="submit">
            Save
         </button>
         <span role="status">{status}</span>
      </form>
   );
}

const sexLabel = (sex) =>
   sexAtBirthOptions.find(([value]) => value === sex)?.[1];

// Package Price next to the itemized sum; sex-specific Procedures can make the sum differ by Sex at Birth.
function ApePackageCard({ apePackage }) {
   const { itemizedSum, savings } = apePackage;
   const sexes =
      itemizedSum.female === itemizedSum.male ? [null] : ['female', 'male'];
   return (
      <section>
         <h3>{apePackage.name}</h3>
         <table className="price-list-table">
            <tbody>
               {apePackage.procedures.map((procedure) => (
                  <tr key={procedure.procedureCode}>
                     <th scope="row">
                        {procedure.description}
                        {procedure.sexAtBirth && (
                           <small>
                              {' '}
                              · {sexLabel(procedure.sexAtBirth)} only
                           </small>
                        )}
                     </th>
                     <td>{formatPeso(procedure.standardCost)}</td>
                  </tr>
               ))}
               {sexes.map((sex) => (
                  <tr key={sex ?? 'all'}>
                     <th scope="row">
                        Itemized sum{sex && ` (${sexLabel(sex)})`}
                     </th>
                     <td>{formatPeso(itemizedSum[sex ?? 'female'])}</td>
                  </tr>
               ))}
               <tr>
                  <th scope="row">Package Price</th>
                  <td>
                     <strong>{formatPeso(apePackage.packagePrice)}</strong>
                  </td>
               </tr>
               {sexes.map(
                  (sex) =>
                     Number(savings[sex ?? 'female']) > 0 && (
                        <tr key={`savings-${sex ?? 'all'}`}>
                           <th scope="row">
                              You save{sex && ` (${sexLabel(sex)})`}
                           </th>
                           <td>{formatPeso(savings[sex ?? 'female'])}</td>
                        </tr>
                     ),
               )}
            </tbody>
         </table>
      </section>
   );
}

function ApePackageEditor({ procedures, reloadKey, onSaved }) {
   const [apePackages, setApePackages] = useState(null);
   const [error, setError] = useState('');

   useEffect(() => {
      let current = true;
      getApePackages()
         .then((list) => {
            if (current) setApePackages(list);
         })
         .catch(() => {
            if (current) setError('APE Packages could not be loaded.');
         });
      return () => {
         current = false;
      };
   }, [reloadKey]);

   return (
      <section>
         <h2>Manage APE Packages</h2>
         {error && <p role="alert">{error}</p>}
         {apePackages?.map((apePackage) => (
            <ApePackageForm
               key={`${apePackage.id}-${reloadKey}`}
               apePackage={apePackage}
               procedures={procedures}
               onSaved={onSaved}
            />
         ))}
         {apePackages && (
            <ApePackageForm
               key={`new-${reloadKey}`}
               procedures={procedures}
               onSaved={onSaved}
            />
         )}
      </section>
   );
}

function ApePackageForm({ apePackage, procedures, onSaved }) {
   const [name, setName] = useState(apePackage?.name ?? '');
   const [packagePrice, setPackagePrice] = useState(
      apePackage?.packagePrice ?? '',
   );
   const [isActive, setIsActive] = useState(apePackage?.isActive ?? true);
   // feeScheduleId -> sexAtBirth ('' for everyone); absent means not in the package.
   const [selected, setSelected] = useState(
      () =>
         new Map(
            (apePackage?.procedures ?? []).map((p) => [
               p.feeScheduleId,
               p.sexAtBirth ?? '',
            ]),
         ),
   );
   const [status, setStatus] = useState('');
   const title = apePackage ? apePackage.name : 'New APE Package';

   const setProcedure = (id, sex) =>
      setSelected((previous) => {
         const next = new Map(previous);
         if (sex === undefined) next.delete(id);
         else next.set(id, sex);
         return next;
      });

   const save = async (event) => {
      event.preventDefault();
      if (!selected.size) {
         setStatus('Pick at least one Procedure.');
         return;
      }
      setStatus('Saving…');
      try {
         await saveApePackage(apePackage?.id, {
            name,
            packagePrice,
            isActive,
            procedures: [...selected].map(([feeScheduleId, sex]) => ({
               feeScheduleId,
               sexAtBirth: sex || null,
            })),
         });
         onSaved();
      } catch (saveError) {
         setStatus(saveError.message);
      }
   };

   const remove = async () => {
      if (!window.confirm(`Delete the ${apePackage.name} package?`)) return;
      try {
         await deleteApePackage(apePackage.id);
         onSaved();
      } catch (deleteError) {
         setStatus(deleteError.message);
      }
   };

   return (
      <form onSubmit={save}>
         <fieldset>
            <legend>{title}</legend>
            <label>
               Name
               <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
               />
            </label>
            <label>
               Package Price (PHP)
               <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={packagePrice}
                  onChange={(event) => setPackagePrice(event.target.value)}
               />
            </label>
            <label>
               <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
               />
               Active (shown on the Price List)
            </label>
            <table className="price-list-table">
               <tbody>
                  {procedures.map((procedure) => {
                     const sex = selected.get(procedure.id);
                     return (
                        <tr key={procedure.id}>
                           <th scope="row">
                              <label>
                                 <input
                                    type="checkbox"
                                    checked={sex !== undefined}
                                    onChange={(event) =>
                                       setProcedure(
                                          procedure.id,
                                          event.target.checked ? '' : undefined,
                                       )
                                    }
                                 />
                                 {procedure.description}
                              </label>
                           </th>
                           <td>
                              <label>
                                 <span className="sr-only">
                                    Who gets {procedure.description} in {title}
                                 </span>
                                 <select
                                    disabled={sex === undefined}
                                    value={sex ?? ''}
                                    onChange={(event) =>
                                       setProcedure(
                                          procedure.id,
                                          event.target.value,
                                       )
                                    }>
                                    <option value="">Everyone</option>
                                    {sexAtBirthOptions.map(([value, label]) => (
                                       <option key={value} value={value}>
                                          {label} only
                                       </option>
                                    ))}
                                 </select>
                              </label>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
            <button className="button button-outline" type="submit">
               {apePackage ? 'Save package' : 'Add package'}
            </button>
            {apePackage && (
               <button
                  className="button button-outline"
                  type="button"
                  onClick={remove}>
                  Delete
               </button>
            )}
            <span role="status">{status}</span>
         </fieldset>
      </form>
   );
}

export default PriceList;
