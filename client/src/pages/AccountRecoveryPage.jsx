import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
   confirmEmailChange,
   forgotPassword,
   resetPassword,
} from '../services/auth.js';
import {
   EMAIL_FEATURES_ENABLED,
   EMAIL_UNAVAILABLE_MESSAGE,
} from '../utils/emailFeatures.js';

function AccountRecoveryPage({ mode }) {
   const [searchParams] = useSearchParams();
   const token = searchParams.get('token') || '';
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [pending, setPending] = useState(false);
   const [message, setMessage] = useState('');
   const [error, setError] = useState('');
   const isForgot = mode === 'forgot';
   const isReset = mode === 'reset';
   const isConfirm = mode === 'confirm-email';

   const submit = async (event) => {
      event.preventDefault();
      setPending(true);
      setMessage('');
      setError('');
      try {
         if (isForgot) {
            const result = await forgotPassword(email);
            setMessage(result.message);
         } else if (isReset) {
            if (!token)
               throw new Error('This reset link is missing its token.');
            if (password !== confirmPassword)
               throw new Error('The passwords do not match.');
            const result = await resetPassword({ token, password });
            setMessage(result.message);
            setPassword('');
            setConfirmPassword('');
         } else {
            if (!token)
               throw new Error('This confirmation link is missing its token.');
            const result = await confirmEmailChange(token);
            setMessage(result.message);
         }
      } catch (requestError) {
         setError(requestError.message);
      } finally {
         setPending(false);
      }
   };

   const title = isForgot
      ? 'Reset your password'
      : isReset
        ? 'Choose a new password'
        : 'Confirm your email';
   const subtitle = isForgot
      ? EMAIL_FEATURES_ENABLED
         ? 'Enter your login email and we’ll send a secure reset link if it matches an account.'
         : ''
      : isReset
        ? 'Reset links expire after 30 minutes and can only be used once.'
        : 'Confirm the new login email address for your JuanAccess account.';

   return (
      <main className="auth-page">
         <header className="auth-brand">
            <Link
               className="auth-brand-mark"
               to="/login"
               aria-label="JuanAccess sign in">
               <img src="/juanaccess-logo.svg" alt="JuanAccess" />
            </Link>
            <p>Patient and staff portal</p>
         </header>
         <div className="auth-content">
            <section className="auth-card" aria-labelledby="recovery-title">
               <header className="auth-heading">
                  <h1 id="recovery-title">{title}</h1>
                  {subtitle && <p>{subtitle}</p>}
               </header>
               {EMAIL_FEATURES_ENABLED ? (
                  <form className="auth-form" onSubmit={submit}>
                     {isForgot && (
                        <label className="auth-field">
                           Email address
                           <input
                              type="email"
                              autoComplete="email"
                              maxLength={255}
                              required
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                           />
                        </label>
                     )}
                     {isReset && (
                        <>
                           <label className="auth-field">
                              New password
                              <input
                                 type="password"
                                 autoComplete="new-password"
                                 minLength={8}
                                 required
                                 value={password}
                                 onChange={(event) =>
                                    setPassword(event.target.value)
                                 }
                              />
                           </label>
                           <label className="auth-field">
                              Confirm new password
                              <input
                                 type="password"
                                 autoComplete="new-password"
                                 minLength={8}
                                 required
                                 value={confirmPassword}
                                 onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                 }
                              />
                           </label>
                        </>
                     )}
                     {error && (
                        <p className="auth-error" role="alert">
                           {error}
                        </p>
                     )}
                     {message && (
                        <p className="account-settings-message" role="status">
                           {message}
                        </p>
                     )}
                     <button
                        className="auth-submit"
                        type="submit"
                        disabled={pending || (isConfirm && !token)}>
                        {pending
                           ? 'Please wait…'
                           : isForgot
                             ? 'Send reset link'
                             : isReset
                               ? 'Reset password'
                               : 'Confirm email'}
                     </button>
                  </form>
               ) : (
                  <p className="email-maintenance-note" role="status">
                     {EMAIL_UNAVAILABLE_MESSAGE}
                  </p>
               )}
               <p className="auth-switch">
                  <Link to="/login">Return to sign in</Link>
               </p>
            </section>
            <aside className="auth-story" aria-label="About JuanAccess">
               <p>Care and access, in one place.</p>
               <h2>Healthcare that’s easier to reach.</h2>
               <span>
                  Manage appointments, billing, and care information through
                  JuanAccess.
               </span>
            </aside>
         </div>
         <footer className="auth-footer">
            © {new Date().getFullYear()} JuanAccess
         </footer>
      </main>
   );
}

export default AccountRecoveryPage;
