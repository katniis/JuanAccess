import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import { getStaffDisputes } from '../../services/staffDisputes.js';

function issueTone(issue) {
   if (issue === 'Duplicate') return 'duplicate';
   if (issue === 'Coding Error') return 'coding';
   if (issue === 'Not Performed') return 'not-performed';
   if (issue === 'Overcharge') return 'overcharge';
   return 'review-needed';
}

function statusTone(status) {
   if (status === 'Resolved') return 'resolved';
   if (status === 'Sent' || status === 'Submitted') return 'sent';
   return 'drafted';
}

function StaffDisputes() {
   const [disputes, setDisputes] = useState(null);
   const [hasError, setHasError] = useState(false);
   const pageRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(disputes));

   useEffect(() => {
      let current = true;

      getStaffDisputes()
         .then((data) => {
            if (current) setDisputes(data);
         })
         .catch(() => {
            if (current) setHasError(true);
         });

      return () => {
         current = false;
      };
   }, []);

   if (hasError) {
      return (
         <ErrorState
            title="Billing disputes couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   }

   if (!disputes) {
      return <LoadingSkeleton variant="disputes" label="billing disputes" />;
   }

   return (
      <div className="staff-disputes-page" ref={pageRef}>
         <header className="staff-disputes-page-heading">
            <div className="staff-schedule-heading">
               <h1>Disputes</h1>
               <p>Patient-filed billing disputes. Staff view is read-only.</p>
            </div>
            <span className="staff-readonly-badge">
               <Icon name="lock" />
               View Only — No actions available
            </span>
         </header>

         <section
            className="staff-disputes-card"
            aria-label="Patient billing disputes">
            <div className="staff-disputes-table-scroll">
               <table className="staff-disputes-table">
                  <thead>
                     <tr>
                        <th scope="col">Patient</th>
                        <th scope="col">Bill Date</th>
                        <th scope="col">Flagged Issues</th>
                        <th scope="col">Status</th>
                        <th scope="col">
                           <span className="sr-only">Details</span>
                        </th>
                     </tr>
                  </thead>
                  <tbody>
                     {disputes.map((dispute) => (
                        <tr key={dispute.id}>
                           <td>{dispute.patient}</td>
                           <td>
                              {new Intl.DateTimeFormat('en-PH', {
                                 month: 'short',
                                 day: 'numeric',
                                 year: 'numeric',
                                 timeZone: 'Asia/Manila',
                              }).format(new Date(dispute.billDate))}
                           </td>
                           <td>
                              <div className="staff-dispute-issues">
                                 {dispute.flaggedIssues.map((issue) => (
                                    <span
                                       className={`staff-dispute-issue ${issueTone(issue)}`}
                                       key={issue}>
                                       {issue}
                                    </span>
                                 ))}
                              </div>
                           </td>
                           <td>
                              <span
                                 className={`staff-dispute-status ${statusTone(dispute.status)}`}>
                                 {dispute.status}
                              </span>
                           </td>
                           <td>
                              <Link
                                 className="staff-dispute-view-link"
                                 to={`/staff/disputes/${dispute.id}`}>
                                 View Details
                              </Link>
                           </td>
                        </tr>
                     ))}
                     {!disputes.length && (
                        <tr>
                           <td className="staff-disputes-empty" colSpan={5}>
                              No patient disputes have been submitted yet.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </section>
      </div>
   );
}

export default StaffDisputes;
