import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountSecuritySettings from '../../components/AccountSecuritySettings.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import InsuranceVerificationQueue from '../../components/InsuranceVerificationQueue.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import StaffAccess from './StaffAccess.jsx';
import { useAuth } from '../../contexts/useAuth.js';
import {
   getAccountSettings,
   saveAccountSettings,
} from '../../services/auth.js';

function StaffSettings() {
   const { role } = useOutletContext();
   const { refreshUser } = useAuth();
   const [settings, setSettings] = useState(null);
   const [displayName, setDisplayName] = useState('');
   const [pending, setPending] = useState(false);
   const [message, setMessage] = useState('');
   const [error, setError] = useState('');

   useEffect(() => {
      let active = true;
      getAccountSettings()
         .then(({ settings: account }) => {
            if (!active) return;
            setSettings(account);
            setDisplayName(account.displayName);
         })
         .catch((loadError) => {
            if (active) setError(loadError.message);
         });
      return () => {
         active = false;
      };
   }, []);

   const saveProfile = async (event) => {
      event.preventDefault();
      setPending(true);
      setMessage('');
      setError('');
      try {
         const { settings: updated } = await saveAccountSettings({
            displayName,
         });
         setSettings(updated);
         setDisplayName(updated.displayName);
         await refreshUser();
         setMessage('Profile details saved.');
      } catch (saveError) {
         setError(saveError.message);
      } finally {
         setPending(false);
      }
   };

   if (error && !settings) {
      return <ErrorState title="Settings couldn’t load" message={error} />;
   }
   if (!settings)
      return <LoadingSkeleton variant="queue" label="staff settings" />;

   return (
      <div className="account-settings-page">
         <header className="staff-schedule-heading">
            <h1>Settings</h1>
            <p>Manage your staff profile and account security.</p>
         </header>
         <section className="staff-card account-settings-card">
            <header className="staff-card-heading">
               <div>
                  <h2>Profile</h2>
                  <p>These details are visible to staff in the portal.</p>
               </div>
            </header>
            <form className="account-settings-form" onSubmit={saveProfile}>
               <label className="auth-field">
                  Display name
                  <input
                     autoComplete="name"
                     maxLength={150}
                     value={displayName}
                     required
                     onChange={(event) => setDisplayName(event.target.value)}
                  />
               </label>
               <button
                  className="button button-primary"
                  type="submit"
                  disabled={pending}>
                  {pending ? 'Saving profile…' : 'Save profile'}
               </button>
            </form>
         </section>
         <AccountSecuritySettings
            settings={settings}
            onSettingsChange={setSettings}
         />
         {message && (
            <p className="account-settings-message" role="status">
               {message}
            </p>
         )}
         {error && (
            <p className="auth-error" role="alert">
               {error}
            </p>
         )}
         {role === 'staff_admin' && (
            <>
               <InsuranceVerificationQueue />
               <StaffAccess />
            </>
         )}
      </div>
   );
}

export default StaffSettings;
