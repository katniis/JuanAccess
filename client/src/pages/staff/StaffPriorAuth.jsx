import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import PortalActionProgress from '../../components/PortalActionProgress.jsx';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   createAppealFromPriorAuth,
   groupStaffPriorAuthRecords,
   getStaffPriorAuthDetail,
   getStaffPriorAuthQueue,
   savePriorAuthDraft,
   setPriorAuthDecision,
   submitPriorAuth,
} from '../../services/staffPriorAuth.js';
import { gsap, useGSAP } from '../../utils/portalGsap.js';

const statusLabels = {
   needs_draft: 'Needs Draft',
   drafted: 'Drafted',
   submitted: 'Submitted',
   manual_review: 'Manual Review',
   approved: 'Approved',
   denied: 'Denied',
   appealed: 'Appealed',
   not_required: 'Not required',
};
const fullName = (first, last) =>
   [first, last].filter(Boolean).join(' ') || 'Patient record';
const dateOfBirth = (value) =>
   value
      ? new Intl.DateTimeFormat('en-US', {
           timeZone: 'Asia/Manila',
           month: 'short',
           day: 'numeric',
           year: 'numeric',
        }).format(new Date(value))
      : 'Not on file';

function StaffPriorAuth() {
   const { role = 'staff' } = useOutletContext();
   const [records, setRecords] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [activeGroup, setActiveGroup] = useState('needs-action');
   const [stageFilter, setStageFilter] = useState('all');
   const [selectedRecord, setSelectedRecord] = useState(null);
   const [loadingDetail, setLoadingDetail] = useState(false);
   const [justification, setJustification] = useState('');
   const [pending, setPending] = useState('');
   const [inlineError, setInlineError] = useState('');
   const [inlineStatus, setInlineStatus] = useState('');
   const [progress, setProgress] = useState(null);
   const closeButtonRef = useRef(null);
   const triggerRef = useRef(null);
   const pageRef = useRef(null);
   const drawerRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(records));

   useGSAP(
      () => {
         if (!selectedRecord || !drawerRef.current) return undefined;
         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: reduce)', () =>
            gsap.set(drawerRef.current, { x: 0, autoAlpha: 1 }),
         );
         media.add('(prefers-reduced-motion: no-preference)', () =>
            gsap.fromTo(
               drawerRef.current,
               { x: 28, autoAlpha: 0 },
               { x: 0, autoAlpha: 1, duration: 0.24, ease: 'power2.out' },
            ),
         );
         return () => media.revert();
      },
      {
         scope: drawerRef,
         dependencies: [Boolean(selectedRecord)],
         revertOnUpdate: true,
      },
   );

   const refresh = async () => {
      const list = await getStaffPriorAuthQueue();
      setRecords(list);
      if (selectedRecord) {
         const current = await getStaffPriorAuthDetail(selectedRecord.id);
         setSelectedRecord({
            ...current.priorAuthorization,
            conditions: current.conditions,
            coverage: current.coverage,
         });
         setJustification(current.priorAuthorization.justification || '');
      }
   };

   useEffect(() => {
      let current = true;
      getStaffPriorAuthQueue()
         .then((data) => {
            if (current) setRecords(data);
         })
         .catch(() => {
            if (current) setHasError(true);
         });
      return () => {
         current = false;
      };
   }, []);

   useEffect(() => {
      if (!selectedRecord) return undefined;
      const previousOverflow = document.body.style.overflow;
      const closeOnEscape = (event) => {
         if (event.key === 'Escape') setSelectedRecord(null);
      };
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', closeOnEscape);
      closeButtonRef.current?.focus();
      return () => {
         document.body.style.overflow = previousOverflow;
         document.removeEventListener('keydown', closeOnEscape);
         triggerRef.current?.focus();
      };
   }, [selectedRecord]);

   const openDetail = async (record, trigger) => {
      triggerRef.current = trigger;
      setSelectedRecord(record);
      setJustification(record.justification || '');
      setInlineError('');
      setInlineStatus('');
      setLoadingDetail(true);
      try {
         const detail = await getStaffPriorAuthDetail(record.id);
         setSelectedRecord({
            ...detail.priorAuthorization,
            conditions: detail.conditions,
            coverage: detail.coverage,
         });
         setJustification(detail.priorAuthorization.justification || '');
      } catch (error) {
         setInlineError(error.message);
      } finally {
         setLoadingDetail(false);
      }
   };

   const runAction = async (key, action, successMessage) => {
      setPending(key);
      setInlineError('');
      setInlineStatus('');
      try {
         await action();
         await refresh();
         setInlineStatus(successMessage);
      } catch (error) {
         setInlineError(error.message);
      } finally {
         setPending('');
         setProgress(null);
      }
   };

   const generateDraft = async () => {
      setProgress({
         title: 'Preparing authorization draft',
         detail: 'Reviewing the available appointment and chart information.',
         steps: ['Review chart', 'Prepare justification', 'Save draft'],
         activeStep: 0,
         completedSteps: 0,
      });
      setPending('generate');
      setInlineError('');
      setInlineStatus('');
      try {
         const saved = await savePriorAuthDraft(selectedRecord.id, '');
         setProgress((current) => ({
            ...current,
            activeStep: 2,
            completedSteps: 2,
            complete: true,
            detail: 'Draft saved to the authorization queue.',
         }));
         await refresh();
         setInlineStatus(
            'Authorization draft prepared. Review it before submission.',
         );
         setJustification(
            saved?.justificationText || selectedRecord.justification || '',
         );
      } catch (error) {
         setInlineError(error.message);
         setProgress(null);
      } finally {
         setPending('');
      }
   };

   const createAppeal = async () => {
      setPending('appeal');
      setInlineError('');
      setInlineStatus('');
      setProgress({
         title: 'Preparing appeal draft',
         detail:
            'Collecting the authorization decision and available chart context.',
         steps: [
            'Review denial',
            'Prepare appeal letter',
            'Add to appeals queue',
         ],
         activeStep: 0,
         completedSteps: 0,
      });
      try {
         await createAppealFromPriorAuth(selectedRecord.id);
         setProgress((current) => ({
            ...current,
            activeStep: 2,
            completedSteps: 2,
            complete: true,
            detail: 'The appeal draft is ready for staff review.',
         }));
         await refresh();
         setInlineStatus('Appeal draft added to the Appeals Queue.');
         setSelectedRecord((current) => ({ ...current, status: 'appealed' }));
      } catch (error) {
         setInlineError(error.message);
         setProgress(null);
      } finally {
         setPending('');
      }
   };

   const submitAuthorization = async () => {
      setPending('submit');
      setInlineError('');
      setInlineStatus('');
      setProgress({
         title: 'Submitting authorization',
         detail:
            'Sending the saved request through the configured plan workflow.',
         steps: [
            'Validate saved draft',
            'Submit request',
            'Record plan response',
         ],
         activeStep: 1,
         completedSteps: 0,
      });
      try {
         await submitPriorAuth(selectedRecord.id);
         setProgress((current) => ({
            ...current,
            activeStep: 2,
            completedSteps: 2,
            complete: true,
            detail: 'The plan workflow response is recorded.',
         }));
         await refresh();
         setInlineStatus('Plan workflow response recorded.');
      } catch (error) {
         setInlineError(error.message);
         setProgress(null);
      } finally {
         setPending('');
      }
   };

   if (hasError)
      return (
         <ErrorState
            title="The prior authorization queue couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!records)
      return (
         <LoadingSkeleton
            variant="queue"
            label="the prior authorization queue"
         />
      );

   const groups = groupStaffPriorAuthRecords(records);
   const selectedGroup =
      groups.find((group) => group.id === activeGroup) || groups[0];
   const visibleRecords = selectedGroup.records.filter(
      (record) => stageFilter === 'all' || record.status === stageFilter,
   );
   const nextGroup = groups.find(
      (group) => group.id !== activeGroup && group.records.length > 0,
   );
   const isAdmin = role === 'staff_admin';
   const currentStatus = selectedRecord?.status;
   const editable = [
      'needs_draft',
      'drafted',
      'manual_review',
      'denied',
   ].includes(currentStatus);
   const canSubmit = currentStatus === 'drafted';
   const canDecide = ['submitted', 'approved', 'denied', 'appealed'].includes(
      currentStatus,
   );

   return (
      <div className="prior-auth-page" ref={pageRef}>
         <header className="staff-schedule-heading">
            <h1>Prior Authorization Queue</h1>
            <p>
               Find requests that need staff action, await a plan outcome, or
               are resolved.
            </p>
         </header>
         <div className="prior-auth-queue-controls">
            <div
               className="prior-auth-tabs"
               role="group"
               aria-label="Filter prior authorizations by action">
               {groups.map((group) => (
                  <button
                     className={activeGroup === group.id ? 'selected' : ''}
                     type="button"
                     key={group.id}
                     aria-pressed={activeGroup === group.id}
                     onClick={() => {
                        setActiveGroup(group.id);
                        setStageFilter('all');
                        setSelectedRecord(null);
                     }}>
                     {group.label}
                     <span>{group.records.length}</span>
                  </button>
               ))}
            </div>
            {selectedGroup.stages.length > 1 && (
               <label className="prior-auth-stage-filter">
                  Stage
                  <select
                     value={stageFilter}
                     onChange={(event) => {
                        setStageFilter(event.target.value);
                        setSelectedRecord(null);
                     }}>
                     <option value="all">All stages</option>
                     {selectedGroup.stages.map((stage) => (
                        <option key={stage} value={stage}>
                           {statusLabels[stage]}
                        </option>
                     ))}
                  </select>
               </label>
            )}
         </div>
         {visibleRecords.length ? (
            <section
               className="prior-auth-grid"
               aria-label={`${selectedGroup.label} prior authorizations`}>
               {visibleRecords.map((record) => (
                  <button
                     className="prior-auth-card"
                     type="button"
                     key={record.id}
                     aria-haspopup="dialog"
                     onClick={(event) =>
                        void openDetail(record, event.currentTarget)
                     }>
                     <span className="prior-auth-card-top">
                        <span className={`prior-auth-status ${record.status}`}>
                           <span />
                           {statusLabels[record.status] || record.status}
                        </span>
                        <Icon name="chevron-right" />
                     </span>
                     <strong>{record.patient}</strong>
                     <span className="prior-auth-visit">
                        {record.visitType}
                     </span>
                     <span className="prior-auth-meta">
                        DOB: {dateOfBirth(record.dateOfBirth)}
                     </span>
                     <span className="prior-auth-meta">
                        Insurer: {record.insurer}
                     </span>
                  </button>
               ))}
            </section>
         ) : (
            <div className="prior-auth-empty">
               <p>No requests in {selectedGroup.label.toLowerCase()}.</p>
               {nextGroup && (
                  <button
                     className="button button-outline button-small"
                     type="button"
                     onClick={() => {
                        setActiveGroup(nextGroup.id);
                        setStageFilter('all');
                     }}>
                     View {nextGroup.label.toLowerCase()} (
                     {nextGroup.records.length})
                  </button>
               )}
            </div>
         )}
         {selectedRecord && (
            <div
               className="staff-detail-backdrop"
               onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                     setSelectedRecord(null);
               }}>
               <aside
                  className="staff-detail-drawer"
                  ref={drawerRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="prior-auth-detail-title">
                  <header className="staff-detail-heading">
                     <h2 id="prior-auth-detail-title">
                        {fullName(
                           selectedRecord.patientFirstName,
                           selectedRecord.patientLastName,
                        )}{' '}
                        · {selectedRecord.visitTypeName}
                     </h2>
                     <button
                        className="staff-detail-close"
                        type="button"
                        ref={closeButtonRef}
                        aria-label="Close prior authorization details"
                        onClick={() => setSelectedRecord(null)}>
                        <Icon name="close" />
                     </button>
                  </header>
                  <div className="staff-detail-body prior-auth-detail-body">
                     <dl className="staff-detail-grid">
                        <div>
                           <dt>Patient</dt>
                           <dd>
                              {fullName(
                                 selectedRecord.patientFirstName,
                                 selectedRecord.patientLastName,
                              )}
                           </dd>
                        </div>
                        <div>
                           <dt>DOB</dt>
                           <dd>{dateOfBirth(selectedRecord.patientDob)}</dd>
                        </div>
                        <div>
                           <dt>Visit Type</dt>
                           <dd>{selectedRecord.visitTypeName}</dd>
                        </div>
                        <div>
                           <dt>Insurer</dt>
                           <dd>
                              {selectedRecord.insurerName ||
                                 selectedRecord.coverage?.insurerName ||
                                 selectedRecord.planName ||
                                 'Not on file'}
                           </dd>
                        </div>
                     </dl>
                     {loadingDetail ? (
                        <p role="status">Loading authorization details…</p>
                     ) : (
                        <>
                           {selectedRecord.denialReason && (
                              <p className="prior-auth-inline-error">
                                 {selectedRecord.denialReason}
                              </p>
                           )}
                           <section className="prior-auth-justification">
                              <header>
                                 <label htmlFor="prior-auth-justification">
                                    Clinical Justification
                                 </label>
                                 <span
                                    className={`prior-auth-status ${currentStatus}`}>
                                    <span />
                                    {statusLabels[currentStatus] ||
                                       currentStatus}
                                 </span>
                              </header>
                              <p className="prior-auth-process-note">
                                 Generated text is a draft and must be checked
                                 against the chart by staff. This environment
                                 records outcomes through a local plan
                                 simulation.
                              </p>
                              <textarea
                                 id="prior-auth-justification"
                                 value={justification}
                                 onChange={(event) =>
                                    setJustification(event.target.value)
                                 }
                                 placeholder="No clinical justification is available yet."
                                 readOnly={!editable}
                                 rows="8"
                              />
                              {editable && (
                                 <div className="staff-action-row">
                                    {justification.trim() ? (
                                       <button
                                          className="button button-outline"
                                          type="button"
                                          disabled={Boolean(pending)}
                                          onClick={() =>
                                             void runAction(
                                                'save',
                                                () =>
                                                   savePriorAuthDraft(
                                                      selectedRecord.id,
                                                      justification,
                                                   ),
                                                'Authorization draft saved.',
                                             )
                                          }>
                                          {pending === 'save'
                                             ? 'Saving…'
                                             : 'Save draft'}
                                       </button>
                                    ) : (
                                       <button
                                          className="button button-outline"
                                          type="button"
                                          disabled={Boolean(pending)}
                                          onClick={() => void generateDraft()}>
                                          {pending === 'generate'
                                             ? 'Preparing…'
                                             : 'Generate draft'}
                                       </button>
                                    )}
                                 </div>
                              )}
                           </section>
                           {selectedRecord.conditions?.length > 0 && (
                              <section className="staff-detail-panel">
                                 <h3>Conditions on file</h3>
                                 <ul>
                                    {selectedRecord.conditions.map(
                                       (condition) => (
                                          <li key={condition.id}>
                                             {condition.description ||
                                                condition.conditionCode}
                                             {condition.diagnosedDate
                                                ? ` · diagnosed ${dateOfBirth(condition.diagnosedDate)}`
                                                : ''}
                                             {condition.resolvedDate
                                                ? ` · resolved ${dateOfBirth(condition.resolvedDate)}`
                                                : ''}
                                          </li>
                                       ),
                                    )}
                                 </ul>
                              </section>
                           )}
                        </>
                     )}
                     {progress && <PortalActionProgress {...progress} />}
                     {inlineStatus && (
                        <p
                           className="prior-auth-inline-status"
                           role="status"
                           aria-live="polite">
                           {inlineStatus}
                        </p>
                     )}
                     {inlineError && (
                        <p className="prior-auth-inline-error" role="alert">
                           {inlineError}
                        </p>
                     )}
                     {!isAdmin && (canSubmit || canDecide) && (
                        <p
                           className="appeal-admin-note"
                           id="prior-auth-admin-restriction">
                           Submission and plan decisions are restricted to staff
                           admins. Staff can still prepare and review drafts.
                        </p>
                     )}
                     <footer className="prior-auth-detail-footer staff-action-row">
                        {canSubmit && (
                           <button
                              className="button button-primary"
                              type="button"
                              disabled={Boolean(pending) || !isAdmin}
                              aria-describedby={
                                 !isAdmin
                                    ? 'prior-auth-admin-restriction'
                                    : undefined
                              }
                              onClick={() => void submitAuthorization()}>
                              {pending === 'submit'
                                 ? 'Submitting…'
                                 : 'Submit to plan workflow'}
                           </button>
                        )}
                        {canDecide && (
                           <>
                              <button
                                 className="button button-outline"
                                 type="button"
                                 disabled={Boolean(pending) || !isAdmin}
                                 aria-describedby={
                                    !isAdmin
                                       ? 'prior-auth-admin-restriction'
                                       : undefined
                                 }
                                 onClick={() =>
                                    void runAction(
                                       'decision',
                                       () =>
                                          setPriorAuthDecision(
                                             selectedRecord.id,
                                             'approved',
                                          ),
                                       'Authorization marked approved.',
                                    )
                                 }>
                                 {pending === 'decision'
                                    ? 'Updating…'
                                    : 'Mark approved'}
                              </button>
                              <button
                                 className="button button-destructive"
                                 type="button"
                                 disabled={Boolean(pending) || !isAdmin}
                                 aria-describedby={
                                    !isAdmin
                                       ? 'prior-auth-admin-restriction'
                                       : undefined
                                 }
                                 onClick={() =>
                                    void runAction(
                                       'decision',
                                       () =>
                                          setPriorAuthDecision(
                                             selectedRecord.id,
                                             'denied',
                                          ),
                                       'Authorization marked denied.',
                                    )
                                 }>
                                 {pending === 'decision'
                                    ? 'Updating…'
                                    : 'Mark denied'}
                              </button>
                           </>
                        )}
                        {currentStatus === 'denied' && (
                           <button
                              className="button button-primary"
                              type="button"
                              disabled={Boolean(pending)}
                              onClick={() => void createAppeal()}>
                              {pending === 'appeal'
                                 ? 'Preparing appeal…'
                                 : 'Create appeal draft'}
                           </button>
                        )}
                        <button
                           className="button button-quiet"
                           type="button"
                           disabled={Boolean(pending)}
                           onClick={() => setSelectedRecord(null)}>
                           Close
                        </button>
                     </footer>
                  </div>
               </aside>
            </div>
         )}
      </div>
   );
}

export default StaffPriorAuth;
