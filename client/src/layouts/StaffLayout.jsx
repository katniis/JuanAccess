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

const navigation = [
   { label: 'Dashboard', path: '/staff', icon: 'grid', end: true },
   { label: 'Provider Schedule', path: '/staff/schedule', icon: 'calendar' },
   { label: 'Slot Management', path: '/staff/slots', icon: 'grid' },
   { label: 'Prior Auth Queue', path: '/staff/prior-auth', icon: 'folder' },
   { label: 'Appeals Queue', path: '/staff/appeals', icon: 'scale' },
   { label: 'Disputes', path: '/staff/disputes', icon: 'receipt' },
];

function StaffLayout() {
   const { pathname } = useLocation();
   const navigate = useNavigate();
   const { user, signOut } = useAuth();
   const [accountMenuPath, setAccountMenuPath] = useState(null);
   const accountMenuOpen = accountMenuPath === pathname;
   const accountAreaRef = useRef(null);
   const accountButtonRef = useRef(null);
   const displayName = user?.displayName?.trim() || user?.email || 'Staff';
   const staff = {
      displayName,
      initials: displayName
         .split(/\s+/)
         .filter(Boolean)
         .map((part) => part[0])
         .join('')
         .slice(0, 2)
         .toUpperCase(),
      role: user?.role,
      roleLabel:
         user?.role === 'staff_admin' ? 'Staff Admin' : 'Clinical Staff',
   };
   const pageLabels = {
      '/staff/schedule': 'Provider Schedule',
      '/staff/prior-auth': 'Prior Auth Queue',
      '/staff/appeals': 'Appeals Queue',
      '/staff/disputes': 'Disputes',
      '/staff/attention': 'Needs Attention',
      '/staff/settings': 'Settings',
   };
   const currentPage =
      navigation.find((item) => item.path === pathname)?.label ??
      pageLabels[pathname] ??
      (pathname.startsWith('/staff/disputes/') ? 'Disputes' : null) ??
      (pathname.startsWith('/staff/records/')
         ? 'Record Details'
         : 'Staff Dashboard');

   useEffect(() => {
      if (!accountMenuOpen) return undefined;

      const closeOnOutsideClick = (event) => {
         if (!accountAreaRef.current?.contains(event.target))
            setAccountMenuPath(null);
      };
      const closeOnEscape = (event) => {
         if (event.key === 'Escape') {
            setAccountMenuPath(null);
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

   const handleSignOut = async () => {
      await signOut();
      navigate('/login', { replace: true });
   };

   return (
      <PortalFeedbackProvider>
         <div className="staff-app">
            <aside className="sidebar">
               <Link
                  className="brand"
                  to="/staff"
                  aria-label="JuanAccess Staff Portal home">
                  <img
                     className="brand-logo"
                     src="/juanaccess-logo.svg"
                     alt=""
                  />
                  <span className="brand-subtitle">Staff Portal</span>
               </Link>
               <nav className="sidebar-nav" aria-label="Staff navigation">
                  {navigation.map((item) => (
                     <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                           `nav-link${isActive ? ' active' : ''}`
                        }>
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                     </NavLink>
                  ))}
               </nav>
               <div className="sidebar-account" ref={accountAreaRef}>
                  <div
                     className="account-menu"
                     id="staff-account-menu"
                     role="group"
                     aria-label="Staff account options"
                     hidden={!accountMenuOpen}>
                     <Link to="/staff/settings">Settings</Link>
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
                     aria-label={`${staff.displayName}, staff account`}
                     aria-expanded={accountMenuOpen}
                     aria-controls="staff-account-menu"
                     onClick={() =>
                        setAccountMenuPath(accountMenuOpen ? null : pathname)
                     }>
                     <span className="avatar">{staff.initials}</span>
                     <span className="account-copy">
                        <strong>{staff.displayName}</strong>
                        <span>{staff.roleLabel}</span>
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
               </header>
               <main className="main-content">
                  <Outlet context={{ role: staff.role, user }} />
               </main>
            </div>
         </div>
      </PortalFeedbackProvider>
   );
}

export default StaffLayout;
