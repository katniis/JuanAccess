import { useEffect, useState } from 'react';
import ErrorState from './ErrorState.jsx';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import { usePortalFeedback } from '../contexts/usePortalFeedback.js';
import {
   getInsuranceVerificationQueue,
   verifyInsuranceCoverage,
} from '../services/staffInsurance.js';

function InsuranceVerificationQueue() {
   const { notify } = usePortalFeedback();
   const [coverage, setCoverage] = useState(null);
   const [pendingId, setPendingId] = useState(null);
   const [error, setError] = useState('');

   const refresh = async () =>
      setCoverage(await getInsuranceVerificationQueue());

   useEffect(() => {
      let active = true;
      getInsuranceVerificationQueue()
         .then((rows) => {
            if (active) setCoverage(rows);
         })
         .catch(() => {
            if (active) setError('The verification queue could not be loaded.');
         });
      return () => {
         active = false;
      };
   }, []);

   const verify = async (id, status) => {
      setPendingId(id);
      setError('');
      try {
         await verifyInsuranceCoverage(id, status);
         await refresh();
         notify({
            type: 'success',
            message: `Coverage simulated as ${status}.`,
         });
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setPendingId(null);
      }
   };

   if (error && !coverage) {
      return (
         <ErrorState
            title="Insurance verification couldn’t load"
            message={error}
         />
      );
   }
   if (!coverage)
      return (
         <LoadingSkeleton
            variant="queue"
            label="insurance verification queue"
         />
      );

   return (
      <section className="staff-card account-settings-card">
         <header className="staff-card-heading">
            <div>
               <h2>Insurance verification</h2>
               <p>
                  Admin-only local eligibility simulation; no payer is
                  contacted.
               </p>
            </div>
         </header>
         {coverage.length ? (
            <div className="account-settings-list">
               {coverage.map((item) => (
                  <article className="account-settings-list-row" key={item.id}>
                     <div>
                        <strong>
                           {item.patientFirstName} {item.patientLastName}
                        </strong>
                        <span>
                           {item.insurerName} · {item.planName}
                        </span>
                        <span>
                           Policy {item.policyNumber}
                           {item.memberId ? ` · Member ${item.memberId}` : ''}
                        </span>
                        {(item.coverageStart || item.coverageEnd) && (
                           <span>
                              Coverage{' '}
                              {item.coverageStart || 'start not provided'} –{' '}
                              {item.coverageEnd || 'no end date'}
                           </span>
                        )}
                     </div>
                     <div className="account-settings-actions">
                        <button
                           className="button button-outline"
                           type="button"
                           disabled={pendingId !== null}
                           onClick={() => void verify(item.id, 'active')}>
                           {pendingId === item.id
                              ? 'Checking…'
                              : 'Simulate active'}
                        </button>
                        <button
                           className="button button-outline"
                           type="button"
                           disabled={pendingId !== null}
                           onClick={() => void verify(item.id, 'inactive')}>
                           Simulate inactive
                        </button>
                     </div>
                  </article>
               ))}
            </div>
         ) : (
            <p className="staff-record-empty">
               No coverage is waiting for review.
            </p>
         )}
         {error && (
            <p className="auth-error" role="alert">
               {error}
            </p>
         )}
      </section>
   );
}

export default InsuranceVerificationQueue;
