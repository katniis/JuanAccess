import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalFeedback } from '../../contexts/usePortalFeedback.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import {
   createStaffInvitation,
   getStaffUsers,
} from '../../services/staffAdmin.js';

const expiryLabel = (value) =>
   new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'short',
   }).format(new Date(value));

function StaffAccess() {
   const { role } = useOutletContext();
   const { notify } = usePortalFeedback();
   const [users, setUsers] = useState(null);
   const [hasError, setHasError] = useState(false);
   const [pending, setPending] = useState(false);
   const [copying, setCopying] = useState(false);
   const [error, setError] = useState('');
   const [invitation, setInvitation] = useState(null);
   const [form, setForm] = useState({
      firstName: '',
      lastName: '',
      email: '',
      role: 'staff',
   });
   const pageRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(users));

   useEffect(() => {
      if (role !== 'staff_admin') return undefined;
      let current = true;
      getStaffUsers()
         .then((list) => {
            if (current) setUsers(list);
         })
         .catch(() => {
            if (current) setHasError(true);
         });
      return () => {
         current = false;
      };
   }, [role]);

   const submit = async (event) => {
      event.preventDefault();
      setPending(true);
      setError('');
      setInvitation(null);
      try {
         const result = await createStaffInvitation(form);
         const link = new URL('/accept-invite', window.location.origin);
         link.searchParams.set('token', result.invitation_token);
         setInvitation({ ...result.invitation, link: link.toString() });
         setForm((current) => ({
            ...current,
            firstName: '',
            lastName: '',
            email: '',
         }));
         notify({
            type: 'success',
            message:
               'Staff invitation created. Share the link before it expires.',
         });
      } catch (requestError) {
         setError(requestError.message);
         notify({ type: 'error', message: requestError.message });
      } finally {
         setPending(false);
      }
   };

   const copyLink = async () => {
      setCopying(true);
      try {
         await navigator.clipboard.writeText(invitation.link);
         notify({ type: 'success', message: 'Invitation link copied.' });
      } catch {
         setError('The link could not be copied. Select and copy it manually.');
      } finally {
         setCopying(false);
      }
   };

   if (role !== 'staff_admin')
      return (
         <section className="staff-access-denied">
            <h1>Staff Access</h1>
            <p>
               Only staff admins can view staff accounts or create invitations.
               Ask an administrator if you need access.
            </p>
         </section>
      );
   if (hasError)
      return (
         <ErrorState
            title="Staff access couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!users)
      return <LoadingSkeleton variant="queue" label="staff access settings" />;

   return (
      <div className="staff-access-page" ref={pageRef}>
         <header className="staff-schedule-heading">
            <h1>Staff Access</h1>
            <p>Manage active staff accounts and create invitation links.</p>
         </header>
         <section className="staff-card staff-access-invite">
            <header className="staff-card-heading">
               <div>
                  <h2>Invite a staff member</h2>
                  <p>
                     Links expire 48 hours after they are created. Email
                     delivery is not configured.
                  </p>
               </div>
            </header>
            <form className="staff-invite-form" onSubmit={submit}>
               <label>
                  First name
                  <input
                     autoComplete="given-name"
                     required
                     maxLength={100}
                     value={form.firstName}
                     onChange={(event) =>
                        setForm({ ...form, firstName: event.target.value })
                     }
                  />
               </label>
               <label>
                  Last name
                  <input
                     autoComplete="family-name"
                     required
                     maxLength={100}
                     value={form.lastName}
                     onChange={(event) =>
                        setForm({ ...form, lastName: event.target.value })
                     }
                  />
               </label>
               <label>
                  Email address
                  <input
                     type="email"
                     autoComplete="email"
                     required
                     maxLength={255}
                     value={form.email}
                     onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                     }
                  />
               </label>
               <label>
                  Role
                  <select
                     value={form.role}
                     onChange={(event) =>
                        setForm({ ...form, role: event.target.value })
                     }>
                     <option value="staff">Staff</option>
                     <option value="staff_admin">Staff admin</option>
                  </select>
               </label>
               <button
                  className="button button-primary"
                  type="submit"
                  disabled={pending}>
                  {pending ? 'Creating invitation…' : 'Create invitation'}
               </button>
            </form>
            {error && (
               <p className="prior-auth-inline-error" role="alert">
                  {error}
               </p>
            )}
            {invitation && (
               <section className="staff-invite-result" aria-live="polite">
                  <div>
                     <strong>Invitation ready for {invitation.email}</strong>
                     <span>Expires {expiryLabel(invitation.expiresAt)}</span>
                  </div>
                  <label>
                     Copyable invitation link
                     <input
                        readOnly
                        value={invitation.link}
                        onFocus={(event) => event.target.select()}
                     />
                  </label>
                  <button
                     className="button button-outline"
                     type="button"
                     disabled={copying}
                     onClick={() => void copyLink()}>
                     {copying ? 'Copying…' : 'Copy link'}
                  </button>
                  <p>
                     Anyone with this link can accept this invitation once
                     before it expires.
                  </p>
               </section>
            )}
         </section>
         <section className="staff-card staff-access-users">
            <header className="staff-card-heading">
               <div>
                  <h2>Staff accounts</h2>
                  <p>
                     {users.length} registered staff account
                     {users.length === 1 ? '' : 's'}
                  </p>
               </div>
            </header>
            {users.length ? (
               <div className="staff-table-scroll">
                  <table className="staff-data-table">
                     <thead>
                        <tr>
                           <th>Name</th>
                           <th>Email</th>
                           <th>Role</th>
                           <th>Account</th>
                        </tr>
                     </thead>
                     <tbody>
                        {users.map((account) => (
                           <tr key={account.id}>
                              <td>{account.displayName || 'Staff member'}</td>
                              <td>{account.email}</td>
                              <td>
                                 {account.role === 'staff_admin'
                                    ? 'Staff admin'
                                    : 'Staff'}
                              </td>
                              <td>
                                 {account.isActive ? 'Active' : 'Inactive'}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <p className="staff-record-empty">
                  No staff accounts were returned.
               </p>
            )}
         </section>
         <p className="staff-access-note">
            The API does not list or revoke pending invitations. Newly created
            invitation details are shown here once, so copy the link before
            leaving this page.
         </p>
      </div>
   );
}

export default StaffAccess;
