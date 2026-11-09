import { useEffect, useRef, useState } from 'react';
import AccountSecuritySettings from '../../components/AccountSecuritySettings.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { useAuth } from '../../contexts/useAuth.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   addMyCoverage,
   getMyCoverage,
   updateMyCoverage,
} from '../../services/patientSettings.js';
import {
   getAccountSettings,
   saveAccountSettings,
} from '../../services/auth.js';

const emptyCoverage = {
   insurer_name: '',
   plan_name: '',
   policy_number: '',
   member_id: '',
   coverage_start: '',
   coverage_end: '',
};

function PatientSettings() {
   const { refreshUser } = useAuth();
   const [settings, setSettings] = useState(null);
   const [coverages, setCoverages] = useState(null);
   const [profile, setProfile] = useState(null);
   const [coverageForm, setCoverageForm] = useState(emptyCoverage);
   const [editingCoverage, setEditingCoverage] = useState(null);
   const [pending, setPending] = useState('');
   const [error, setError] = useState('');
   const [message, setMessage] = useState('');
   const pageRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(settings && coverages));

   const refreshCoverages = async () => setCoverages(await getMyCoverage());

   useEffect(() => {
      let active = true;
      Promise.all([getAccountSettings(), getMyCoverage()])
         .then(([account, nextCoverages]) => {
            if (!active) return;
            setSettings(account.settings);
            setProfile(account.settings.profile);
            setCoverages(nextCoverages);
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
      setPending('profile');
      setError('');
      setMessage('');
      try {
         const updates = Object.fromEntries(
            Object.entries(profile)
               .filter(([field]) => field !== 'dateOfBirth')
               .map(([field, value]) => [field, value ?? '']),
         );
         const { settings: updated } = await saveAccountSettings(updates);
         setSettings(updated);
         setProfile(updated.profile);
         await refreshUser();
         setMessage('Profile details saved.');
      } catch (saveError) {
         setError(saveError.message);
      } finally {
         setPending('');
      }
   };

   const editCoverage = (coverage) => {
      setEditingCoverage(coverage.id);
      setCoverageForm({
         insurer_name: coverage.insurerName || '',
         plan_name: coverage.planName || '',
         policy_number: coverage.policyNumber || '',
         member_id: coverage.memberId || '',
         coverage_start: coverage.coverageStart || '',
         coverage_end: coverage.coverageEnd || '',
      });
      setError('');
      setMessage('');
   };

   const saveCoverage = async (event) => {
      event.preventDefault();
      if (
         coverageForm.coverage_start &&
         coverageForm.coverage_end &&
         coverageForm.coverage_start > coverageForm.coverage_end
      ) {
         setError('The coverage end date must be on or after the start date.');
         return;
      }
      setPending('coverage');
      setError('');
      setMessage('');
      try {
         if (editingCoverage) {
            await updateMyCoverage(editingCoverage, coverageForm);
            setMessage(
               'Coverage updated. Its status is now unverified until staff review it.',
            );
         } else {
            await addMyCoverage(coverageForm);
            setMessage(
               'Coverage added. Its status is unverified until staff review it.',
            );
         }
         setEditingCoverage(null);
         setCoverageForm(emptyCoverage);
         await refreshCoverages();
      } catch (saveError) {
         setError(saveError.message);
      } finally {
         setPending('');
      }
   };

   if (error && !settings) {
      return (
         <ErrorState
            title="Settings couldn’t load"
            message={error}
            retryLabel="Reload settings"
            onRetry={() => window.location.reload()}
         />
      );
   }
   if (!settings || !coverages || !profile) {
      return <LoadingSkeleton variant="queue" label="patient settings" />;
   }

   return (
      <div className="account-settings-page" ref={pageRef}>
         <header className="staff-schedule-heading">
            <h1>Settings</h1>
            <p>Manage your profile, insurance details, and account security.</p>
         </header>

         <section className="staff-card account-settings-card">
            <header className="staff-card-heading">
               <div>
                  <h2>Profile</h2>
                  <p>Your date of birth is read-only.</p>
               </div>
            </header>
            <form className="account-settings-form" onSubmit={saveProfile}>
               <div className="auth-name-fields">
                  <label className="auth-field">
                     First name
                     <input
                        autoComplete="given-name"
                        maxLength={100}
                        value={profile.firstName || ''}
                        required
                        onChange={(event) =>
                           setProfile({
                              ...profile,
                              firstName: event.target.value,
                           })
                        }
                     />
                  </label>
                  <label className="auth-field">
                     Last name
                     <input
                        autoComplete="family-name"
                        maxLength={100}
                        value={profile.lastName || ''}
                        required
                        onChange={(event) =>
                           setProfile({
                              ...profile,
                              lastName: event.target.value,
                           })
                        }
                     />
                  </label>
               </div>
               <div className="auth-name-fields">
                  <label className="auth-field">
                     Date of birth
                     <input
                        type="date"
                        value={profile.dateOfBirth || ''}
                        readOnly
                     />
                  </label>
                  <label className="auth-field">
                     Gender
                     <select
                        value={profile.gender || ''}
                        onChange={(event) =>
                           setProfile({
                              ...profile,
                              gender: event.target.value,
                           })
                        }>
                        <option value="">Not specified</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="nonbinary">Non-binary</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">
                           Prefer not to say
                        </option>
                     </select>
                  </label>
               </div>
               <div className="auth-name-fields">
                  <label className="auth-field">
                     Phone number
                     <input
                        type="tel"
                        autoComplete="tel"
                        maxLength={30}
                        value={profile.contactPhone || ''}
                        onChange={(event) =>
                           setProfile({
                              ...profile,
                              contactPhone: event.target.value,
                           })
                        }
                     />
                  </label>
                  <label className="auth-field">
                     Address
                     <input
                        autoComplete="street-address"
                        maxLength={1000}
                        value={profile.address || ''}
                        onChange={(event) =>
                           setProfile({
                              ...profile,
                              address: event.target.value,
                           })
                        }
                     />
                  </label>
               </div>
               <button
                  className="button button-primary"
                  type="submit"
                  disabled={Boolean(pending)}>
                  {pending === 'profile' ? 'Saving profile…' : 'Save profile'}
               </button>
            </form>
         </section>

         <section className="staff-card account-settings-card">
            <header className="staff-card-heading">
               <div>
                  <h2>Insurance coverage</h2>
                  <p>
                     Corrected or new coverage returns to unverified for staff
                     review.
                  </p>
               </div>
            </header>
            <div className="account-settings-list">
               {coverages.length ? (
                  coverages.map((coverage) => (
                     <article
                        className="account-settings-list-row"
                        key={coverage.id}>
                        <div>
                           <strong>
                              {coverage.insurerName} · {coverage.planName}
                           </strong>
                           <span>
                              Policy {coverage.policyNumber} · Status:{' '}
                              {coverage.status}
                           </span>
                           {coverage.coverageStart && (
                              <span>
                                 Coverage starts {coverage.coverageStart}
                              </span>
                           )}
                        </div>
                        <button
                           className="button button-outline"
                           type="button"
                           onClick={() => editCoverage(coverage)}>
                           Edit coverage
                        </button>
                     </article>
                  ))
               ) : (
                  <p className="staff-record-empty">No coverage is on file.</p>
               )}
            </div>
            <form
               className="account-settings-form account-settings-coverage-form"
               onSubmit={saveCoverage}>
               <h3>{editingCoverage ? 'Edit coverage' : 'Add coverage'}</h3>
               <div className="auth-name-fields">
                  <label className="auth-field">
                     Insurance company
                     <input
                        maxLength={150}
                        value={coverageForm.insurer_name}
                        required
                        onChange={(event) =>
                           setCoverageForm({
                              ...coverageForm,
                              insurer_name: event.target.value,
                           })
                        }
                     />
                  </label>
                  <label className="auth-field">
                     Plan name
                     <input
                        maxLength={150}
                        value={coverageForm.plan_name}
                        required
                        onChange={(event) =>
                           setCoverageForm({
                              ...coverageForm,
                              plan_name: event.target.value,
                           })
                        }
                     />
                  </label>
               </div>
               <div className="auth-name-fields">
                  <label className="auth-field">
                     Policy number
                     <input
                        maxLength={100}
                        value={coverageForm.policy_number}
                        required
                        onChange={(event) =>
                           setCoverageForm({
                              ...coverageForm,
                              policy_number: event.target.value,
                           })
                        }
                     />
                  </label>
                  <label className="auth-field">
                     Member ID{' '}
                     <span className="auth-optional-label">Optional</span>
                     <input
                        maxLength={100}
                        value={coverageForm.member_id}
                        onChange={(event) =>
                           setCoverageForm({
                              ...coverageForm,
                              member_id: event.target.value,
                           })
                        }
                     />
                  </label>
               </div>
               <div className="auth-name-fields">
                  <label className="auth-field">
                     Coverage starts{' '}
                     <span className="auth-optional-label">Optional</span>
                     <input
                        type="date"
                        max={coverageForm.coverage_end || undefined}
                        value={coverageForm.coverage_start}
                        onChange={(event) =>
                           setCoverageForm({
                              ...coverageForm,
                              coverage_start: event.target.value,
                           })
                        }
                     />
                  </label>
                  <label className="auth-field">
                     Coverage ends{' '}
                     <span className="auth-optional-label">Optional</span>
                     <input
                        type="date"
                        min={coverageForm.coverage_start || undefined}
                        value={coverageForm.coverage_end}
                        onChange={(event) =>
                           setCoverageForm({
                              ...coverageForm,
                              coverage_end: event.target.value,
                           })
                        }
                     />
                  </label>
               </div>
               <div className="account-settings-actions">
                  <button
                     className="button button-primary"
                     type="submit"
                     disabled={Boolean(pending)}>
                     {pending === 'coverage'
                        ? 'Saving coverage…'
                        : editingCoverage
                          ? 'Save coverage'
                          : 'Add coverage'}
                  </button>
                  {editingCoverage && (
                     <button
                        className="button button-outline"
                        type="button"
                        onClick={() => {
                           setEditingCoverage(null);
                           setCoverageForm(emptyCoverage);
                        }}>
                        Cancel edit
                     </button>
                  )}
               </div>
            </form>
         </section>

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
         <AccountSecuritySettings
            settings={settings}
            onSettingsChange={setSettings}
         />
      </div>
   );
}

export default PatientSettings;
