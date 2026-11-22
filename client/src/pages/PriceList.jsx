import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth.js';
import {
   formatPeso,
   getFeeSchedule,
   getPriceList,
   HMO_NOTE,
   saveProcedurePrice,
} from '../services/priceList.js';

function PriceList() {
   const { user } = useAuth();
   const isAdmin = user?.role === 'staff_admin';
   const [priceList, setPriceList] = useState(null);
   const [error, setError] = useState('');

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
   }, [isAdmin]);

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

                  {/* APE Packages and their Package Price go here (ticket #19). */}
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

export default PriceList;
