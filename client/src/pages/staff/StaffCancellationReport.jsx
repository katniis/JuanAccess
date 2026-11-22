import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import {
   getCancellationReport,
   getReportFilterOptions,
} from '../../services/staffReports.js';

const reasonLabels = {
   schedule_conflict: 'Schedule conflict',
   feeling_better: 'Feeling better',
   cost: 'Cost',
   found_another_clinic: 'Found another clinic',
   transport: 'Transport',
   practitioner_unavailable: 'Practitioner unavailable',
   patient_request: 'Patient request',
   clinic_closure: 'Clinic closure',
   other: 'Other',
   unspecified: 'Not recorded',
};
const cancelledByLabels = {
   patient: 'Patient',
   staff: 'Staff',
   unknown: 'Not recorded',
};

function CountTable({ caption, rows, labelOf }) {
   return (
      <div className="staff-table-scroll">
         <table className="staff-data-table">
            <caption>{caption}</caption>
            <thead>
               <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Count</th>
               </tr>
            </thead>
            <tbody>
               {rows.map((row) => (
                  <tr key={labelOf(row)}>
                     <td>{labelOf(row)}</td>
                     <td>{row.count}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}

function StaffCancellationReport() {
   const { role } = useOutletContext();
   const [options, setOptions] = useState({
      visitTypes: [],
      practitioners: [],
   });
   const [filters, setFilters] = useState({
      from: '',
      to: '',
      visitTypeId: '',
      practitionerId: '',
   });
   const [report, setReport] = useState(null);
   const [error, setError] = useState('');

   useEffect(() => {
      if (role !== 'staff_admin') return;
      getReportFilterOptions()
         .then(setOptions)
         .catch(() => {});
   }, [role]);

   useEffect(() => {
      if (role !== 'staff_admin') return;
      let current = true;
      getCancellationReport(filters)
         .then((data) => {
            if (!current) return;
            setError('');
            setReport(data);
         })
         .catch(
            (err) =>
               current && setError(err.message || 'The report couldn’t load.'),
         );
      return () => {
         current = false;
      };
   }, [filters, role]);

   if (role !== 'staff_admin') return <Navigate to="/staff" replace />;

   const setFilter = (key) => (event) =>
      setFilters((value) => ({ ...value, [key]: event.target.value }));

   return (
      <div className="account-settings-page">
         <header className="staff-schedule-heading">
            <h1>Cancellation report</h1>
            <p>
               Cancellation Reasons by category and by who cancelled. Dates are
               clinic (Manila) days.
            </p>
         </header>
         <section className="staff-card" aria-label="Report filters">
            <form
               className="staff-invite-form"
               onSubmit={(event) => event.preventDefault()}>
               <label>
                  From
                  <input
                     type="date"
                     value={filters.from}
                     onChange={setFilter('from')}
                  />
               </label>
               <label>
                  To
                  <input
                     type="date"
                     value={filters.to}
                     onChange={setFilter('to')}
                  />
               </label>
               <label>
                  Visit type
                  <select
                     value={filters.visitTypeId}
                     onChange={setFilter('visitTypeId')}>
                     <option value="">All</option>
                     {options.visitTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                           {type.name}
                        </option>
                     ))}
                  </select>
               </label>
               <label>
                  Practitioner
                  <select
                     value={filters.practitionerId}
                     onChange={setFilter('practitionerId')}>
                     <option value="">All</option>
                     {options.practitioners.map((p) => (
                        <option key={p.id} value={p.id}>
                           {p.firstName} {p.lastName}
                        </option>
                     ))}
                  </select>
               </label>
            </form>
         </section>
         {error ? (
            <ErrorState title="Report couldn’t load" message={error} />
         ) : !report ? (
            <LoadingSkeleton variant="queue" label="cancellation report" />
         ) : (
            <section className="staff-card" aria-live="polite">
               <header className="staff-card-heading">
                  <div>
                     <h2>{report.total} cancellations</h2>
                  </div>
               </header>
               {report.total === 0 ? (
                  <p className="staff-record-empty">
                     No cancellations match these filters.
                  </p>
               ) : (
                  <>
                     <CountTable
                        caption="By Cancellation Reason"
                        rows={report.byReason}
                        labelOf={(row) =>
                           reasonLabels[row.reason] ?? row.reason
                        }
                     />
                     <CountTable
                        caption="By who cancelled"
                        rows={report.byCancelledBy}
                        labelOf={(row) => cancelledByLabels[row.cancelledBy]}
                     />
                     <h3>“Other” reasons</h3>
                     {report.otherEntries.length ? (
                        <ul>
                           {report.otherEntries.map((entry) => (
                              <li key={entry.appointmentId}>
                                 {entry.date ?? 'Date not recorded'} ·{' '}
                                 {entry.visitType} ·{' '}
                                 {cancelledByLabels[entry.cancelledBy]}:{' '}
                                 {entry.reasonText}
                              </li>
                           ))}
                        </ul>
                     ) : (
                        <p className="staff-record-empty">
                           No “Other” reasons in this range.
                        </p>
                     )}
                  </>
               )}
            </section>
         )}
      </div>
   );
}

export default StaffCancellationReport;
