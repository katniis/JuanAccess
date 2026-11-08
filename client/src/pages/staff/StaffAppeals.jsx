import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import PortalActionProgress from '../../components/PortalActionProgress.jsx';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   getStaffAppealDetail,
   getStaffAppealsQueue,
   saveStaffAppealDraft,
   setStaffAppealDecision,
   submitStaffAppeal,
} from '../../services/staffAppeals.js';
import { gsap, useGSAP } from '../../utils/portalGsap.js';

const stages = ['drafted', 'submitted', 'manual_review', 'approved', 'denied'];
const statusLabels = {
   drafted: 'Drafted',
   submitted: 'Submitted',
   manual_review: 'Manual Review',
   approved: 'Approved',
   denied: 'Denied',
};
const dateLabel = (value) =>
   value
      ? new Intl.DateTimeFormat('en-US', {
           timeZone: 'Asia/Manila',
           month: 'short',
           day: 'numeric',
           year: 'numeric',
        }).format(new Date(value))
      : 'Not on file';

function StaffAppeals() {
   const { role = 'staff' } = useOutletContext();
   const { notify } = usePortalFeedback();
   const [appeals, setAppeals] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [activeStage, setActiveStage] = useState('drafted');
   const [selectedAppeal, setSelectedAppeal] = useState(null);
   const [loadingDetail, setLoadingDetail] = useState(false);
   const [letter, setLetter] = useState('');
   const [chartJustification, setChartJustification] = useState('');
   const [pending, setPending] = useState('');
   const [inlineError, setInlineError] = useState('');
   const [progress, setProgress] = useState(null);
   const closeButtonRef = useRef(null);
   const triggerRef = useRef(null);
   const pageRef = useRef(null);
   const drawerRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(appeals));

   useGSAP(
      () => {
         if (!selectedAppeal || !drawerRef.current) return undefined;
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
         dependencies: [Boolean(selectedAppeal)],
         revertOnUpdate: true,
      },
   );

   const refresh = async () => {
      const list = await getStaffAppealsQueue();
      setAppeals(list);
      if (selectedAppeal) {
         const current = await getStaffAppealDetail(selectedAppeal.id);
         setSelectedAppeal(current);
         setLetter(current.appealLetter);
         setChartJustification(current.chartJustification);
      }
   };

   useEffect(() => {
      let current = true;
      getStaffAppealsQueue()
         .then((data) => {
            if (current) setAppeals(data);
         })
         .catch(() => {
            if (current) setHasError(true);
         });
      return () => {
         current = false;
      };
   }, []);

   useEffect(() => {
      if (!selectedAppeal) return undefined;
      const previousOverflow = document.body.style.overflow;
      const closeOnEscape = (event) => {
         if (event.key === 'Escape') setSelectedAppeal(null);
      };
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', closeOnEscape);
      closeButtonRef.current?.focus();
      return () => {
         document.body.style.overflow = previousOverflow;
         document.removeEventListener('keydown', closeOnEscape);
         triggerRef.current?.focus();
      };
   }, [selectedAppeal]);

   const openAppeal = async (appeal, trigger) => {
      triggerRef.current = trigger;
      setSelectedAppeal(appeal);
      setLetter(appeal.appealLetter || '');
      setChartJustification(appeal.chartJustification || '');
      setInlineError('');
      setLoadingDetail(true);
      try {
         const detail = await getStaffAppealDetail(appeal.id);
         setSelectedAppeal(detail);
         setLetter(detail.appealLetter);
         setChartJustification(detail.chartJustification);
      } catch (error) {
         setInlineError(error.message);
      } finally {
         setLoadingDetail(false);
      }
   };

   const runAction = async (key, action, successMessage) => {
      setPending(key);
      setInlineError('');
      try {
         await action();
         await refresh();
         notify({ type: 'success', message: successMessage });
      } catch (error) {
         setInlineError(error.message);
         notify({ type: 'error', message: error.message });
      } finally {
         setPending('');
         setProgress(null);
      }
   };

   const submitAppeal = async () => {
      setPending('submit');
      setInlineError('');
      setProgress({
         title: 'Submitting appeal',
         detail: 'Recording the plan response and updating the appeal record.',
         steps: [
            'Validate appeal draft',
            'Submit to plan workflow',
            'Save decision',
         ],
         activeStep: 0,
         completedSteps: 0,
      });
      try {
         await submitStaffAppeal(selectedAppeal.id);
         setProgress((current) => ({
            ...current,
            activeStep: 2,
            completedSteps: 2,
            complete: true,
            detail:
               'The plan workflow returned a result and the queue is updated.',
         }));
         await refresh();
         notify({
            type: 'success',
            message: 'Appeal submitted and the plan result was recorded.',
         });
      } catch (error) {
         setInlineError(error.message);
         notify({ type: 'error', message: error.message });
         setProgress(null);
      } finally {
         setPending('');
      }
   };

   const downloadAppealLetter = (appeal) => {
      const url = URL.createObjectURL(
         new Blob([letter], { type: 'text/plain;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `appeal-letter-${(appeal.patient || 'patient').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
   };

   if (hasError)
      return (
         <ErrorState
            title="The appeals queue couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!appeals)
      return <LoadingSkeleton variant="queue" label="the appeals queue" />;

   const visibleAppeals = appeals.filter(
      (appeal) => appeal.status === activeStage,
   );
   const isAdmin = role === 'staff_admin';
   const editable = ['drafted', 'denied', 'manual_review'].includes(
      selectedAppeal?.status,
   );
   const canSubmit = selectedAppeal?.status === 'drafted';
   const canDecide = ['submitted', 'approved', 'denied'].includes(
      selectedAppeal?.status,
   );

   return (
      <div className="prior-auth-page appeals-page" ref={pageRef}>
         <header className="staff-schedule-heading">
            <h1>Appeals Queue</h1>
            <p>Review clinical justification and insurance appeal status</p>
         </header>
         <div
            className="prior-auth-tabs"
            role="group"
            aria-label="Filter appeals by stage">
            {stages.map((stage) => {
               const count = appeals.filter(
                  (appeal) => appeal.status === stage,
               ).length;
               return (
                  <button
                     className={activeStage === stage ? 'selected' : ''}
                     type="button"
                     key={stage}
                     aria-pressed={activeStage === stage}
                     onClick={() => {
                        setActiveStage(stage);
                        setSelectedAppeal(null);
                     }}>
                     {statusLabels[stage]}
                     <span>{count}</span>
                  </button>
               );
            })}
         </div>
         {visibleAppeals.length ? (
            <section
               className="prior-auth-grid"
               aria-label={`${statusLabels[activeStage]} appeals`}>
               {visibleAppeals.map((appeal) => (
                  <button
                     className="prior-auth-card appeal-card"
                     type="button"
                     key={appeal.id}
                     aria-haspopup="dialog"
                     onClick={(event) =>
                        void openAppeal(appeal, event.currentTarget)
                     }>
                     <span className="prior-auth-card-top">
                        <span className={`prior-auth-status ${appeal.status}`}>
                           <span />
                           {statusLabels[appeal.status] || appeal.status}
                        </span>
                        <Icon name="chevron-right" />
                     </span>
                     <strong>{appeal.patient}</strong>
                     <span className="prior-auth-visit">
                        {appeal.visitType}
                     </span>
                     {appeal.patientDob && (
                        <span className="prior-auth-meta">
                           DOB: {dateLabel(appeal.patientDob)}
                        </span>
                     )}
                     {appeal.insurer && (
                        <span className="prior-auth-meta">
                           Insurer: {appeal.insurer}
                        </span>
                     )}
                     {appeal.denialReason && (
                        <span className="appeal-card-reason">
                           {appeal.denialReason}
                        </span>
                     )}
                  </button>
               ))}
            </section>
         ) : (
            <p className="prior-auth-empty">No appeals in this stage.</p>
         )}
         {selectedAppeal && (
            <div
               className="staff-detail-backdrop"
               onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                     setSelectedAppeal(null);
               }}>
               <aside
                  className="staff-detail-drawer"
                  ref={drawerRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="appeal-detail-title">
                  <header className="staff-detail-heading">
                     <h2 id="appeal-detail-title">
                        {selectedAppeal.patient} · Appeal
                     </h2>
                     <button
                        className="staff-detail-close"
                        type="button"
                        ref={closeButtonRef}
                        aria-label="Close appeal details"
                        onClick={() => setSelectedAppeal(null)}>
                        <Icon name="close" />
                     </button>
                  </header>
                  <div className="staff-detail-body appeal-detail-body">
                     <dl className="staff-detail-grid appeal-detail-summary">
                        <div>
                           <dt>Patient</dt>
                           <dd>{selectedAppeal.patient}</dd>
                        </div>
                        {selectedAppeal.patientDob && (
                           <div>
                              <dt>DOB</dt>
                              <dd>{dateLabel(selectedAppeal.patientDob)}</dd>
                           </div>
                        )}
                        {selectedAppeal.insurer && (
                           <div>
                              <dt>Insurer</dt>
                              <dd>{selectedAppeal.insurer}</dd>
                           </div>
                        )}
                        <div>
                           <dt>Status</dt>
                           <dd>
                              {statusLabels[selectedAppeal.status] ||
                                 selectedAppeal.status}
                           </dd>
                        </div>
                        <div className="appeal-detail-denial">
                           <dt>Denial Reason</dt>
                           <dd>
                              {selectedAppeal.denialReason ||
                                 'No denial reason on file.'}
                           </dd>
                        </div>
                     </dl>
                     {loadingDetail ? (
                        <p role="status">Loading appeal details…</p>
                     ) : (
                        <>
                           {selectedAppeal.guideline && (
                              <section className="appeal-detail-section">
                                 <h3>
                                    <span className="guideline-step">1</span>
                                    Matched Clinical Guideline
                                 </h3>
                                 <blockquote>
                                    “{selectedAppeal.guideline}”
                                    {selectedAppeal.guidelineCitation &&
                                       ` — ${selectedAppeal.guidelineCitation}`}
                                 </blockquote>
                              </section>
                           )}
                           <section className="appeal-detail-section">
                              <h3>
                                 <span className="chart-step">2</span>Chart
                                 Justification
                              </h3>
                              {editable ? (
                                 <textarea
                                    className="appeal-letter-text appeal-justification-text"
                                    aria-label="Chart justification"
                                    value={chartJustification}
                                    onChange={(event) =>
                                       setChartJustification(event.target.value)
                                    }
                                 />
                              ) : (
                                 <div className="appeal-chart-justification">
                                    {chartJustification ||
                                       'No chart justification has been added yet.'}
                                 </div>
                              )}
                           </section>
                           <section className="appeal-detail-section">
                              <h3>
                                 <span className="letter-step">3</span>Drafted
                                 Appeal Letter
                              </h3>
                              <textarea
                                 className="appeal-letter-text"
                                 aria-label="Drafted appeal letter"
                                 value={letter}
                                 readOnly={!editable}
                                 onChange={(event) =>
                                    setLetter(event.target.value)
                                 }
                              />
                           </section>
                           {editable && (
                              <div className="staff-action-row">
                                 <button
                                    className="button button-outline"
                                    type="button"
                                    disabled={Boolean(pending)}
                                    onClick={() =>
                                       void runAction(
                                          'save',
                                          () =>
                                             saveStaffAppealDraft(
                                                selectedAppeal.id,
                                                letter,
                                                chartJustification,
                                             ),
                                          'Appeal draft saved.',
                                       )
                                    }>
                                    {pending === 'save'
                                       ? 'Saving…'
                                       : 'Save draft'}
                                 </button>
                              </div>
                           )}
                        </>
                     )}
                     {progress && <PortalActionProgress {...progress} />}
                     {inlineError && (
                        <p className="prior-auth-inline-error" role="alert">
                           {inlineError}
                        </p>
                     )}
                     <footer className="appeal-detail-footer">
                        {canSubmit && (
                           <button
                              className="button button-primary appeal-submit"
                              type="button"
                              disabled={Boolean(pending) || !isAdmin}
                              title={
                                 !isAdmin
                                    ? 'Only staff admins can submit appeals.'
                                    : undefined
                              }
                              onClick={() => void submitAppeal()}>
                              {pending === 'submit'
                                 ? 'Submitting…'
                                 : 'Submit appeal'}
                           </button>
                        )}
                        {canDecide && (
                           <>
                              <button
                                 className="button button-outline"
                                 type="button"
                                 disabled={Boolean(pending) || !isAdmin}
                                 title={
                                    !isAdmin
                                       ? 'Only staff admins can record appeal decisions.'
                                       : undefined
                                 }
                                 onClick={() =>
                                    void runAction(
                                       'decision',
                                       () =>
                                          setStaffAppealDecision(
                                             selectedAppeal.id,
                                             'approved',
                                          ),
                                       'Appeal marked approved.',
                                    )
                                 }>
                                 {pending === 'decision'
                                    ? 'Updating…'
                                    : 'Mark approved'}
                              </button>
                              <button
                                 className="button button-outline"
                                 type="button"
                                 disabled={Boolean(pending) || !isAdmin}
                                 title={
                                    !isAdmin
                                       ? 'Only staff admins can record appeal decisions.'
                                       : undefined
                                 }
                                 onClick={() =>
                                    void runAction(
                                       'decision',
                                       () =>
                                          setStaffAppealDecision(
                                             selectedAppeal.id,
                                             'denied',
                                          ),
                                       'Appeal marked denied.',
                                    )
                                 }>
                                 {pending === 'decision'
                                    ? 'Updating…'
                                    : 'Mark denied'}
                              </button>
                           </>
                        )}
                        <button
                           className="button button-outline"
                           type="button"
                           disabled={!letter.trim()}
                           onClick={() => downloadAppealLetter(selectedAppeal)}>
                           <Icon name="download" />
                           Download
                        </button>
                        <button
                           className="button button-quiet"
                           type="button"
                           disabled={Boolean(pending)}
                           onClick={() => setSelectedAppeal(null)}>
                           Close
                        </button>
                     </footer>
                     {!isAdmin && (canSubmit || canDecide) && (
                        <p className="appeal-admin-note">
                           Only staff admins can submit appeals or record
                           insurer decisions. Staff can still prepare and save
                           draft changes.
                        </p>
                     )}
                  </div>
               </aside>
            </div>
         )}
      </div>
   );
}

export default StaffAppeals;
