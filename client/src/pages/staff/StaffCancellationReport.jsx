import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import StatusPill from '../../components/StatusPill.jsx';
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
// Reuse the existing status-pill colours: blue for patients, amber for staff, grey when unknown.
const cancelledByPill = {
   patient: 'active',
   staff: 'pending',
   unknown: 'waitlisted',
};
const emptyFilters = {
   from: '',
   to: '',
   visitTypeId: '',
   practitionerId: '',
};

const percentOf = (count, total) =>
   total ? Math.round((count / total) * 100) : 0;

function CancelledByPill({ who }) {
   return (
      <StatusPill status={cancelledByPill[who] ?? 'waitlisted'}>
         {cancelledByLabels[who] ?? 'Not recorded'}
      </StatusPill>
   );
}

function StaffCancellationReport() {
   const { role } = useOutletContext();
   const [options, setOptions] = useState({
      visitTypes: [],
      practitioners: [],
   });
   const [filters, setFilters] = useState(emptyFilters);
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
   const hasFilters = Object.values(filters).some(Boolean);

   const total = report?.total ?? 0;
   const countFor = (who) =>
      report?.byCancelledBy.find((row) => row.cancelledBy === who)?.count ?? 0;
   // Rows arrive sorted by count; skip "Not recorded" so the top reason is a real one.
   const topReason = report?.byReason.find(
      (row) => row.reason !== 'unspecified',
   );
   const stats = [
      {
         title: 'Total cancellations',
         icon: 'calendar',
         value: total,
         detail: hasFilters ? 'Matching these filters' : 'All recorded dates',
      },
      {
         title: 'Cancelled by patients',
         icon: 'user',
         value: countFor('patient'),
         detail: `${percentOf(countFor('patient'), total)}% of cancellations`,
      },
      {
         title: 'Cancelled by staff',
         icon: 'settings',
         value: countFor('staff'),
         detail: `${percentOf(countFor('staff'), total)}% of cancellations`,
      },
      {
         title: 'Top reason',
         icon: 'info',
         value: topReason ? topReason.count : '—',
         detail: topReason
            ? (reasonLabels[topReason.reason] ?? topReason.reason)
            : 'No reason recorded yet',
      },
   ];

   return (
      <div className="account-settings-page staff-report-page">
         <header className="staff-schedule-heading">
            <h1>Cancellation report</h1>
            <p>
               Cancellation reasons by category and by who cancelled. Dates are
               clinic (Manila) days.
            </p>
         </header>

         <section
            className="staff-card staff-report-card"
            aria-labelledby="report-filters-heading">
            <header className="staff-card-heading">
               <div>
                  <h2 id="report-filters-heading">Filters</h2>
                  <p>Narrow the report by date, visit type or practitioner.</p>
               </div>
               {hasFilters && (
                  <button
                     type="button"
                     className="button button-outline"
                     onClick={() => setFilters(emptyFilters)}>
                     Clear filters
                  </button>
               )}
            </header>
            <form
               className="staff-invite-form staff-report-filters"
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
            <div className="staff-report-results" aria-live="polite">
               <section
                  className="staff-summary-grid"
                  aria-label="Cancellation summary">
                  {stats.map((stat) => (
                     <article
                        className="staff-summary-card staff-report-stat"
                        key={stat.title}>
                        <Icon className="staff-summary-icon" name={stat.icon} />
                        <h2 className="staff-summary-title">{stat.title}</h2>
                        <span className="staff-summary-value">
                           {stat.value}
                        </span>
                        <span className="staff-summary-detail">
                           {stat.detail}
                        </span>
                     </article>
                  ))}
               </section>

               {total === 0 ? (
                  <section className="staff-card staff-report-card">
                     <p className="staff-report-empty" role="status">
                        No cancellations match these filters.
                     </p>
                  </section>
               ) : (
                  <>
                     <div className="staff-report-grid">
                        <section
                           className="staff-card staff-report-card"
                           aria-labelledby="report-reason-heading">
                           <header className="staff-card-heading">
                              <div>
                                 <h2 id="report-reason-heading">
                                    By cancellation reason
                                 </h2>
                                 <p>Share of all {total} cancellations</p>
                              </div>
                           </header>
                           <ul className="staff-report-bars">
                              {report.byReason.map((row) => {
                                 const percent = percentOf(row.count, total);
                                 return (
                                    <li
                                       key={row.reason}
                                       className={
                                          row.reason === 'unspecified'
                                             ? 'is-muted'
                                             : undefined
                                       }>
                                       <span className="staff-report-bar-label">
                                          {reasonLabels[row.reason] ??
                                             row.reason}
                                       </span>
                                       <span className="staff-report-bar-value">
                                          {row.count} · {percent}%
                                       </span>
                                       <span
                                          className="staff-report-bar"
                                          aria-hidden="true">
                                          <span
                                             style={{ width: `${percent}%` }}
                                          />
                                       </span>
                                    </li>
                                 );
                              })}
                           </ul>
                           {report.byReason.some(
                              (row) => row.reason === 'unspecified',
                           ) && (
                              <p className="staff-report-note">
                                 “Not recorded” covers older cancellations made
                                 before a reason was required.
                              </p>
                           )}
                        </section>

                        <section
                           className="staff-card staff-report-card"
                           aria-labelledby="report-who-heading">
                           <header className="staff-card-heading">
                              <div>
                                 <h2 id="report-who-heading">
                                    By who cancelled
                                 </h2>
                                 <p>
                                    Patient-initiated versus clinic-initiated
                                 </p>
                              </div>
                           </header>
                           <ul className="staff-report-rows">
                              {report.byCancelledBy.map((row) => (
                                 <li key={row.cancelledBy}>
                                    <CancelledByPill who={row.cancelledBy} />
                                    <span className="staff-report-bar-value">
                                       {row.count} ·{' '}
                                       {percentOf(row.count, total)}%
                                    </span>
                                 </li>
                              ))}
                           </ul>
                        </section>
                     </div>

                     <section
                        className="staff-card staff-report-card"
                        aria-labelledby="report-other-heading">
                        <header className="staff-card-heading">
                           <div>
                              <h2 id="report-other-heading">“Other” reasons</h2>
                              <p>
                                 Free-text reasons given when “Other” was chosen
                              </p>
                           </div>
                        </header>
                        {report.otherEntries.length ? (
                           <ul className="staff-report-other">
                              {report.otherEntries.map((entry) => (
                                 <li key={entry.appointmentId}>
                                    <div className="staff-report-other-meta">
                                       <span>
                                          {entry.date ?? 'Date not recorded'} ·{' '}
                                          {entry.visitType}
                                       </span>
                                       <CancelledByPill
                                          who={entry.cancelledBy}
                                       />
                                    </div>
                                    <p>
                                       {entry.reasonText ||
                                          'No details were entered.'}
                                    </p>
                                 </li>
                              ))}
                           </ul>
                        ) : (
                           <p className="staff-report-empty" role="status">
                              No “Other” reasons in this range.
                           </p>
                        )}
                     </section>
                  </>
               )}
            </div>
         )}
      </div>
   );
}

export default StaffCancellationReport;
