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
   const [mobileNavOpen, setMobileNavOpen] = useState(false);
   const [accountMenuPath, setAccountMenuPath] = useState(null);
   const accountMenuOpen = accountMenuPath === pathname;
   const accountAreaRef = useRef(null);
   const accountButtonRef = useRef(null);
   const mobileNavButtonRef = useRef(null);
   const mobileNavFirstLinkRef = useRef(null);
   const sidebarRef = useRef(null);
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

   return (
      <PortalFeedbackProvider>
         <div className="staff-app">
            <aside
               ref={sidebarRef}
               role={mobileNavOpen ? 'dialog' : undefined}
               aria-modal={mobileNavOpen || undefined}
               aria-label={mobileNavOpen ? 'Staff navigation menu' : undefined}
               onKeyDown={handleDrawerKeyDown}
               className={
                  mobileNavOpen ? 'sidebar mobile-menu-open' : 'sidebar'
               }>
               <div className="sidebar-heading">
                  <Link
                     className="brand"
                     to="/staff"
                     aria-label="JuanAccess Staff Portal home"
                     onClick={() => setMobileNavOpen(false)}>
                     <img
                        className="brand-logo"
                        src="/juanaccess-logo.svg"
                        alt=""
                     />
                     <span className="brand-subtitle">Staff Portal</span>
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
                     aria-controls="staff-sidebar-drawer"
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
               <div className="sidebar-drawer" id="staff-sidebar-drawer">
                  <nav
                     className="sidebar-nav"
                     id="staff-sidebar-nav"
                     aria-label="Staff navigation">
                     {navigation.map((item, index) => (
                        <NavLink
                           key={item.path}
                           ref={index === 0 ? mobileNavFirstLinkRef : undefined}
                           to={item.path}
                           end={item.end}
                           className={({ isActive }) =>
                              `nav-link${isActive ? ' active' : ''}`
                           }
                           onClick={() => setMobileNavOpen(false)}>
                           <Icon name={item.icon} />
                           <span>{item.label}</span>
                        </NavLink>
                     ))}
                  </nav>
                  <div className="sidebar-account" ref={accountAreaRef}>
                     <NavLink
                        className={({ isActive }) =>
                           'nav-link sidebar-settings' +
                           (isActive ? ' active' : '')
                        }
                        to="/staff/settings"
                        onClick={() => setMobileNavOpen(false)}>
                        <Icon name="settings" />
                        <span>Settings</span>
                     </NavLink>
                     <div
                        className="account-menu"
                        id="staff-account-menu"
                        role="group"
                        aria-label="Staff account options"
                        hidden={!accountMenuOpen}>
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
               </div>
            </aside>

            <div className="main-column" inert={mobileNavOpen}>
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
