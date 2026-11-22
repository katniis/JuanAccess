import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { getStaffPatientRecord } from '../../services/staffDashboard.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';

const clinicDate = (value) =>
   value
      ? new Intl.DateTimeFormat('en-US', {
           timeZone: 'Asia/Manila',
           month: 'short',
           day: 'numeric',
           year: 'numeric',
        }).format(new Date(value))
      : '—';
const fullName = (person) =>
   [person?.firstName, person?.lastName].filter(Boolean).join(' ') ||
   'Patient record';

function StaffPatientRecord() {
   const { recordType, recordId } = useParams();
   const [recordResult, setRecordResult] = useState(null);
   const resultKey = JSON.stringify([recordType, recordId]);
   const hasMatchingResult = recordResult?.key === resultKey;
   const record = hasMatchingResult ? recordResult.record : null;
   const notFound =
      recordType !== 'patients' || (hasMatchingResult && recordResult.notFound);
   const hasError = hasMatchingResult && recordResult.error;
   const pageRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(record));

   useEffect(() => {
      let current = true;
      if (recordType !== 'patients') return undefined;
      getStaffPatientRecord(recordId)
         .then((data) => {
            if (current) setRecordResult({ key: resultKey, record: data });
         })
         .catch((error) => {
            if (current)
               setRecordResult({
                  key: resultKey,
                  notFound: error.status === 404,
                  error: error.status !== 404,
               });
         });
      return () => {
         current = false;
      };
   }, [recordId, recordType, resultKey]);

   if (hasError)
      return (
         <ErrorState
            title="This patient record couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (notFound)
      return (
         <div className="staff-record-page">
            <Link className="staff-dispute-back" to="/staff">
               <Icon name="chevron-left" /> Back to dashboard
            </Link>
            <ErrorState
               compact
               title="Patient record not found"
               message="This record may be unavailable or the link may be out of date."
               onRetry={null}
            />
         </div>
      );
   if (!record)
      return (
         <LoadingSkeleton variant="dispute-detail" label="the patient record" />
      );

   const patient = record.patient;
   return (
      <div className="staff-record-page" ref={pageRef}>
         <Link className="staff-dispute-back" to="/staff">
            <Icon name="chevron-left" /> Back to dashboard
         </Link>
         <header className="staff-schedule-heading">
            <h1>{fullName(patient)}</h1>
            <p>
               Patient chart · DOB {clinicDate(patient.dateOfBirth)} ·{' '}
               {patient.gender || 'Gender not recorded'}
            </p>
         </header>
         <dl className="staff-detail-grid staff-patient-overview">
            <div>
               <dt>Email</dt>
               <dd>{patient.contactEmail || 'Not on file'}</dd>
            </div>
            <div>
               <dt>Phone</dt>
               <dd>{patient.contactPhone || 'Not on file'}</dd>
            </div>
            <div>
               <dt>New patient</dt>
               <dd>{patient.isNewPatient ? 'Yes' : 'No'}</dd>
            </div>
            <div>
               <dt>Reason for visit</dt>
               <dd>{patient.intakeReasonNote || 'Not provided'}</dd>
            </div>
         </dl>
         <section className="staff-card staff-chart-section">
            <header className="staff-card-heading">
               <div>
                  <h2>Appointments</h2>
                  <p>Patient visit history returned by the chart API</p>
               </div>
            </header>
            {record.appointments?.length ? (
               <div className="staff-table-scroll">
                  <table className="staff-data-table">
                     <thead>
                        <tr>
                           <th>Date</th>
                           <th>Provider</th>
                           <th>Visit type</th>
                           <th>Status</th>
                        </tr>
                     </thead>
                     <tbody>
                        {record.appointments.map((appointment) => (
                           <tr key={appointment.id}>
                              <td>{clinicDate(appointment.scheduledStart)}</td>
                              <td>
                                 {appointment.providerFirstName
                                    ? `Dr. ${appointment.providerFirstName} ${appointment.providerLastName}`
                                    : 'Provider'}
                              </td>
                              <td>{appointment.visitTypeName || '—'}</td>
                              <td>{appointment.status}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <p className="staff-record-empty">
                  No appointments are recorded.
               </p>
            )}
         </section>
         <section className="staff-chart-grid">
            <section className="staff-card staff-chart-section">
               <header className="staff-card-heading">
                  <div>
                     <h2>Conditions</h2>
                     <p>Diagnoses on file</p>
                  </div>
               </header>
               {record.conditions?.length ? (
                  <ul className="staff-chart-list">
                     {record.conditions.map((item) => (
                        <li key={item.id}>
                           <strong>
                              {item.description || item.conditionCode}
                           </strong>
                           <span>
                              {item.resolvedDate
                                 ? `Resolved ${clinicDate(item.resolvedDate)}`
                                 : 'Active'}
                              {item.diagnosedDate
                                 ? ` · Diagnosed ${clinicDate(item.diagnosedDate)}`
                                 : ''}
                           </span>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className="staff-record-empty">
                     No conditions are recorded.
                  </p>
               )}
            </section>
            <section className="staff-card staff-chart-section">
               <header className="staff-card-heading">
                  <div>
                     <h2>Recent labs</h2>
                     <p>Results on file</p>
                  </div>
               </header>
               {record.labs?.length ? (
                  <ul className="staff-chart-list">
                     {record.labs.map((item) => (
                        <li key={item.id}>
                           <strong>{item.testName}</strong>
                           <span>
                              {[item.resultValue, item.unit]
                                 .filter(Boolean)
                                 .join(' ')}
                              {item.resultDate
                                 ? ` · ${clinicDate(item.resultDate)}`
                                 : ''}
                           </span>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className="staff-record-empty">
                     No lab results are recorded.
                  </p>
               )}
            </section>
            <section className="staff-card staff-chart-section">
               <header className="staff-card-heading">
                  <div>
                     <h2>Medications</h2>
                     <p>Current medication history</p>
                  </div>
               </header>
               {record.medications?.length ? (
                  <ul className="staff-chart-list">
                     {record.medications.map((item) => (
                        <li key={item.id}>
                           <strong>{item.medicationName}</strong>
                           <span>
                              {[
                                 item.dose,
                                 `Started ${clinicDate(item.startDate)}`,
                                 item.endDate &&
                                    `Ends ${clinicDate(item.endDate)}`,
                              ]
                                 .filter(Boolean)
                                 .join(' · ')}
                           </span>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className="staff-record-empty">
                     No active medications are recorded.
                  </p>
               )}
            </section>
            <section className="staff-card staff-chart-section">
               <header className="staff-card-heading">
                  <div>
                     <h2>Coverage</h2>
                     <p>Insurance plans on file</p>
                  </div>
               </header>
               {record.coverages?.length ? (
                  <ul className="staff-chart-list">
                     {record.coverages.map((item) => (
                        <li key={item.id}>
                           <strong>
                              {item.insurerName || 'Insurer'} ·{' '}
                              {item.planName || 'Plan'}
                           </strong>
                           <span>
                              {item.status}
                              {item.policyNumber
                                 ? ` · Policy ${item.policyNumber}`
                                 : ''}
                           </span>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className="staff-record-empty">
                     No coverage information is recorded.
                  </p>
               )}
            </section>
            <section className="staff-card staff-chart-section">
               <header className="staff-card-heading">
                  <div>
                     <h2>Recent encounters</h2>
                     <p>Notes from prior visits</p>
                  </div>
               </header>
               {record.chartNotes?.length ? (
                  <ul className="staff-chart-list staff-chart-notes">
                     {record.chartNotes.map((item) => (
                        <li key={item.id}>
                           <strong>{clinicDate(item.encounterDate)}</strong>
                           <span>{item.noteText}</span>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className="staff-record-empty">
                     No encounter notes are recorded.
                  </p>
               )}
            </section>
         </section>
      </div>
   );
}

export default StaffPatientRecord;
