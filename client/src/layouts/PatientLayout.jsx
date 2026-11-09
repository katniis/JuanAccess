import { useEffect, useRef, useState } from 'react';
import {
   Link,
   NavLink,
   Outlet,
   useLocation,
   useNavigate,
} from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../contexts/useAuth.js';
import { PortalFeedbackProvider } from '../contexts/PortalFeedbackContext.jsx';
import { formatClinicDateTime } from '../services/patientDates.js';
import {
   dismissAllPatientNotifications,
   dismissPatientNotification,
   getPatientNotifications,
} from '../services/patientNotifications.js';

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
   const [mobileNavOpen, setMobileNavOpen] = useState(false);
   const [notificationsOpen, setNotificationsOpen] = useState(false);
   const [notifications, setNotifications] = useState(null);
   const [notificationsLoading, setNotificationsLoading] = useState(false);
   const [notificationsError, setNotificationsError] = useState('');
   const [notificationActionError, setNotificationActionError] = useState('');
   const [notificationActionPending, setNotificationActionPending] =
      useState(false);
   const [exitingNotificationIds, setExitingNotificationIds] = useState([]);
   const mobileNavButtonRef = useRef(null);
   const mobileNavFirstLinkRef = useRef(null);
   const sidebarRef = useRef(null);
   const notificationsAreaRef = useRef(null);
   const notificationsButtonRef = useRef(null);
   const notificationsPopoverRef = useRef(null);
   const notificationsHeadingRef = useRef(null);
   const currentPage =
      navigation.find((item) => item.path === pathname)?.label ??
      (pathname === '/patient/settings' ? 'Settings' : 'Dashboard');
   const displayName = user?.displayName?.trim() || 'Patient';
   const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

   useEffect(() => {
      if (mobileNavOpen) mobileNavFirstLinkRef.current?.focus();
   }, [mobileNavOpen]);

   useEffect(() => {
      const closeOnDesktop = (event) => {
         if (event.matches) setMobileNavOpen(false);
      };
      const desktopViewport = window.matchMedia('(min-width: 901px)');
      desktopViewport.addEventListener('change', closeOnDesktop);
      return () =>
         desktopViewport.removeEventListener('change', closeOnDesktop);
   }, []);

   useEffect(() => {
      if (!mobileNavOpen) return undefined;

      const closeOnOutsideClick = (event) => {
         if (!sidebarRef.current?.contains(event.target))
            setMobileNavOpen(false);
      };
      const closeOnEscape = (event) => {
         if (event.key === 'Escape') {
            setMobileNavOpen(false);
            mobileNavButtonRef.current?.focus();
         }
      };

      document.addEventListener('pointerdown', closeOnOutsideClick);
      document.addEventListener('keydown', closeOnEscape);
      return () => {
         document.removeEventListener('pointerdown', closeOnOutsideClick);
         document.removeEventListener('keydown', closeOnEscape);
      };
   }, [mobileNavOpen]);

   const handleSignOut = async () => {
      await signOut();
      navigate('/login', { replace: true });
   };

   const handleDrawerKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
         sidebarRef.current?.querySelectorAll(
            'a[href], button:not([disabled])',
         ) ?? [],
      ).filter(
         (element) =>
            element.tabIndex >= 0 &&
            element.getClientRects().length > 0 &&
            !element.closest('[hidden]'),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
         event.preventDefault();
         last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
         event.preventDefault();
         first?.focus();
      }
   };

   const loadNotifications = async () => {
      setNotificationsLoading(true);
      setNotificationsError('');
      setNotificationActionError('');
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

   const dismissNotification = async (id) => {
      setNotificationActionPending(true);
      setNotificationActionError('');
      try {
         await dismissPatientNotification(id);
         setNotificationActionPending(false);
         setExitingNotificationIds([id]);
         if (!notificationsPopoverRef.current?.hidden)
            notificationsHeadingRef.current?.focus();
      } catch (error) {
         setNotificationActionError(
            error.message || 'This notification could not be dismissed.',
         );
         setNotificationActionPending(false);
      }
   };

   const dismissAllNotifications = async () => {
      const ids = notifications?.map((notification) => notification.id) ?? [];
      if (!ids.length) return;
      setNotificationActionPending(true);
      setNotificationActionError('');
      try {
         await dismissAllPatientNotifications();
         setNotificationActionPending(false);
         setExitingNotificationIds(ids);
         if (!notificationsPopoverRef.current?.hidden)
            notificationsHeadingRef.current?.focus();
      } catch (error) {
         setNotificationActionError(
            error.message || 'Notifications could not be cleared.',
         );
         setNotificationActionPending(false);
      }
   };

   const completeNotificationExit = (id) => {
      setNotifications(
         (current) =>
            current?.filter((notification) => notification.id !== id) ??
            current,
      );
      setExitingNotificationIds((current) =>
         current.filter((notificationId) => notificationId !== id),
      );
   };

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
            <aside
               ref={sidebarRef}
               role={mobileNavOpen ? 'dialog' : undefined}
               aria-modal={mobileNavOpen || undefined}
               aria-label={
                  mobileNavOpen ? 'Patient navigation menu' : undefined
               }
               onKeyDown={handleDrawerKeyDown}
               className={
                  mobileNavOpen ? 'sidebar mobile-menu-open' : 'sidebar'
               }>
               <div className="sidebar-heading">
                  <Link
                     className="brand"
                     to="/patient"
                     aria-label="JuanAccess Patient Portal home"
                     onClick={() => setMobileNavOpen(false)}>
                     <img
                        className="brand-logo"
                        src="/juanaccess-logo.svg"
                        alt=""
                     />
                     <span className="brand-subtitle">Patient Portal</span>
                  </Link>
                  <button
                     className="mobile-nav-toggle"
                     type="button"
                     ref={mobileNavButtonRef}
                     aria-label={
                        mobileNavOpen
                           ? 'Close navigation menu'
                           : 'Open navigation menu'
                     }
                     aria-expanded={mobileNavOpen}
                     aria-controls="patient-sidebar-drawer"
                     onClick={() => setMobileNavOpen((open) => !open)}>
                     <Icon name={mobileNavOpen ? 'close' : 'menu'} />
                  </button>
               </div>
               <button
                  className="mobile-drawer-backdrop"
                  type="button"
                  tabIndex={-1}
                  aria-label="Close navigation menu"
                  onClick={() => {
                     setMobileNavOpen(false);
                     mobileNavButtonRef.current?.focus();
                  }}
               />
               <div className="sidebar-drawer" id="patient-sidebar-drawer">
                  <nav
                     className="sidebar-nav"
                     id="patient-sidebar-nav"
                     aria-label="Patient navigation">
                     {navigation.map((item, index) => (
                        <NavLink
                           key={item.path}
                           ref={index === 0 ? mobileNavFirstLinkRef : undefined}
                           to={item.path}
                           end={item.end}
                           className={({ isActive }) =>
                              'nav-link' + (isActive ? ' active' : '')
                           }
                           onClick={() => setMobileNavOpen(false)}>
                           <Icon name={item.icon} />
                           <span>{item.label}</span>
                        </NavLink>
                     ))}
                  </nav>
                  <div className="sidebar-account">
                     <NavLink
                        className={({ isActive }) =>
                           'nav-link sidebar-settings' +
                           (isActive ? ' active' : '')
                        }
                        to="/patient/settings"
                        onClick={() => setMobileNavOpen(false)}>
                        <Icon name="settings" />
                        <span>Settings</span>
                     </NavLink>
                     <div className="account-profile">
                        <span className="avatar">{initials}</span>
                        <span className="account-copy">
                           <strong>{displayName}</strong>
                           <span>Patient</span>
                        </span>
                     </div>
                     <button
                        className="signout-link"
                        type="button"
                        onClick={() => void handleSignOut()}>
                        <Icon name="signout" />
                        Sign out
                     </button>
                  </div>
               </div>
            </aside>

            <div className="main-column" inert={mobileNavOpen}>
               <header
                  className={
                     'topbar' +
                     (pathname === '/patient' ? ' topbar-dashboard' : '')
                  }>
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
                        ref={notificationsPopoverRef}
                        aria-label="Patient notifications"
                        aria-busy={notificationsLoading}
                        hidden={!notificationsOpen}>
                        <div className="notification-header">
                           <h2 ref={notificationsHeadingRef} tabIndex="-1">
                              Notifications
                           </h2>
                           {!notificationsLoading &&
                              !notificationsError &&
                              notifications?.length > 0 && (
                                 <button
                                    className="notification-clear-all"
                                    type="button"
                                    disabled={
                                       notificationActionPending ||
                                       exitingNotificationIds.length > 0
                                    }
                                    onClick={() =>
                                       void dismissAllNotifications()
                                    }>
                                    Clear all
                                 </button>
                              )}
                        </div>
                        {notificationsLoading ? (
                           <p role="status">Loading notifications…</p>
                        ) : notificationsError ? (
                           <p role="alert">
                              {notificationsError} Close and reopen this panel
                              to try again.
                           </p>
                        ) : notifications?.length ? (
                           <>
                              {notificationActionError && (
                                 <p
                                    className="notification-action-error"
                                    role="alert">
                                    {notificationActionError}
                                 </p>
                              )}
                              <ul className="notification-list">
                                 {notifications
                                    .slice()
                                    .reverse()
                                    .map((notification) => {
                                       const isExiting =
                                          exitingNotificationIds.includes(
                                             notification.id,
                                          );
                                       return (
                                          <li
                                             className={
                                                'notification-item' +
                                                (notification.isRead
                                                   ? ''
                                                   : ' unread') +
                                                (isExiting ? ' exiting' : '')
                                             }
                                             key={notification.id}
                                             onAnimationEnd={() => {
                                                if (isExiting)
                                                   completeNotificationExit(
                                                      notification.id,
                                                   );
                                             }}>
                                             <div className="notification-item-header">
                                                <p>{notification.message}</p>
                                                <button
                                                   className="notification-dismiss"
                                                   type="button"
                                                   aria-label={`Dismiss notification: ${notification.message}`}
                                                   title="Dismiss notification"
                                                   disabled={
                                                      notificationActionPending ||
                                                      exitingNotificationIds.length >
                                                         0
                                                   }
                                                   onClick={() =>
                                                      void dismissNotification(
                                                         notification.id,
                                                      )
                                                   }>
                                                   <Icon name="close" />
                                                </button>
                                             </div>
                                             <span>
                                                {notification.type.replaceAll(
                                                   '_',
                                                   ' ',
                                                )}
                                             </span>
                                             <time
                                                dateTime={
                                                   notification.createdAt
                                                }>
                                                {formatClinicDateTime(
                                                   notification.createdAt,
                                                )}
                                             </time>
                                          </li>
                                       );
                                    })}
                              </ul>
                           </>
                        ) : (
                           <p role="status">No notifications yet.</p>
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
