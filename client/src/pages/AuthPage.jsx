import { useState } from 'react';
import {
   Link,
   useLocation,
   useNavigate,
   useSearchParams,
} from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getHomePathForRole } from '../utils/authRoutes.js';

function PasswordField({ id, label, value, onChange, autoComplete }) {
   const [visible, setVisible] = useState(false);

   return (
      <div className="auth-field">
         <label htmlFor={id}>{label}</label>
         <div className="auth-password-input">
            <input
               id={id}
               type={visible ? 'text' : 'password'}
               value={value}
               onChange={onChange}
               autoComplete={autoComplete}
               minLength={autoComplete === 'current-password' ? undefined : 8}
               required
            />
            <button
               className="auth-password-toggle"
               type="button"
               aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
               aria-pressed={visible}
               onClick={() => setVisible((current) => !current)}>
               {visible ? 'Hide' : 'Show'}
            </button>
         </div>
      </div>
   );
}

function AuthPage({ mode = 'signin' }) {
   const navigate = useNavigate();
   const location = useLocation();
   const [searchParams] = useSearchParams();
   const { signIn, registerPatient, acceptStaffInvitation } = useAuth();
   const [email, setEmail] = useState('');
   const [firstName, setFirstName] = useState('');
   const [lastName, setLastName] = useState('');
   const [dateOfBirth, setDateOfBirth] = useState('');
   const [signupStep, setSignupStep] = useState(1);
   const [registration, setRegistration] = useState({
      gender: '',
      contact_phone: '',
      address: '',
      insurer_name: '',
      plan_name: '',
      policy_number: '',
      member_id: '',
      coverage_start: '',
      coverage_end: '',
   });
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [error, setError] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const invitationToken = searchParams.get('token') || '';
   const isSignup = mode === 'signup';
   const isInvitation = mode === 'invite';
   const hasInsuranceDetails = [
      registration.insurer_name,
      registration.plan_name,
      registration.policy_number,
      registration.member_id,
      registration.coverage_start,
      registration.coverage_end,
   ].some(Boolean);
   const updateRegistration = (field) => (event) => {
      setRegistration((current) => ({
         ...current,
         [field]: event.target.value,
      }));
   };

   const submit = async (event) => {
      event.preventDefault();
      setError('');

      if (isSignup || isInvitation) {
         if (password !== confirmPassword) {
            setError('The passwords do not match.');
            return;
         }
      }

      if (isSignup && signupStep < 3) {
         setSignupStep((step) => step + 1);
         return;
      }

      if (
         isSignup &&
         hasInsuranceDetails &&
         (!registration.insurer_name.trim() ||
            !registration.plan_name.trim() ||
            !registration.policy_number.trim())
      ) {
         setError(
            'Enter the insurance company, plan name, and policy number together, or clear the insurance details.',
         );
         return;
      }

      if (
         isSignup &&
         registration.coverage_start &&
         registration.coverage_end &&
         registration.coverage_start > registration.coverage_end
      ) {
         setError('The coverage end date must be on or after the start date.');
         return;
      }

      if (isInvitation && !invitationToken) {
         setError(
            'This staff invitation link is missing its token. Ask your administrator for a new link.',
         );
         return;
      }

      setIsSubmitting(true);
      try {
         let user;
         if (isSignup) {
            const optionalDetails = Object.fromEntries(
               Object.entries(registration).filter(([, value]) => value.trim()),
            );
            user = await registerPatient({
               email,
               password,
               first_name: firstName,
               last_name: lastName,
               date_of_birth: dateOfBirth,
               ...optionalDetails,
            });
         } else if (isInvitation) {
            user = await acceptStaffInvitation({
               token: invitationToken,
               password,
            });
         } else {
            user = await signIn({ email, password });
         }

         const homePath = getHomePathForRole(user.role);
         const requestedPath = location.state?.from?.pathname;
         const canReturnToRequestedPage =
            user.role === 'patient'
               ? requestedPath?.startsWith('/patient')
               : requestedPath?.startsWith('/staff');
         navigate(canReturnToRequestedPage ? requestedPath : homePath, {
            replace: true,
         });
      } catch (submitError) {
         setError(
            submitError.message ||
               'We could not sign you in. Please try again.',
         );
      } finally {
         setIsSubmitting(false);
      }
   };

   const title = isSignup
      ? ['Create your account', 'Your details', 'Insurance coverage'][
           signupStep - 1
        ]
      : isInvitation
        ? 'Set up your staff account'
        : 'Welcome back';
   const subtitle = isSignup
      ? [
           'Set up your patient account.',
           'Add a few optional details to your profile.',
           'Add insurance now or leave it for later.',
        ][signupStep - 1]
      : isInvitation
        ? 'Choose a password to accept your staff invitation.'
        : 'Sign in to continue to JuanAccess.';

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
            <section className="auth-card" aria-labelledby="auth-title">
               <header className="auth-heading">
                  <h1 id="auth-title">{title}</h1>
                  <p>{subtitle}</p>
               </header>

               {isSignup && (
                  <ol
                     className="auth-progress"
                     aria-label="Patient registration progress">
                     {['Account', 'Details', 'Insurance'].map(
                        (label, index) => (
                           <li
                              className={
                                 signupStep > index + 1
                                    ? 'complete'
                                    : signupStep === index + 1
                                      ? 'current'
                                      : ''
                              }
                              aria-current={
                                 signupStep === index + 1 ? 'step' : undefined
                              }
                              key={label}>
                              <span>{index + 1}</span>
                              {label}
                           </li>
                        ),
                     )}
                  </ol>
               )}

               <form
                  className="auth-form"
                  onSubmit={submit}
                  aria-busy={isSubmitting}>
                  {isSignup && signupStep === 1 && (
                     <>
                        <div className="auth-name-fields">
                           <div className="auth-field">
                              <label htmlFor="first-name">First name</label>
                              <input
                                 id="first-name"
                                 name="first_name"
                                 type="text"
                                 maxLength="100"
                                 autoComplete="given-name"
                                 value={firstName}
                                 onChange={(event) =>
                                    setFirstName(event.target.value)
                                 }
                                 required
                              />
                           </div>
                           <div className="auth-field">
                              <label htmlFor="last-name">Last name</label>
                              <input
                                 id="last-name"
                                 name="last_name"
                                 type="text"
                                 maxLength="100"
                                 autoComplete="family-name"
                                 value={lastName}
                                 onChange={(event) =>
                                    setLastName(event.target.value)
                                 }
                                 required
                              />
                           </div>
                        </div>

                        <div className="auth-name-fields">
                           <div className="auth-field">
                              <label htmlFor="date-of-birth">
                                 Date of birth
                              </label>
                              <input
                                 id="date-of-birth"
                                 name="date_of_birth"
                                 type="date"
                                 autoComplete="bday"
                                 value={dateOfBirth}
                                 onChange={(event) =>
                                    setDateOfBirth(event.target.value)
                                 }
                                 required
                              />
                           </div>
                           <div className="auth-field">
                              <label htmlFor="email">Email address</label>
                              <input
                                 id="email"
                                 name="email"
                                 type="email"
                                 maxLength="255"
                                 autoComplete="email"
                                 placeholder="you@example.com"
                                 value={email}
                                 onChange={(event) =>
                                    setEmail(event.target.value)
                                 }
                                 required
                              />
                           </div>
                        </div>
                        <div className="auth-name-fields">
                           <PasswordField
                              id="password"
                              label="Password"
                              value={password}
                              onChange={(event) =>
                                 setPassword(event.target.value)
                              }
                              autoComplete="new-password"
                           />
                           <PasswordField
                              id="confirm-password"
                              label="Confirm password"
                              value={confirmPassword}
                              onChange={(event) =>
                                 setConfirmPassword(event.target.value)
                              }
                              autoComplete="new-password"
                           />
                        </div>
                     </>
                  )}

                  {isSignup && signupStep === 2 && (
                     <>
                        <div className="auth-name-fields">
                           <div className="auth-field">
                              <label htmlFor="gender">
                                 Gender{' '}
                                 <span className="auth-optional-label">
                                    Optional
                                 </span>
                              </label>
                              <select
                                 id="gender"
                                 name="gender"
                                 autoComplete="sex"
                                 value={registration.gender}
                                 onChange={updateRegistration('gender')}>
                                 <option value="">Select</option>
                                 <option value="female">Female</option>
                                 <option value="male">Male</option>
                                 <option value="nonbinary">Non-binary</option>
                                 <option value="other">Other</option>
                                 <option value="prefer_not_to_say">
                                    Prefer not to say
                                 </option>
                              </select>
                           </div>
                           <div className="auth-field">
                              <label htmlFor="contact-phone">
                                 Phone number{' '}
                                 <span className="auth-optional-label">
                                    Optional
                                 </span>
                              </label>
                              <input
                                 id="contact-phone"
                                 name="contact_phone"
                                 type="tel"
                                 maxLength="30"
                                 autoComplete="tel"
                                 value={registration.contact_phone}
                                 onChange={updateRegistration('contact_phone')}
                              />
                           </div>
                        </div>
                        <div className="auth-field">
                           <label htmlFor="address">
                              Address{' '}
                              <span className="auth-optional-label">
                                 Optional
                              </span>
                           </label>
                           <textarea
                              id="address"
                              name="address"
                              autoComplete="street-address"
                              value={registration.address}
                              onChange={updateRegistration('address')}
                           />
                        </div>
                     </>
                  )}

                  {isSignup && signupStep === 3 && (
                     <>
                        <p className="auth-step-note">
                           Insurance is optional. You can leave these fields
                           blank and add coverage later.
                        </p>
                        <div className="auth-insurance-fields">
                           <div className="auth-name-fields">
                              <div className="auth-field">
                                 <label htmlFor="insurer-name">
                                    Insurance company
                                 </label>
                                 <input
                                    id="insurer-name"
                                    name="insurer_name"
                                    type="text"
                                    maxLength="150"
                                    value={registration.insurer_name}
                                    onChange={updateRegistration(
                                       'insurer_name',
                                    )}
                                 />
                              </div>
                              <div className="auth-field">
                                 <label htmlFor="plan-name">Plan name</label>
                                 <input
                                    id="plan-name"
                                    name="plan_name"
                                    type="text"
                                    maxLength="150"
                                    value={registration.plan_name}
                                    onChange={updateRegistration('plan_name')}
                                 />
                              </div>
                           </div>
                           <div className="auth-name-fields">
                              <div className="auth-field">
                                 <label htmlFor="policy-number">
                                    Policy number
                                 </label>
                                 <input
                                    id="policy-number"
                                    name="policy_number"
                                    type="text"
                                    maxLength="100"
                                    value={registration.policy_number}
                                    onChange={updateRegistration(
                                       'policy_number',
                                    )}
                                 />
                              </div>
                              <div className="auth-field">
                                 <label htmlFor="member-id">
                                    Member ID{' '}
                                    <span className="auth-optional-label">
                                       Optional
                                    </span>
                                 </label>
                                 <input
                                    id="member-id"
                                    name="member_id"
                                    type="text"
                                    maxLength="100"
                                    value={registration.member_id}
                                    onChange={updateRegistration('member_id')}
                                 />
                              </div>
                           </div>
                           <div className="auth-name-fields">
                              <div className="auth-field">
                                 <label htmlFor="coverage-start">
                                    Coverage starts{' '}
                                    <span className="auth-optional-label">
                                       Optional
                                    </span>
                                 </label>
                                 <input
                                    id="coverage-start"
                                    name="coverage_start"
                                    type="date"
                                    max={registration.coverage_end || undefined}
                                    value={registration.coverage_start}
                                    onChange={updateRegistration(
                                       'coverage_start',
                                    )}
                                 />
                              </div>
                              <div className="auth-field">
                                 <label htmlFor="coverage-end">
                                    Coverage ends{' '}
                                    <span className="auth-optional-label">
                                       Optional
                                    </span>
                                 </label>
                                 <input
                                    id="coverage-end"
                                    name="coverage_end"
                                    type="date"
                                    min={
                                       registration.coverage_start || undefined
                                    }
                                    value={registration.coverage_end}
                                    onChange={updateRegistration(
                                       'coverage_end',
                                    )}
                                 />
                              </div>
                           </div>
                        </div>
                     </>
                  )}

                  {!isSignup && !isInvitation && (
                     <div className="auth-field">
                        <label htmlFor="email">Email address</label>
                        <input
                           id="email"
                           name="email"
                           type="email"
                           maxLength="255"
                           autoComplete="email"
                           placeholder="you@example.com"
                           value={email}
                           onChange={(event) => setEmail(event.target.value)}
                           required
                        />
                     </div>
                  )}

                  {!isSignup && (
                     <PasswordField
                        id="password"
                        label={isInvitation ? 'Create password' : 'Password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={
                           isInvitation ? 'new-password' : 'current-password'
                        }
                     />
                  )}

                  {isInvitation && (
                     <PasswordField
                        id="confirm-password"
                        label="Confirm password"
                        value={confirmPassword}
                        onChange={(event) =>
                           setConfirmPassword(event.target.value)
                        }
                        autoComplete="new-password"
                     />
                  )}

                  {error && (
                     <p className="auth-error" role="alert">
                        {error}
                     </p>
                  )}

                  <div className="auth-form-actions">
                     {isSignup && signupStep > 1 && (
                        <button
                           className="auth-back"
                           type="button"
                           onClick={() => {
                              setError('');
                              setSignupStep((step) => step - 1);
                           }}>
                           Back
                        </button>
                     )}
                     <button
                        className="auth-submit"
                        type="submit"
                        disabled={isSubmitting}>
                        {isSubmitting
                           ? 'Please wait…'
                           : isSignup
                             ? signupStep < 3
                                ? 'Continue'
                                : 'Create account'
                             : isInvitation
                               ? 'Accept invitation'
                               : 'Sign in'}
                     </button>
                  </div>
               </form>

               <p className="auth-switch">
                  {isSignup ? (
                     <>
                        Already have an account?{' '}
                        <Link to="/login">Sign in</Link>
                     </>
                  ) : isInvitation ? (
                     <>
                        Need help? <Link to="/login">Return to sign in</Link>
                     </>
                  ) : (
                     <>
                        New patient? <Link to="/signup">Create an account</Link>
                     </>
                  )}
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

export default AuthPage;
