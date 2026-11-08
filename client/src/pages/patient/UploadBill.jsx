import { useCallback, useEffect, useRef, useState } from 'react';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import PortalActionProgress from '../../components/PortalActionProgress.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { usePortalFeedback } from '../../contexts/PortalFeedbackContext.jsx';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import { gsap, useGSAP } from '../../utils/portalGsap.js';
import { formatClinicDate } from '../../services/patientDates.js';
import {
   BILL_MAX_BYTES,
   createPatientBill,
   deletePatientBill,
   explainPatientBill,
   getMyBills,
   isSupportedBillFile,
   markPatientDisputeDownloaded,
   submitPatientDisputeLetter,
   updatePatientDisputeLetter,
   uploadPatientBill,
} from '../../services/patientBills.js';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
   style: 'currency',
   currency: 'PHP',
});
const BILL_HISTORY_PAGE_SIZE = 3;

function UploadBill() {
   const [selectedFile, setSelectedFile] = useState(null);
   const [uploadResult, setUploadResult] = useState(null);
   const [bill, setBill] = useState(null);
   const [billHistory, setBillHistory] = useState([]);
   const [billHistoryPage, setBillHistoryPage] = useState(1);
   const [selectedBillId, setSelectedBillId] = useState(null);
   const [billToDelete, setBillToDelete] = useState(null);
   const [isHistoryLoading, setIsHistoryLoading] = useState(true);
   const [hasHistoryError, setHasHistoryError] = useState(false);
   const [draftLetter, setDraftLetter] = useState('');
   const [expandedLineItem, setExpandedLineItem] = useState(null);
   const [isDragging, setIsDragging] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [processingStage, setProcessingStage] = useState('');
   const [isDeletingBill, setIsDeletingBill] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [lineItemExplanations, setLineItemExplanations] = useState({});
   const [isLoadingExplanations, setIsLoadingExplanations] = useState(false);
   const [explanationError, setExplanationError] = useState('');
   const [error, setError] = useState('');
   const [displayBillToDelete, setDisplayBillToDelete] = useState(null);
   const currentBillIdRef = useRef(null);
   const pageRef = useRef(null);
   const billReviewRef = useRef(null);
   const billDeleteDialogRef = useRef(null);
   const billDeleteContentRef = useRef(null);
   const explanationRequestsRef = useRef(new Map());
   const { notify } = usePortalFeedback();
   usePortalPageReveal(pageRef, !isHistoryLoading);

   const loadBillHistory = useCallback(async () => {
      setIsHistoryLoading(true);
      setHasHistoryError(false);
      try {
         setBillHistory(await getMyBills());
      } catch {
         setHasHistoryError(true);
      } finally {
         setIsHistoryLoading(false);
      }
   }, []);

   useEffect(() => {
      void loadBillHistory();
   }, [loadBillHistory]);

   useGSAP(
      () => {
         const dialog = billDeleteDialogRef.current;
         const content = billDeleteContentRef.current;
         if (!dialog || !content) return undefined;
         const media = gsap.matchMedia();

         if (billToDelete) {
            if (!dialog.open) dialog.showModal();
            media.add('(prefers-reduced-motion: reduce)', () =>
               gsap.set(content, { autoAlpha: 1, y: 0, scale: 1 }),
            );
            media.add('(prefers-reduced-motion: no-preference)', () => {
               gsap.fromTo(
                  content,
                  { autoAlpha: 0, y: 12, scale: 0.98 },
                  {
                     autoAlpha: 1,
                     y: 0,
                     scale: 1,
                     duration: 0.24,
                     ease: 'power2.out',
                  },
               );
            });
         } else if (dialog.open) {
            media.add('(prefers-reduced-motion: reduce)', () => {
               dialog.close();
               window.requestAnimationFrame(() => setDisplayBillToDelete(null));
            });
            media.add('(prefers-reduced-motion: no-preference)', () => {
               gsap.to(content, {
                  autoAlpha: 0,
                  y: 8,
                  scale: 0.98,
                  duration: 0.16,
                  ease: 'power1.in',
                  onComplete: () => {
                     dialog.close();
                     setDisplayBillToDelete(null);
                  },
               });
            });
         }
         return () => media.revert();
      },
      {
         scope: billDeleteDialogRef,
         dependencies: [billToDelete],
         revertOnUpdate: true,
      },
   );

   const loadLineItemExplanations = (billId) => {
      if (!billId || explanationRequestsRef.current.has(billId)) return;
      setIsLoadingExplanations(true);
      setExplanationError('');
      const request = explainPatientBill(billId)
         .then((result) => {
            if (currentBillIdRef.current !== billId) return;
            const explanations = Array.isArray(result.lineItemExplanations)
               ? result.lineItemExplanations
               : [];
            setLineItemExplanations(
               Object.fromEntries(
                  explanations.map((item) => [
                     item.lineItemId,
                     item.explanation,
                  ]),
               ),
            );
         })
         .catch((requestError) => {
            explanationRequestsRef.current.delete(billId);
            if (currentBillIdRef.current === billId) {
               setExplanationError(
                  requestError.message ||
                     'Could not load the plain-language explanations.',
               );
            }
         })
         .finally(() => {
            if (currentBillIdRef.current === billId) {
               setIsLoadingExplanations(false);
            }
         });
      explanationRequestsRef.current.set(billId, request);
   };

   const toggleLineItem = (itemId) => {
      const shouldExpand = expandedLineItem !== itemId;
      setExpandedLineItem(shouldExpand ? itemId : null);
      if (shouldExpand && bill?.id) loadLineItemExplanations(bill.id);
   };

   const closeBillReview = () => {
      currentBillIdRef.current = null;
      setSelectedBillId(null);
      setBill(null);
      setSelectedFile(null);
      setUploadResult(null);
      setDraftLetter('');
      setExpandedLineItem(null);
      setLineItemExplanations({});
      setIsLoadingExplanations(false);
      setExplanationError('');
      setIsEditing(false);
   };

   const processBill = async (
      file = selectedFile,
      existingUpload = uploadResult,
   ) => {
      if (!file && !existingUpload) return;
      setError('');
      setIsProcessing(true);
      let uploaded = existingUpload;
      setProcessingStage(uploaded ? 'saving' : 'uploading');
      try {
         if (!uploaded) {
            uploaded = await uploadPatientBill(file);
            setUploadResult({ ...uploaded, fileName: file.name });
            setProcessingStage('saving');
         }
         const savedBill = await createPatientBill(
            uploaded.uploadedFileUrl,
            Array.isArray(uploaded.lineItems) ? uploaded.lineItems : [],
         );
         currentBillIdRef.current = savedBill.id;
         setBill(savedBill);
         setSelectedBillId(savedBill.id);
         setBillHistory((current) => [
            savedBill,
            ...current.filter((item) => item.id !== savedBill.id),
         ]);
         setBillHistoryPage(1);
         setLineItemExplanations({});
         setIsLoadingExplanations(false);
         setExplanationError('');
         setDraftLetter(savedBill.disputeLetter?.letterText || '');
         setExpandedLineItem(null);
         setIsEditing(false);
         notify({
            type: 'success',
            message: 'Bill uploaded and review saved.',
         });
      } catch (requestError) {
         setError(
            uploaded
               ? 'The bill was uploaded, but could not be saved. Retry to finish without uploading it again.'
               : requestError.message ||
                    'We could not upload this bill. Please try again.',
         );
      } finally {
         setIsProcessing(false);
         setProcessingStage('');
      }
   };

   const selectFile = (file) => {
      setError('');
      if (!file.size) {
         setError('This file is empty. Choose a bill file and try again.');
         return;
      }
      if (file.size > BILL_MAX_BYTES) {
         setError('This file is larger than 10 MB. Choose a smaller file.');
         return;
      }
      if (!isSupportedBillFile(file)) {
         setError('Choose a PDF, JPG, or PNG file.');
         return;
      }

      setSelectedFile(file);
      setUploadResult(null);
      setSelectedBillId(null);
      currentBillIdRef.current = null;
      setBill(null);
      setLineItemExplanations({});
      setIsLoadingExplanations(false);
      setExplanationError('');
      setDraftLetter('');
      setExpandedLineItem(null);
      setIsEditing(false);
      void processBill(file, null);
   };

   const handleFileChange = (event) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = '';
      if (file) selectFile(file);
   };

   const handleDrop = (event) => {
      event.preventDefault();
      setIsDragging(false);
      if (
         !isProcessing &&
         !isDeletingBill &&
         !hasPendingSave &&
         event.dataTransfer.files[0]
      )
         selectFile(event.dataTransfer.files[0]);
   };

   const saveDraft = async () => {
      if (!bill?.disputeLetter) return;
      setIsProcessing(true);
      setError('');
      try {
         const savedLetter = await updatePatientDisputeLetter(
            bill.id,
            draftLetter,
         );
         setBill((current) => ({ ...current, disputeLetter: savedLetter }));
         setIsEditing(false);
         notify({ type: 'success', message: 'Dispute letter draft saved.' });
      } catch (requestError) {
         setError(
            requestError.message ||
               'The letter could not be saved. Please try again.',
         );
      } finally {
         setIsProcessing(false);
      }
   };

   const cancelEdit = () => {
      setDraftLetter(bill.disputeLetter.letterText);
      setIsEditing(false);
   };

   const submitDispute = async () => {
      if (!bill?.disputeLetter || bill.disputeLetter.submittedAt || isEditing)
         return;
      setIsProcessing(true);
      setError('');
      try {
         const submittedLetter = await submitPatientDisputeLetter(bill.id);
         setBill((current) => ({ ...current, disputeLetter: submittedLetter }));
         setBillHistory((current) =>
            current.map((item) =>
               item.id === bill.id
                  ? { ...item, disputeLetter: submittedLetter }
                  : item,
            ),
         );
         notify({
            type: 'success',
            message:
               'Your dispute was submitted to clinic staff and is now on their Disputes page.',
         });
      } catch (requestError) {
         setError(
            requestError.message ||
               'The dispute could not be submitted. Please try again.',
         );
      } finally {
         setIsProcessing(false);
      }
   };

   const confirmBillDeletion = async () => {
      if (!billToDelete || isProcessing || isDeletingBill || hasPendingSave)
         return;
      const deletedId = billToDelete.id;
      setIsDeletingBill(true);
      try {
         await deletePatientBill(deletedId);
         const remainingCount = billHistory.filter(
            (item) => item.id !== deletedId,
         ).length;
         setBillHistory((current) =>
            current.filter((item) => item.id !== deletedId),
         );
         setBillHistoryPage((page) =>
            Math.min(
               page,
               Math.max(1, Math.ceil(remainingCount / BILL_HISTORY_PAGE_SIZE)),
            ),
         );
         if (selectedBillId === deletedId) {
            closeBillReview();
         }
         setBillToDelete(null);
         notify({
            type: 'success',
            message: 'Bill #' + deletedId + ' was deleted.',
         });
      } catch (requestError) {
         setBillToDelete(null);
         if (requestError.status === 409) {
            try {
               const latestBills = await getMyBills();
               setBillHistory(latestBills);
               const latestBill = latestBills.find(
                  (item) => item.id === deletedId,
               );
               if (selectedBillId === deletedId && latestBill) {
                  setBill(latestBill);
                  setDraftLetter(latestBill.disputeLetter?.letterText || '');
               }
            } catch {
               // Keep the current history if the conflict refresh also fails.
            }
         }
         notify({
            type: 'error',
            message:
               requestError.message ||
               'The bill could not be deleted. Your billing history is unchanged.',
         });
      } finally {
         setIsDeletingBill(false);
      }
   };

   const downloadDraft = async () => {
      if (!bill?.disputeLetter?.letterText) return;
      const url = URL.createObjectURL(
         new Blob([bill.disputeLetter.letterText], {
            type: 'text/plain;charset=utf-8',
         }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bill-dispute-letter.txt';
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      try {
         await markPatientDisputeDownloaded(bill.id);
      } catch {
         notify({
            type: 'info',
            message:
               'The letter downloaded, but we could not record the download.',
         });
      }
   };

   const lineItems = bill?.lineItems || [];
   const flaggedCount = lineItems.filter((item) => item.isFlagged).length;
   const totalBilled = lineItems.reduce(
      (total, item) => total + Number(item.amount || 0),
      0,
   );
   const totalBilledLabel = currencyFormatter.format(totalBilled);
   const hasPendingSave = Boolean(uploadResult && !bill);
   const historyPageCount = Math.max(
      1,
      Math.ceil(billHistory.length / BILL_HISTORY_PAGE_SIZE),
   );
   const visibleHistoryPage = Math.min(billHistoryPage, historyPageCount);
   const visibleBills = billHistory.slice(
      (visibleHistoryPage - 1) * BILL_HISTORY_PAGE_SIZE,
      visibleHistoryPage * BILL_HISTORY_PAGE_SIZE,
   );
   const openSavedBill = (savedBill) => {
      if (isProcessing || isDeletingBill || hasPendingSave) return;
      setError('');
      setSelectedFile(null);
      setUploadResult(null);
      setBill(savedBill);
      setSelectedBillId(savedBill.id);
      currentBillIdRef.current = savedBill.id;
      setLineItemExplanations({});
      setIsLoadingExplanations(false);
      setExplanationError('');
      setDraftLetter(savedBill.disputeLetter?.letterText || '');
      setExpandedLineItem(null);
      setIsEditing(false);
      window.requestAnimationFrame(() => {
         const behavior = window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'auto'
            : 'smooth';
         billReviewRef.current?.scrollIntoView({ behavior, block: 'start' });
      });
   };

   return (
      <div className="centered-page bill-page" ref={pageRef}>
         <dialog
            ref={billDeleteDialogRef}
            className="bill-delete-dialog"
            aria-labelledby="bill-delete-title"
            aria-describedby="bill-delete-description"
            onCancel={(event) => {
               event.preventDefault();
               if (!isDeletingBill) {
                  setDisplayBillToDelete(billToDelete || displayBillToDelete);
                  setBillToDelete(null);
               }
            }}
            onClick={(event) => {
               if (event.target === event.currentTarget && !isDeletingBill) {
                  setDisplayBillToDelete(billToDelete || displayBillToDelete);
                  setBillToDelete(null);
               }
            }}>
            {(billToDelete || displayBillToDelete) && (
               <div
                  className="bill-delete-dialog-content"
                  ref={billDeleteContentRef}>
                  <h2 id="bill-delete-title">
                     Delete bill #{(billToDelete || displayBillToDelete).id}?
                  </h2>
                  <p id="bill-delete-description">
                     This permanently deletes the bill, any stored file, its
                     extracted line items, and any draft dispute letter. This
                     can’t be undone.
                  </p>
                  <div className="bill-delete-dialog-actions">
                     <button
                        className="button button-light"
                        type="button"
                        disabled={isDeletingBill}
                        onClick={() => setBillToDelete(null)}>
                        Keep bill
                     </button>
                     <button
                        className="button button-danger"
                        type="button"
                        disabled={isDeletingBill}
                        onClick={() => void confirmBillDeletion()}>
                        {isDeletingBill ? 'Deleting…' : 'Delete bill'}
                     </button>
                  </div>
               </div>
            )}
         </dialog>
         <header className="bill-page-heading">
            <h1>Upload &amp; Dispute a Bill</h1>
            <p>We’ll extract and review your bill for potential issues</p>
         </header>

         <section
            className="bill-card bill-history-card"
            aria-labelledby="bill-history-heading">
            <header className="bill-card-heading">
               <div>
                  <h2 id="bill-history-heading">Billing history</h2>
                  <p>Your uploaded bills and their review status</p>
               </div>
            </header>
            {isHistoryLoading ? (
               <div
                  className="bill-history-loading"
                  role="status"
                  aria-busy="true">
                  <span className="sr-only">Loading your billing history.</span>
                  {[0, 1, 2].map((row) => (
                     <div className="bill-history-loading-row" key={row}>
                        <span
                           className="skeleton-bone"
                           style={{
                              width: `${row === 1 ? 46 : 58}%`,
                              height: 13,
                           }}
                        />
                        <span
                           className="skeleton-bone"
                           style={{ width: 76, height: 13 }}
                        />
                        <span
                           className="skeleton-bone"
                           style={{ width: 78, height: 24, borderRadius: 99 }}
                        />
                        <span
                           className="skeleton-bone"
                           style={{ width: 62, height: 34, borderRadius: 9 }}
                        />
                     </div>
                  ))}
               </div>
            ) : hasHistoryError ? (
               <ErrorState
                  compact
                  title="Billing history couldn’t load"
                  message="Your bills haven’t been changed. Try loading the history again."
                  retryLabel="Try again"
                  onRetry={() => void loadBillHistory()}
               />
            ) : billHistory.length ? (
               <>
                  <ul className="bill-history-list">
                     {visibleBills.map((savedBill) => (
                        <BillHistoryRow
                           key={savedBill.id}
                           bill={savedBill}
                           isSelected={selectedBillId === savedBill.id}
                           disabled={
                              isProcessing || isDeletingBill || hasPendingSave
                           }
                           onReview={() =>
                              selectedBillId === savedBill.id
                                 ? closeBillReview()
                                 : openSavedBill(savedBill)
                           }
                           onDelete={() => {
                              setDisplayBillToDelete(savedBill);
                              setBillToDelete(savedBill);
                           }}
                        />
                     ))}
                  </ul>
                  {billHistory.length > BILL_HISTORY_PAGE_SIZE && (
                     <nav
                        className="bill-history-pagination"
                        aria-label="Bill history pagination">
                        <span>
                           Showing{' '}
                           {(visibleHistoryPage - 1) * BILL_HISTORY_PAGE_SIZE +
                              1}
                           –
                           {Math.min(
                              visibleHistoryPage * BILL_HISTORY_PAGE_SIZE,
                              billHistory.length,
                           )}{' '}
                           of {billHistory.length}
                        </span>
                        <div className="bill-history-page-controls">
                           <button
                              className="button button-light button-small"
                              type="button"
                              disabled={visibleHistoryPage === 1}
                              onClick={() =>
                                 setBillHistoryPage(
                                    Math.max(1, visibleHistoryPage - 1),
                                 )
                              }>
                              Previous
                           </button>
                           <span aria-live="polite">
                              Page {visibleHistoryPage} of {historyPageCount}
                           </span>
                           <button
                              className="button button-light button-small"
                              type="button"
                              disabled={visibleHistoryPage === historyPageCount}
                              onClick={() =>
                                 setBillHistoryPage(
                                    Math.min(
                                       historyPageCount,
                                       visibleHistoryPage + 1,
                                    ),
                                 )
                              }>
                              Next
                           </button>
                        </div>
                     </nav>
                  )}
               </>
            ) : (
               <p className="bill-history-empty">
                  No bills uploaded yet. Bills you upload will appear here.
               </p>
            )}
         </section>

         <label
            className={
               'bill-dropzone' +
               (isDragging ? ' dragging' : '') +
               (selectedFile ? ' ready' : '')
            }
            aria-busy={isProcessing || isDeletingBill}
            onDragOver={(event) => {
               event.preventDefault();
               if (!isProcessing && !isDeletingBill && !hasPendingSave)
                  setIsDragging(true);
            }}
            onDragLeave={(event) => {
               if (event.currentTarget === event.target) setIsDragging(false);
            }}
            onDrop={handleDrop}>
            <input
               className="bill-file-input"
               type="file"
               accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/jpg,image/png"
               aria-describedby={
                  error
                     ? 'bill-upload-help bill-upload-error'
                     : 'bill-upload-help'
               }
               aria-invalid={Boolean(error)}
               disabled={isProcessing || isDeletingBill || hasPendingSave}
               onChange={handleFileChange}
            />
            <span className={'bill-dropzone-icon' + (bill ? ' complete' : '')}>
               <Icon name={bill ? 'check' : 'upload'} />
            </span>
            <span className="bill-dropzone-title">
               {selectedFile ? selectedFile.name : 'Drop your bill here'}
            </span>
            <span className="bill-dropzone-help" id="bill-upload-help">
               {hasPendingSave
                  ? 'Retry saving this upload before choosing another file'
                  : selectedFile
                    ? isProcessing
                       ? 'Uploading and scanning your bill…'
                       : bill
                         ? 'Scan complete. Choose another bill to review.'
                         : error
                           ? 'Upload needs attention. Choose this file again to retry.'
                           : 'Your bill is ready to scan.'
                    : 'or click to browse — PDF, JPG, PNG supported · Max 10 MB'}
            </span>
         </label>
         {hasPendingSave && (
            <div className="bill-upload-actions">
               <button
                  className="button button-primary"
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void processBill(selectedFile, uploadResult)}>
                  {isProcessing ? 'Saving bill…' : 'Retry saving bill'}
               </button>
            </div>
         )}
         {isProcessing && !bill && (
            <PortalActionProgress
               title={
                  processingStage === 'saving'
                     ? 'Saving your bill review'
                     : 'Uploading and scanning your bill'
               }
               detail={
                  processingStage === 'saving'
                     ? 'The scan is complete. We’re saving the extracted items and review notes to your billing history.'
                     : 'We’re securely uploading the file and reading the bill details. This can take a moment.'
               }
               steps={['Upload and scan bill', 'Save review results']}
               activeStep={processingStage === 'saving' ? 1 : 0}
               completedSteps={processingStage === 'saving' ? 1 : 0}
            />
         )}
         <span className="sr-only" role="status" aria-live="polite">
            {isProcessing
               ? processingStage === 'saving'
                  ? 'Saving scan results.'
                  : 'Uploading and scanning bill.'
               : bill
                 ? 'Bill scanned and saved.'
                 : ''}
         </span>
         {error && (
            <p
               className="bill-upload-error"
               id="bill-upload-error"
               role="alert">
               {error}
            </p>
         )}

         {bill && (
            <>
               {uploadResult?.requiresManualReview &&
                  lineItems.length === 0 && (
                     <p className="bill-review-notice" role="status">
                        Automated extraction could not identify line items. Your
                        bill was saved for manual review.
                     </p>
                  )}
               <section className="bill-stats-grid" aria-label="Bill summary">
                  <article className="bill-stat">
                     <span>Line Items</span>
                     <strong>{lineItems.length}</strong>
                  </article>
                  <article className="bill-stat flagged">
                     <span>Flagged</span>
                     <strong>{flaggedCount}</strong>
                     <small>
                        {flaggedCount ? 'Review needed' : 'None flagged'}
                     </small>
                  </article>
                  <article className="bill-stat">
                     <span>Total Billed</span>
                     <strong>{totalBilledLabel}</strong>
                  </article>
               </section>

               <div className="bill-review-content" ref={billReviewRef}>
                  <section
                     className="bill-card"
                     aria-labelledby="line-items-heading">
                     <header className="bill-card-heading">
                        <div>
                           <h2 id="line-items-heading">Extracted Line Items</h2>
                           <p>
                              Click a row to learn what the item does and see
                              any review note
                           </p>
                        </div>
                        <button
                           className="button button-outline button-small"
                           type="button"
                           disabled={isProcessing || isDeletingBill}
                           onClick={closeBillReview}>
                           Close review
                        </button>
                     </header>
                     <div className="bill-line-header" aria-hidden="true">
                        <span />
                        <span>Description</span>
                        <span>Code</span>
                        <span>Amount</span>
                        <span>Flag</span>
                     </div>
                     {lineItems.length ? (
                        <div className="bill-line-list">
                           {lineItems.map((item) => {
                              const expanded = expandedLineItem === item.id;
                              const detailId = 'bill-line-detail-' + item.id;
                              return (
                                 <div
                                    className={
                                       'bill-line' +
                                       (item.isFlagged ? ' flagged' : '')
                                    }
                                    key={item.id}>
                                    <button
                                       className="bill-line-trigger"
                                       id={'bill-line-' + item.id}
                                       type="button"
                                       aria-expanded={expanded}
                                       aria-controls={detailId}
                                       onClick={() => toggleLineItem(item.id)}>
                                       <Icon
                                          className={
                                             'bill-line-chevron' +
                                             (expanded ? ' open' : '')
                                          }
                                          name="chevron-right"
                                       />
                                       <span className="bill-line-description">
                                          {item.description ||
                                             'Unidentified charge'}
                                       </span>
                                       <code className="bill-line-code">
                                          {item.procedureCode || '—'}
                                       </code>
                                       <span className="bill-line-amount">
                                          {currencyFormatter.format(
                                             Number(item.amount),
                                          )}
                                       </span>
                                       <span className="bill-line-status">
                                          <StatusPill
                                             status={
                                                item.isFlagged
                                                   ? 'flagged'
                                                   : 'approved'
                                             }>
                                             {item.isFlagged ? 'Flagged' : 'OK'}
                                          </StatusPill>
                                       </span>
                                    </button>
                                    <div
                                       className="bill-line-detail"
                                       id={detailId}
                                       role="region"
                                       aria-labelledby={'bill-line-' + item.id}
                                       hidden={!expanded}>
                                       <div className="bill-line-detail-section">
                                          <strong>
                                             What this item is and does
                                          </strong>
                                          {isLoadingExplanations &&
                                          !lineItemExplanations[item.id] ? (
                                             <p>
                                                Preparing a plain-language
                                                explanation…
                                             </p>
                                          ) : explanationError &&
                                            !lineItemExplanations[item.id] ? (
                                             <>
                                                <p>{explanationError}</p>
                                                <button
                                                   className="bill-line-detail-retry"
                                                   type="button"
                                                   onClick={() =>
                                                      loadLineItemExplanations(
                                                         bill.id,
                                                      )
                                                   }>
                                                   Try again
                                                </button>
                                             </>
                                          ) : (
                                             <p>
                                                {lineItemExplanations[
                                                   item.id
                                                ] ||
                                                   'The bill does not provide enough detail to explain this item.'}
                                             </p>
                                          )}
                                       </div>
                                       <div
                                          className={
                                             'bill-line-detail-section bill-line-review-note' +
                                             (item.isFlagged ? ' flagged' : '')
                                          }>
                                          <strong>Flag review note</strong>
                                          <p>
                                             {item.flagReason ||
                                                'No review flag was raised for this line item.'}
                                          </p>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     ) : (
                        <p className="bill-empty-lines">
                           No line items were returned for this bill.
                        </p>
                     )}
                  </section>

                  {bill.disputeLetter && (
                     <section
                        className="bill-card bill-letter-card"
                        aria-labelledby="dispute-letter-heading">
                        <header className="bill-card-heading bill-letter-heading">
                           <div>
                              <h2 id="dispute-letter-heading">
                                 {bill.disputeLetter.submittedAt
                                    ? 'Dispute Letter'
                                    : 'Drafted Dispute Letter'}
                              </h2>
                              <p>
                                 {bill.disputeLetter.submittedAt
                                    ? 'Submitted to clinic staff for review'
                                    : 'Review and edit the letter, then submit it to clinic staff'}
                              </p>
                           </div>
                           <div className="bill-letter-actions">
                              {isEditing ? (
                                 <>
                                    <button
                                       className="button button-light"
                                       type="button"
                                       disabled={isProcessing}
                                       onClick={cancelEdit}>
                                       Cancel
                                    </button>
                                    <button
                                       className="button button-primary"
                                       type="button"
                                       disabled={isProcessing}
                                       onClick={() => void saveDraft()}>
                                       {isProcessing ? 'Saving…' : 'Save'}
                                    </button>
                                 </>
                              ) : (
                                 <>
                                    {!bill.disputeLetter.submittedAt && (
                                       <button
                                          className="button button-outline"
                                          type="button"
                                          onClick={() => setIsEditing(true)}>
                                          Edit
                                       </button>
                                    )}
                                    {bill.disputeLetter.submittedAt && (
                                       <span className="bill-dispute-submitted">
                                          Submitted to staff
                                       </span>
                                    )}
                                 </>
                              )}
                              <button
                                 className="button button-outline"
                                 type="button"
                                 disabled={isProcessing}
                                 onClick={() => void downloadDraft()}>
                                 <Icon name="download" />
                                 Download
                              </button>
                              {!isEditing &&
                                 !bill.disputeLetter.submittedAt && (
                                    <button
                                       className="button button-primary"
                                       type="button"
                                       disabled={isProcessing}
                                       onClick={() => void submitDispute()}>
                                       {isProcessing
                                          ? 'Submitting…'
                                          : 'Submit to Staff'}
                                    </button>
                                 )}
                           </div>
                        </header>
                        <textarea
                           className={
                              'bill-letter-text' + (isEditing ? ' editing' : '')
                           }
                           aria-label="Drafted dispute letter"
                           readOnly={!isEditing}
                           value={draftLetter}
                           onChange={(event) =>
                              setDraftLetter(event.target.value)
                           }
                        />
                     </section>
                  )}
               </div>
            </>
         )}
      </div>
   );
}

function BillHistoryRow({ bill, isSelected, disabled, onReview, onDelete }) {
   const lineItems = bill.lineItems || [];
   const total = lineItems.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
   );
   const status = {
      processing: ['pending', 'Processing'],
      processed: ['approved', 'Processed'],
      disputed: ['flagged', 'Needs review'],
      resolved: ['approved', 'Resolved'],
   }[bill.status] || ['waitlisted', 'Status unavailable'];
   const fileUrl = /^https?:\/\//i.test(bill.uploadedFileUrl || '')
      ? bill.uploadedFileUrl
      : null;

   return (
      <li className={'bill-history-row' + (isSelected ? ' selected' : '')}>
         <div className="bill-history-copy">
            <strong>Bill #{bill.id}</strong>
            <span>
               Uploaded {formatClinicDate(bill.uploadDate)} · {lineItems.length}{' '}
               {lineItems.length === 1 ? 'line item' : 'line items'}
            </span>
         </div>
         <div className="bill-history-amount">
            <span>Total billed</span>
            <strong className="bill-history-total">
               {lineItems.length ? currencyFormatter.format(total) : '—'}
            </strong>
         </div>
         <div className="bill-history-statuses">
            <StatusPill status={status[0]}>{status[1]}</StatusPill>
            {bill.disputeLetter?.submittedAt && (
               <span className="bill-history-retained">Submitted to staff</span>
            )}
         </div>
         <div className="bill-history-actions">
            {fileUrl && (
               <a
                  className="bill-history-file-link"
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer">
                  View file
               </a>
            )}
            <button
               className="button button-outline button-small"
               type="button"
               disabled={disabled}
               aria-pressed={isSelected}
               onClick={onReview}>
               {isSelected ? 'Close review' : 'Review'}
            </button>
            {!bill.disputeLetter?.submittedAt && (
               <button
                  className="button button-light button-small bill-delete-trigger"
                  type="button"
                  disabled={disabled}
                  onClick={onDelete}
                  aria-label={`Delete bill ${bill.id}`}>
                  Delete
               </button>
            )}
         </div>
      </li>
   );
}

export default UploadBill;
