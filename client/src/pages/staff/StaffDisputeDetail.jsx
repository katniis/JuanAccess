import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import { getStaffDisputeDetail } from '../../services/staffDisputes.js';

const phpFormatter = new Intl.NumberFormat('en-PH', {
   style: 'currency',
   currency: 'PHP',
});

function StaffDisputeDetail() {
   const { disputeId } = useParams();
   const [dispute, setDispute] = useState(undefined);
   const [hasError, setHasError] = useState(false);
   const pageRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(dispute));

   useEffect(() => {
      let current = true;

      getStaffDisputeDetail(disputeId)
         .then((data) => {
            if (current) setDispute(data);
         })
         .catch(() => {
            if (current) setHasError(true);
         });

      return () => {
         current = false;
      };
   }, [disputeId]);

   if (hasError) {
      return (
         <ErrorState
            title="This dispute couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   }

   if (dispute === undefined) {
      return (
         <LoadingSkeleton variant="dispute-detail" label="dispute details" />
      );
   }

   if (!dispute) {
      return (
         <div className="staff-dispute-detail-page">
            <Link className="staff-dispute-back" to="/staff/disputes">
               <Icon name="chevron-left" /> Back to Disputes
            </Link>
            <ErrorState
               compact
               title="Dispute not found"
               message="This dispute may have been removed or the link may be out of date."
               onRetry={null}>
               <Link className="button button-outline" to="/staff/disputes">
                  Back to disputes
               </Link>
            </ErrorState>
         </div>
      );
   }

   return (
      <div className="staff-dispute-detail-page" ref={pageRef}>
         <Link className="staff-dispute-back" to="/staff/disputes">
            <Icon name="chevron-left" /> Back to Disputes
         </Link>

         <header className="staff-dispute-detail-heading">
            <h1>{dispute.patient} — Dispute Detail</h1>
            <span className="staff-readonly-badge">
               <Icon name="lock" />
               View Only
            </span>
         </header>

         <section
            className="staff-dispute-detail-card"
            aria-label="Disputed bill line items">
            <div className="staff-dispute-detail-table-scroll">
               <table className="staff-dispute-detail-table">
                  <thead>
                     <tr>
                        <th scope="col">Code</th>
                        <th scope="col">Description</th>
                        <th scope="col">Billed</th>
                        <th scope="col">Flag review note</th>
                     </tr>
                  </thead>
                  <tbody>
                     {dispute.lineItems.map((item) => (
                        <tr key={item.id}>
                           <td>
                              <code>{item.code}</code>
                           </td>
                           <td>{item.description}</td>
                           <td>{phpFormatter.format(Number(item.billed))}</td>
                           <td>{item.flagReason || '—'}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </section>

         <section
            className="staff-dispute-letter-card"
            aria-label="Patient-filed dispute letter">
            <p className="staff-dispute-letter-notice">
               <Icon name="lock" />
               Read-only — Dispute letter as filed by patient
            </p>
            <p className="staff-dispute-letter-content">{dispute.letter}</p>
         </section>
      </div>
   );
}

export default StaffDisputeDetail;
