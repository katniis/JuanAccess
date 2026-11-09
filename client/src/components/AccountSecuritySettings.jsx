import { useState } from 'react';
import { useAuth } from '../contexts/useAuth.js';
import {
   changePassword,
   requestEmailChange,
   saveAccountSettings,
} from '../services/auth.js';
import {
   EMAIL_FEATURES_ENABLED,
   EMAIL_UNAVAILABLE_MESSAGE,
} from '../utils/emailFeatures.js';

function AccountSecuritySettings({ settings, onSettingsChange }) {
   const { refreshUser } = useAuth();
   const [newEmail, setNewEmail] = useState('');
   const [emailPassword, setEmailPassword] = useState('');
   const [currentPassword, setCurrentPassword] = useState('');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [pending, setPending] = useState('');
   const [message, setMessage] = useState('');
   const [error, setError] = useState('');

   const submitEmail = async (event) => {
      event.preventDefault();
      setPending('email');
      setMessage('');
      setError('');
      try {
         const result = await requestEmailChange({
            newEmail,
            password: emailPassword,
         });
         setMessage(result.message);
         setNewEmail('');
         setEmailPassword('');
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setPending('');
      }
   };

   const submitPassword = async (event) => {
      event.preventDefault();
      setMessage('');
      setError('');
      if (password !== confirmPassword) {
         setError('The new passwords do not match.');
         return;
      }
      setPending('password');
      try {
         const result = await changePassword({
            currentPassword,
            newPassword: password,
         });
         setMessage(result.message);
         setCurrentPassword('');
         setPassword('');
         setConfirmPassword('');
         await refreshUser();
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setPending('');
      }
   };

   const toggleEmailNotices = async (event) => {
      const emailNotificationsEnabled = event.target.checked;
      setError('');
      setMessage('');
      setPending('preference');
      try {
         const result = await saveAccountSettings({
            emailNotificationsEnabled,
         });
         onSettingsChange(result.settings);
         setMessage(
            emailNotificationsEnabled
               ? 'Email notifications are on.'
               : 'Email notifications are off. In-app notices will continue.',
         );
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setPending('');
      }
   };

   return (
      <>
         <section className="staff-card account-settings-card">
            <header className="staff-card-heading">
               <div>
                  <h2>Email notifications</h2>
                  <p id="email-notifications-disabled">
                     {EMAIL_FEATURES_ENABLED
                        ? 'In-app notices stay on when email is turned off.'
                        : `${EMAIL_UNAVAILABLE_MESSAGE} In-app notices continue to work.`}
                  </p>
               </div>
            </header>
            <label className="settings-checkbox">
               <input
                  type="checkbox"
                  checked={settings.emailNotificationsEnabled}
                  disabled={!EMAIL_FEATURES_ENABLED || Boolean(pending)}
                  aria-describedby={
                     !EMAIL_FEATURES_ENABLED
                        ? 'email-notifications-disabled'
                        : undefined
                  }
                  onChange={toggleEmailNotices}
               />
               <span>Send account notifications by email</span>
            </label>
         </section>

         <section className="staff-card account-settings-card">
            <header className="staff-card-heading">
               <div>
                  <h2>Login email</h2>
                  <p>Current address: {settings.email}</p>
               </div>
            </header>
            {EMAIL_FEATURES_ENABLED ? (
               <form className="account-settings-form" onSubmit={submitEmail}>
                  <label className="auth-field">
                     New email address
                     <input
                        type="email"
                        autoComplete="email"
                        maxLength={255}
                        value={newEmail}
                        required
                        onChange={(event) => setNewEmail(event.target.value)}
                     />
                  </label>
                  <label className="auth-field">
                     Current password
                     <input
                        type="password"
                        autoComplete="current-password"
                        value={emailPassword}
                        required
                        onChange={(event) =>
                           setEmailPassword(event.target.value)
                        }
                     />
                  </label>
                  <button
                     className="button button-outline"
                     type="submit"
                     disabled={Boolean(pending)}>
                     {pending === 'email'
                        ? 'Sending confirmation…'
                        : 'Send confirmation'}
                  </button>
               </form>
            ) : (
               <p className="email-maintenance-note" role="note">
                  {EMAIL_UNAVAILABLE_MESSAGE} Login email changes remain
                  disabled.
               </p>
            )}
         </section>

         <section className="staff-card account-settings-card">
            <header className="staff-card-heading">
               <div>
                  <h2>Password</h2>
                  <p>Changing your password signs out other sessions.</p>
               </div>
            </header>
            <form className="account-settings-form" onSubmit={submitPassword}>
               <label className="auth-field">
                  Current password
                  <input
                     type="password"
                     autoComplete="current-password"
                     value={currentPassword}
                     required
                     onChange={(event) =>
                        setCurrentPassword(event.target.value)
                     }
                  />
               </label>
               <div className="auth-name-fields">
                  <label className="auth-field">
                     New password
                     <input
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        required
                        onChange={(event) => setPassword(event.target.value)}
                     />
                  </label>
                  <label className="auth-field">
                     Confirm new password
                     <input
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={confirmPassword}
                        required
                        onChange={(event) =>
                           setConfirmPassword(event.target.value)
                        }
                     />
                  </label>
               </div>
               <button
                  className="button button-primary"
                  type="submit"
                  disabled={Boolean(pending)}>
                  {pending === 'password'
                     ? 'Updating password…'
                     : 'Change password'}
               </button>
            </form>
         </section>

         {(message || error) && (
            <p
               className={error ? 'auth-error' : 'account-settings-message'}
               role={error ? 'alert' : 'status'}>
               {error || message}
            </p>
         )}
      </>
   );
}

export default AccountSecuritySettings;
