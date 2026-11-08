import { useEffect, useRef, useState } from 'react';
import {
   Link,
   NavLink,
   Outlet,
   useLocation,
   useNavigate,
} from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PortalFeedbackProvider } from '../contexts/PortalFeedbackContext.jsx';
import { formatClinicDateTime } from '../services/patientDates.js';
import { getPatientNotifications } from '../services/patientNotifications.js';

const navigation = [
   { label: 'Dashboard', path: '/patient', icon: 'grid', end: true },
   { label: 'Book Appointment', path: '/patient/book', icon: 'calendar' },
   { label: 'My Waitlist', path: '/patient/waitlist', icon: 'clock' },
   { label: 'My Appointments', path: '/patient/appointments', icon: 'folder' },
   { label: 'Upload a Bill', path: '/patient/bills', icon: 'upload' },
];

function PatientLayout() {
   const { pathname } = useLocation();
   const navigate = useNavigate();
   const { user, signOut } = useAuth();
   const [accountMenuOpen, setAccountMenuOpen] = useState(false);
   const [notificationsOpen, setNotificationsOpen] = useState(false);
   const [notifications, setNotifications] = useState(null);
   const [notificationsLoading, setNotificationsLoading] = useState(false);
   const [notificationsError, setNotificationsError] = useState('');
   const accountAreaRef = useRef(null);
   const accountButtonRef = useRef(null);
   const notificationsAreaRef = useRef(null);
   const notificationsButtonRef = useRef(null);
   const currentPage =
      navigation.find((item) => item.path === pathname)?.label ?? 'Dashboard';
   const displayName = user?.displayName?.trim() || 'Patient';
   const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

   const handleSignOut = async () => {
      await signOut();
      navigate('/login', { replace: true });
   };

   useEffect(() => {
      setAccountMenuOpen(false);
   }, [pathname]);

   const loadNotifications = async () => {
      setNotificationsLoading(true);
      setNotificationsError('');
      try {
         const { notifications: nextNotifications } =
            await getPatientNotifications();
         setNotifications(
            Array.isArray(nextNotifications) ? nextNotifications : [],
         );
      } catch (error) {
         setNotificationsError(
            error.message || 'Notifications could not be loaded.',
         );
      } finally {
         setNotificationsLoading(false);
      }
   };

   const toggleNotifications = () => {
      const shouldOpen = !notificationsOpen;
      setNotificationsOpen(shouldOpen);
      if (shouldOpen) void loadNotifications();
   };

   useEffect(() => {
      if (!accountMenuOpen) return undefined;

      const closeOnOutsideClick = (event) => {
         if (!accountAreaRef.current?.contains(event.target))
            setAccountMenuOpen(false);
      };
      const closeOnEscape = (event) => {
         if (event.key === 'Escape') {
            setAccountMenuOpen(false);
            accountButtonRef.current?.focus();
         }
      };

      document.addEventListener('pointerdown', closeOnOutsideClick);
      document.addEventListener('keydown', closeOnEscape);
      return () => {
         document.removeEventListener('pointerdown', closeOnOutsideClick);
         document.removeEventListener('keydown', closeOnEscape);
      };
   }, [accountMenuOpen]);

   useEffect(() => {
      if (!notificationsOpen) return undefined;

      const closeOnOutsideClick = (event) => {
         if (!notificationsAreaRef.current?.contains(event.target))
            setNotificationsOpen(false);
      };
      const closeOnEscape = (event) => {
         if (event.key === 'Escape') {
            setNotificationsOpen(false);
            notificationsButtonRef.current?.focus();
         }
      };

      document.addEventListener('pointerdown', closeOnOutsideClick);
      document.addEventListener('keydown', closeOnEscape);
      return () => {
         document.removeEventListener('pointerdown', closeOnOutsideClick);
         document.removeEventListener('keydown', closeOnEscape);
      };
   }, [notificationsOpen]);

   return (
      <PortalFeedbackProvider>
         <div className="patient-app">
            <aside className="sidebar">
               <Link
                  className="brand"
                  to="/patient"
                  aria-label="JuanAccess Patient Portal home">
                  <img
                     className="brand-logo"
                     src="/juanaccess-logo.svg"
                     alt=""
                  />
                  <span className="brand-subtitle">Patient Portal</span>
               </Link>
               <nav className="sidebar-nav" aria-label="Patient navigation">
                  {navigation.map((item) => (
                     <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                           'nav-link' + (isActive ? ' active' : '')
                        }>
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                     </NavLink>
                  ))}
               </nav>
               <div className="sidebar-account" ref={accountAreaRef}>
                  <div
                     className="account-menu"
                     id="patient-account-menu"
                     role="group"
                     aria-label="Patient account options"
                     hidden={!accountMenuOpen}>
                     <Link to="/patient/settings">Settings</Link>
                     <button
                        className="account-menu-signout"
                        type="button"
                        onClick={() => void handleSignOut()}>
                        Sign out
                     </button>
                  </div>
                  <button
                     className="account-button"
                     type="button"
                     ref={accountButtonRef}
                     aria-label={displayName + ', patient account'}
                     aria-expanded={accountMenuOpen}
                     aria-controls="patient-account-menu"
                     onClick={() => setAccountMenuOpen((open) => !open)}>
                     <span className="avatar">{initials}</span>
                     <span className="account-copy">
                        <strong>{displayName}</strong>
                        <span>Patient</span>
                     </span>
                     <Icon name="chevron-down" />
                  </button>
                  <button
                     className="signout-link"
                     type="button"
                     onClick={() => void handleSignOut()}>
                     <Icon name="signout" />
                     Sign out
                  </button>
               </div>
            </aside>

            <div className="main-column">
               <header className="topbar">
                  <span className="topbar-title">{currentPage}</span>
                  <div
                     className="notification-control"
                     ref={notificationsAreaRef}>
                     <button
                        className="notification-button"
                        type="button"
                        ref={notificationsButtonRef}
                        aria-label="Notifications"
                        aria-expanded={notificationsOpen}
                        aria-controls="patient-notifications"
                        onClick={toggleNotifications}>
                        <Icon name="bell" />
                     </button>
                     <section
                        className="notification-popover"
                        id="patient-notifications"
                        aria-label="Patient notifications"
                        aria-busy={notificationsLoading}
                        hidden={!notificationsOpen}>
                        <h2>Notifications</h2>
                        {notificationsLoading ? (
                           <p role="status">Loading notifications…</p>
                        ) : notificationsError ? (
                           <p role="alert">
                              {notificationsError} Close and reopen this panel
                              to try again.
                           </p>
                        ) : notifications?.length ? (
                           <ul className="notification-list">
                              {notifications
                                 .slice()
                                 .reverse()
                                 .map((notification) => (
                                    <li
                                       className={
                                          'notification-item' +
                                          (notification.isRead ? '' : ' unread')
                                       }
                                       key={notification.id}>
                                       <p>{notification.message}</p>
                                       <span>
                                          {notification.type.replaceAll(
                                             '_',
                                             ' ',
                                          )}
                                       </span>
                                       <time dateTime={notification.createdAt}>
                                          {formatClinicDateTime(
                                             notification.createdAt,
                                          )}
                                       </time>
                                    </li>
                                 ))}
                           </ul>
                        ) : (
                           <p>No notifications yet.</p>
                        )}
                     </section>
                  </div>
               </header>
               <main className="main-content">
                  <Outlet context={{ user }} />
               </main>
            </div>
         </div>
      </PortalFeedbackProvider>
   );
}

export default PatientLayout;
