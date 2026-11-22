import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { acceptPrivacyPolicy, getCurrentUser } from '../services/auth.js';

// Blocks the patient portal until the patient accepts the current Privacy Policy version.
function PrivacyConsentPrompt({ onSignOut }) {
   const dialogRef = useRef(null);
   const [required, setRequired] = useState(false);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState('');

   useEffect(() => {
      let current = true;
      getCurrentUser()
         .then(({ consent }) => {
            if (current && consent?.required) setRequired(true);
         })
         .catch(() => {});
      return () => {
         current = false;
      };
   }, []);

   useEffect(() => {
      if (required) dialogRef.current?.showModal();
   }, [required]);

   const accept = async () => {
      setSaving(true);
      setError('');
      try {
         await acceptPrivacyPolicy();
         dialogRef.current?.close();
         setRequired(false);
      } catch (acceptError) {
         setError(acceptError.message);
      } finally {
         setSaving(false);
      }
   };

   if (!required) return null;

   return (
      <dialog
         ref={dialogRef}
         className="auth-email-unavailable-dialog"
         aria-labelledby="privacy-consent-title"
         aria-describedby="privacy-consent-description"
         onCancel={(event) => event.preventDefault()}>
         <div className="auth-email-unavailable-dialog-content">
            <h2 id="privacy-consent-title">Please review our Privacy Policy</h2>
            <p id="privacy-consent-description">
               Our Privacy Policy explains how the clinic collects, stores, and
               uses your information, including AI drafting with Google Gemini.
               Please read it and accept it to keep using JuanAccess.
            </p>
            <Link to="/privacy" target="_blank">
               Read the Privacy Policy
            </Link>
            {error && (
               <p className="auth-error" role="alert">
                  {error}
               </p>
            )}
            <button
               className="button button-primary"
               type="button"
               disabled={saving}
               onClick={accept}>
               {saving ? 'Saving…' : 'I accept'}
            </button>
            <button className="button" type="button" onClick={onSignOut}>
               Sign out
            </button>
         </div>
      </dialog>
   );
}

export default PrivacyConsentPrompt;
