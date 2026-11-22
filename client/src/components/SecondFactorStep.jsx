import { useEffect, useRef, useState } from 'react';
import OtpInput from './OtpInput.jsx';
import {
   confirmSecondFactorSetup,
   startSecondFactorSetup,
   verifySecondFactor,
} from '../services/auth.js';

const enrolmentHint = 'Ask a staff admin for an enrolment code.';

// mode: 'required' (enter a code) or 'setup_required' (scan QR, confirm, save Recovery Codes).
// needsEnrolmentCode: setup starts only after an Enrolment Code (not for invited staff).
function SecondFactorStep({ mode, needsEnrolmentCode, onComplete, onCancel }) {
   const isSetup = mode === 'setup_required';
   const [setup, setSetup] = useState(null);
   const [code, setCode] = useState('');
   const [enrolmentCode, setEnrolmentCode] = useState('');
   const [useRecoveryCode, setUseRecoveryCode] = useState(false);
   const [recoveryCodes, setRecoveryCodes] = useState(null);
   const [completedUser, setCompletedUser] = useState(null);
   const [error, setError] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [attempt, setAttempt] = useState(0);
   const inFlight = useRef(false);
   const askEnrolmentCode = isSetup && needsEnrolmentCode && !setup;

   useEffect(() => {
      if (!isSetup || needsEnrolmentCode) return undefined;
      let current = true;
      startSecondFactorSetup()
         .then((result) => current && setSetup(result))
         .catch((setupError) => current && setError(setupError.message));
      return () => {
         current = false;
      };
   }, [isSetup, needsEnrolmentCode]);

   const submitEnrolmentCode = async (event) => {
      event.preventDefault();
      setError('');
      setIsSubmitting(true);
      try {
         setSetup(await startSecondFactorSetup(enrolmentCode.trim()));
      } catch (setupError) {
         setError(setupError.message || enrolmentHint);
      } finally {
         setIsSubmitting(false);
      }
   };

   // Auto-submit (6th digit), Enter and the Verify button all land here; the
   // ref blocks a second request before React re-renders with isSubmitting,
   // since each wrong code counts toward the account lockout.
   const submitCode = async (value) => {
      if (inFlight.current || (isSetup && !setup)) return;
      if (!useRecoveryCode && !/^\d{6}$/.test(value)) return;
      inFlight.current = true;
      setError('');
      setIsSubmitting(true);
      try {
         if (isSetup) {
            const result = await confirmSecondFactorSetup(value);
            setCompletedUser(result.user);
            setRecoveryCodes(result.recoveryCodes);
         } else {
            const result = await verifySecondFactor(
               useRecoveryCode
                  ? { recoveryCode: value.trim() }
                  : { code: value },
            );
            await onComplete(result.user);
         }
      } catch (submitError) {
         setError(submitError.message || 'That code did not work.');
         if (!useRecoveryCode) {
            // Fresh boxes; the new key remounts them so autoFocus refocuses box 1.
            setCode('');
            setAttempt((current) => current + 1);
         }
      } finally {
         inFlight.current = false;
         setIsSubmitting(false);
      }
   };

   const submit = (event) => {
      event.preventDefault();
      submitCode(code);
   };

   if (recoveryCodes) {
      return (
         <div className="auth-form">
            <p className="auth-step-note">
               Save these Recovery Codes somewhere safe. Each one signs you in
               once if you lose your phone. They won’t be shown again.
            </p>
            <ul className="auth-recovery-codes" aria-label="Recovery Codes">
               {recoveryCodes.map((recoveryCode) => (
                  <li key={recoveryCode}>
                     <code>{recoveryCode}</code>
                  </li>
               ))}
            </ul>
            <div className="auth-form-actions">
               <button
                  className="auth-submit"
                  type="button"
                  onClick={() => onComplete(completedUser)}>
                  I’ve saved my codes
               </button>
            </div>
         </div>
      );
   }

   if (askEnrolmentCode) {
      return (
         <form
            className="auth-form"
            onSubmit={submitEnrolmentCode}
            aria-busy={isSubmitting}>
            <p className="auth-step-note">
               Enter the enrolment code a staff admin gave you to start setup.
               Don’t have one? {enrolmentHint}
            </p>
            <div className="auth-field">
               <label htmlFor="enrolment-code">Enrolment code</label>
               <input
                  id="enrolment-code"
                  name="enrolmentCode"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={24}
                  value={enrolmentCode}
                  onChange={(event) => setEnrolmentCode(event.target.value)}
                  required
                  autoFocus
               />
            </div>
            {error && (
               <p className="auth-error" role="alert">
                  {error}
               </p>
            )}
            <div className="auth-form-actions">
               <button className="auth-back" type="button" onClick={onCancel}>
                  Back
               </button>
               <button
                  className="auth-submit"
                  type="submit"
                  disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait…' : 'Continue'}
               </button>
            </div>
         </form>
      );
   }

   return (
      <form className="auth-form" onSubmit={submit} aria-busy={isSubmitting}>
         {isSetup && (
            <>
               <p className="auth-step-note">
                  Scan this QR code with Google Authenticator, then enter the
                  6-digit code it shows.
               </p>
               {setup ? (
                  <div className="auth-second-factor-qr">
                     <img
                        src={setup.qrCodeDataUrl}
                        alt="QR code for your authenticator app"
                        width="200"
                        height="200"
                     />
                     <p>
                        Can’t scan? Enter this key: <code>{setup.secret}</code>
                     </p>
                  </div>
               ) : (
                  !error && <p className="auth-step-note">Preparing…</p>
               )}
            </>
         )}

         <div className="auth-field">
            <label htmlFor="second-factor-code">
               {useRecoveryCode ? 'Recovery Code' : '6-digit code'}
            </label>
            {useRecoveryCode ? (
               <input
                  id="second-factor-code"
                  name="code"
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  maxLength={20}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  autoFocus
               />
            ) : (
               <OtpInput
                  // Remount (autoFocus box 1) after a rejected code and once setup loads.
                  key={`${attempt}-${Boolean(setup)}`}
                  id="second-factor-code"
                  value={code}
                  onChange={setCode}
                  onComplete={submitCode}
                  disabled={isSubmitting || (isSetup && !setup)}
                  invalid={Boolean(error) && !code}
                  describedBy={error ? 'second-factor-error' : undefined}
                  autoFocus
               />
            )}
            <p className="otp-input-status" aria-live="polite">
               {isSubmitting && !useRecoveryCode ? 'Verifying…' : ''}
            </p>
         </div>

         {!isSetup && (
            <div className="auth-login-options">
               <button
                  className="auth-maintenance-link"
                  type="button"
                  onClick={() => {
                     setUseRecoveryCode((current) => !current);
                     setCode('');
                     setError('');
                  }}>
                  {useRecoveryCode
                     ? 'Use my authenticator app'
                     : 'Use a Recovery Code instead'}
               </button>
            </div>
         )}

         {error && (
            <p id="second-factor-error" className="auth-error" role="alert">
               {error}
            </p>
         )}

         <div className="auth-form-actions">
            <button className="auth-back" type="button" onClick={onCancel}>
               Back
            </button>
            <button
               className="auth-submit"
               type="submit"
               disabled={
                  isSubmitting ||
                  (isSetup && !setup) ||
                  (!useRecoveryCode && code.length !== 6)
               }>
               {isSubmitting ? 'Please wait…' : 'Verify'}
            </button>
         </div>
      </form>
   );
}

export default SecondFactorStep;
