import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   getStaffAttentionData,
   searchStaffPatients,
   searchStaffProviders,
} from '../../services/staffDashboard.js';

const formatDate = (date) =>
   new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
   }).format(date);

const formatTime = (value) =>
   value
      ? new Intl.DateTimeFormat('en-US', {
           timeZone: 'Asia/Manila',
           hour: 'numeric',
           minute: '2-digit',
        }).format(new Date(value))
      : '—';

const fullName = (first, last) =>
   [first, last].filter(Boolean).join(' ') || 'Patient record';

export function buildAttentionItems(
   { dashboard, priorAuth, appeals, waitlist },
   limit = 5,
) {
   const items = [];
   for (const item of priorAuth) {
      if (!['needs_draft', 'drafted', 'manual_review'].includes(item.status))
         continue;
      items.push({
         id: `auth-${item.id}`,
         icon: 'file-check',
         title: `${item.status === 'needs_draft' ? 'Prior authorization needs a draft' : item.status === 'manual_review' ? 'Prior authorization needs review' : 'Prior authorization draft ready'}: ${item.visitTypeName}`,
         subtitle: fullName(item.patientFirstName, item.patientLastName),
         status:
            item.status === 'needs_draft'
               ? 'Needs draft'
               : item.status === 'manual_review'
                 ? 'Manual review'
                 : 'Drafted',
         tone: ['needs_draft', 'manual_review'].includes(item.status)
            ? 'due'
            : 'pending',
         sort: new Date(item.scheduledStart).getTime(),
         time: formatTime(item.scheduledStart),
         path: '/staff/prior-auth',
      });
   }
   for (const appeal of appeals) {
      if (!['drafted', 'submitted', 'manual_review'].includes(appeal.status))
         continue;
      items.push({
         id: `appeal-${appeal.id}`,
         icon: 'scale',
         title:
            appeal.status === 'drafted'
               ? 'Appeal draft ready for review'
               : appeal.status === 'manual_review'
                 ? 'Appeal needs manual review'
                 : 'Appeal submitted — decision pending',
         subtitle: fullName(appeal.patientFirstName, appeal.patientLastName),
         status:
            appeal.status === 'drafted'
               ? 'Drafted'
               : appeal.status === 'manual_review'
                 ? 'Manual review'
                 : 'Submitted',
         tone: appeal.status === 'drafted' ? 'due' : 'urgent',
         sort: new Date(appeal.updatedAt).getTime(),
         time: formatTime(appeal.updatedAt),
         path: '/staff/appeals',
      });
   }
   for (const entry of waitlist) {
      if (!['offered', 'waiting'].includes(entry.status)) continue;
      items.push({
         id: `waitlist-${entry.id}`,
         icon: 'clock',
         title:
            entry.status === 'offered'
               ? 'Waitlist offer awaiting response'
               : 'Patient waiting for an appointment',
         subtitle: `${fullName(entry.patientFirstName, entry.patientLastName)} · ${entry.visitTypeName}`,
         status: entry.status === 'offered' ? 'Offered' : 'Waiting',
         tone: entry.status === 'offered' ? 'awaiting' : 'pending',
         sort: entry.offerExpiresAt
            ? new Date(entry.offerExpiresAt).getTime()
            : new Date(entry.createdAt).getTime(),
         time: entry.offerExpiresAt ? formatTime(entry.offerExpiresAt) : '—',
         path: '/staff/slots',
      });
   }
   for (const appointment of dashboard.todayAppointments || []) {
      if (appointment.status !== 'scheduled') continue;
      items.push({
         id: `appointment-${appointment.id}`,
         icon: 'calendar',
         title: `Appointment check-in pending: ${appointment.visitTypeName}`,
         subtitle: `${fullName(appointment.patientFirstName, appointment.patientLastName)} · Dr. ${fullName(appointment.providerFirstName, appointment.providerLastName)}`,
         status: 'Pending',
         tone: 'pending',
         sort: new Date(appointment.scheduledStart).getTime(),
         time: formatTime(appointment.scheduledStart),
         path: `/staff/schedule?provider=${appointment.providerId}`,
      });
   }
   return items.sort((a, b) => a.sort - b.sort).slice(0, limit);
}

