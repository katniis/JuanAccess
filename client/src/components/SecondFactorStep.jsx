import { useEffect, useState } from 'react';
import {
   confirmSecondFactorSetup,
   startSecondFactorSetup,
   verifySecondFactor,
} from '../services/auth.js';

// mode: 'required' (enter a code) or 'setup_required' (scan QR, confirm, save Recovery Codes).
function SecondFactorStep({ mode, onComplete, onCancel }) {
   const isSetup = mode === 'setup_required';
   const [setup, setSetup] = useState(null);
   const [code, setCode] = useState('');
   const [useRecoveryCode, setUseRecoveryCode] = useState(false);
   const [recoveryCodes, setRecoveryCodes] = useState(null);
   const [completedUser, setCompletedUser] = useState(null);
   const [error, setError] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);

   useEffect(() => {
      if (!isSetup) return undefined;
      let current = true;
      startSecondFactorSetup()
         .then((result) => current && setSetup(result))
         .catch((setupError) => current && setError(setupError.message));
      return () => {
         current = false;
      };
   }, [isSetup]);

   const submit = async (event) => {
      event.preventDefault();
      setError('');
      setIsSubmitting(true);
      try {
         if (isSetup) {
            const result = await confirmSecondFactorSetup(code.trim());
            setCompletedUser(result.user);
            setRecoveryCodes(result.recoveryCodes);
         } else {
            const result = await verifySecondFactor(
               useRecoveryCode
                  ? { recoveryCode: code.trim() }
                  : { code: code.trim() },
            );
            await onComplete(result.user);
         }
      } catch (submitError) {
         setError(submitError.message || 'That code did not work.');
      } finally {
         setIsSubmitting(false);
      }
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
            <input
               id="second-factor-code"
               name="code"
               type="text"
               inputMode={useRecoveryCode ? 'text' : 'numeric'}
               autoComplete="one-time-code"
               pattern={useRecoveryCode ? undefined : '[0-9]{6}'}
               maxLength={useRecoveryCode ? 20 : 6}
               value={code}
               onChange={(event) => setCode(event.target.value)}
               required
               autoFocus
            />
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
               disabled={isSubmitting || (isSetup && !setup)}>
               {isSubmitting ? 'Please wait…' : 'Verify'}
            </button>
         </div>
      </form>
   );
}

export default SecondFactorStep;