function StaffDashboard() {
   const { user } = useOutletContext();
   const pageRef = useRef(null);
   const [data, setData] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [recordType, setRecordType] = useState('providers');
   const [searchTerm, setSearchTerm] = useState('');
   const [records, setRecords] = useState([]);
   const [recordsLoading, setRecordsLoading] = useState(true);
   const [recordsError, setRecordsError] = useState(false);
   const searchInputRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(data));

   useEffect(() => {
      let current = true;
      getStaffAttentionData()
         .then((result) => {
            if (current) setData(result);
         })
         .catch(() => {
            if (current) setHasError(true);
         });
      return () => {
         current = false;
      };
   }, []);

   useEffect(() => {
      let current = true;
      setRecordsLoading(true);
      setRecordsError(false);
      const timeout = window.setTimeout(
         () => {
            const request =
               recordType === 'providers'
                  ? searchStaffProviders(searchTerm)
                  : searchStaffPatients(searchTerm);
            request
               .then((result) => {
                  if (current) setRecords(result);
               })
               .catch(() => {
                  if (current) setRecordsError(true);
               })
               .finally(() => {
                  if (current) setRecordsLoading(false);
               });
         },
         searchTerm ? 220 : 0,
      );
      return () => {
         current = false;
         window.clearTimeout(timeout);
      };
   }, [recordType, searchTerm]);

   useEffect(() => {
      const focusSearch = (event) => {
         if (
            event.key === '/' &&
            !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
         ) {
            event.preventDefault();
            searchInputRef.current?.focus();
         }
      };
      document.addEventListener('keydown', focusSearch);
      return () => document.removeEventListener('keydown', focusSearch);
   }, []);

   if (hasError)
      return (
         <ErrorState
            title="The staff dashboard couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!data)
      return (
         <LoadingSkeleton
            variant="staff-dashboard"
            label="the staff dashboard"
         />
      );

   const { dashboard, priorAuth, appeals, waitlist } = data;
   const snapshot = dashboard.snapshot || {};
   const needsDraft = priorAuth.filter(
      (item) => item.status === 'needs_draft',
   ).length;
   const submittedAppeals = appeals.filter(
      (item) => item.status === 'submitted',
   ).length;
   const offeredEntries = waitlist.filter(
      (item) => item.status === 'offered',
   ).length;
   const attentionItems = buildAttentionItems(data);
   const firstName = user?.displayName?.trim().split(/\s+/)[0] || 'Team';
   const metrics = [
      {
         id: 'appointments',
         title: "Today's appointments",
         value: snapshot.todayAppointmentsCount ?? 0,
         detail: `${dashboard.todayAppointments?.length || 0} appointment records`,
         footer: 'Open schedule',
         footerIcon: 'calendar',
         icon: 'calendar',
         path: '/staff/schedule',
      },
      {
         id: 'prior-auths',
         title: 'Prior authorizations',
         value: snapshot.pendingPriorAuthsCount ?? 0,
         detail: `${needsDraft} need a draft`,
         footer: 'Review queue',
         footerIcon: 'alert',
         icon: 'file-check',
         path: '/staff/prior-auth',
      },
      {
         id: 'appeals',
         title: 'Appeals',
         value: snapshot.pendingAppealsCount ?? 0,
         detail: `${submittedAppeals} submitted`,
         footer: 'Review queue',
         footerIcon: 'scale',
         icon: 'scale',
         path: '/staff/appeals',
      },
      {
         id: 'waitlist',
         title: 'Open waitlist',
         value: snapshot.openWaitlistSlotsCount ?? 0,
         detail: `${offeredEntries} offers awaiting response`,
         footer: 'Open slots',
         footerIcon: 'clock',
         icon: 'clock',
         path: '/staff/slots',
      },
   ];
   const displayedRecords = records.map((record) => ({
      id: record.id,
      name:
         recordType === 'providers'
            ? `Dr. ${record.firstName} ${record.lastName}`
            : fullName(record.firstName, record.lastName),
      subtitle:
         recordType === 'providers'
            ? record.specialty
            : record.contactEmail || record.contactPhone || 'Patient record',
   }));
   const placeholder =
      recordType === 'providers'
         ? 'Search by provider name or specialty'
         : 'Search by patient name';

   return (
      <div className="staff-dashboard" ref={pageRef}>
         <header className="staff-welcome">
            <div className="staff-welcome-copy">
               <h1>Clinic overview</h1>
               <p>
                  {formatDate(new Date())} · Welcome, {firstName}
               </p>
            </div>
         </header>
         <section
            className="staff-summary-grid"
            aria-label="Current clinic overview">
            {metrics.map((metric) => (
               <Link
                  className="staff-summary-card"
                  key={metric.id}
                  to={metric.path}>
                  <Icon className="staff-summary-icon" name={metric.icon} />
                  <strong className="staff-summary-title">
                     {metric.title}
                  </strong>
                  <span className="staff-summary-value">{metric.value}</span>
                  <span className="staff-summary-detail">{metric.detail}</span>
                  <span className="staff-summary-footer">
                     <span>
                        <Icon name={metric.footerIcon} />
                        {metric.footer}
                     </span>
                     <Icon name="chevron-right" />
                  </span>
               </Link>
            ))}
         </section>

         <section
            className="staff-card staff-attention"
            aria-labelledby="attention-heading">
            <header className="staff-card-heading">
               <div>
                  <h2 id="attention-heading">Needs attention</h2>
                  <p>Based on current appointments and workflow queues</p>
               </div>
               <Link className="text-link" to="/staff/attention">
                  View all <Icon name="chevron-right" />
               </Link>
            </header>
            {attentionItems.length ? (
               <div className="staff-attention-list">
                  {attentionItems.map((item) => (
                     <article className="staff-attention-row" key={item.id}>
                        <span className="staff-attention-icon">
                           <Icon name={item.icon} />
                        </span>
                        <div className="staff-attention-copy">
                           <strong>{item.title}</strong>
                           <span>{item.subtitle}</span>
                        </div>
                        <div className="staff-attention-meta">
                           <span className={`staff-tag ${item.tone}`}>
                              {item.status}
                           </span>
                           <time>{item.time}</time>
                        </div>
                        <Link
                           className="button button-outline staff-review-button"
                           to={item.path}>
                           Review
                        </Link>
                     </article>
                  ))}
               </div>
            ) : (
               <p className="staff-record-empty">
                  Nothing needs attention right now.
               </p>
            )}
         </section>

         <section
            className="staff-card staff-record-search"
            aria-labelledby="record-search-heading">
            <header className="staff-search-heading">
               <h2 id="record-search-heading">Search records</h2>
               <div
                  className="staff-search-tabs"
                  role="group"
                  aria-label="Record type">
                  {['providers', 'patients'].map((type) => (
                     <button
                        className={recordType === type ? 'selected' : ''}
                        type="button"
                        key={type}
                        aria-pressed={recordType === type}
                        onClick={() => {
                           setRecordType(type);
                           setSearchTerm('');
                        }}>
                        {type === 'providers' ? 'Providers' : 'Patients'}
                     </button>
                  ))}
               </div>
            </header>
            <label className="staff-record-search-field">
               <span className="sr-only">{placeholder}</span>
               <Icon name="search" />
               <input
                  ref={searchInputRef}
                  type="search"
                  value={searchTerm}
                  placeholder={placeholder}
                  onChange={(event) => setSearchTerm(event.target.value)}
               />
               <kbd>/</kbd>
            </label>
            <h3 className="staff-record-list-heading">
               {searchTerm ? 'Results' : `All ${recordType}`}
            </h3>
            {recordsError ? (
               <p className="staff-record-empty">
                  Records couldn’t load. Try changing your search.
               </p>
            ) : recordsLoading ? (
               <p className="staff-record-empty" role="status">
                  Searching records…
               </p>
            ) : displayedRecords.length ? (
               <div className="staff-record-list">
                  {displayedRecords.map((record) => (
                     <Link
                        className="staff-record-row"
                        key={record.id}
                        to={
                           recordType === 'providers'
                              ? `/staff/schedule?provider=${record.id}`
                              : `/staff/records/patients/${record.id}`
                        }>
                        <span className="staff-record-icon">
                           <Icon name="user" />
                        </span>
                        <span className="staff-record-copy">
                           <strong>{record.name}</strong>
                           <span>
                              {record.subtitle || 'Specialty not listed'}
                           </span>
                        </span>
                        <Icon name="chevron-right" />
                     </Link>
                  ))}
               </div>
            ) : (
               <p className="staff-record-empty">
                  No {recordType} match “{searchTerm}”.
               </p>
            )}
         </section>
      </div>
   );
}

export default StaffDashboard;
