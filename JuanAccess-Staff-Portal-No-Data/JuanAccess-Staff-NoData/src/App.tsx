import { useEffect, useRef, useState } from 'react';
import type { AppView, UserRole, NavItem } from './types';
import Login from './Login';
import PatientDashboard from './PatientDashboard';
import BookAppointment from './BookAppointment';
import PatientWaitlist from './PatientWaitlist';
import MyAppointments from './MyAppointments';
import BillUpload from './BillUpload';
import StaffDashboard from './StaffDashboard';
import DoctorSchedule from './DoctorSchedule';
import PriorAuth from './PriorAuth';
import Appeals from './Appeals';
import { BrandLogo } from './components';
import { currentUsers } from './data';
import { PortalProvider, usePortal } from './store';
import { notificationTitle, timeAgo } from './notifications';

const patientNav: NavItem[] = [
  { label: 'Dashboard',      view: 'patient-dashboard', icon: 'dashboard' },
  { label: 'Book Appointment', view: 'book-appointment', icon: 'calendar' },
  { label: 'My Waitlist',    view: 'patient-waitlist',  icon: 'clock' },
  { label: 'My Appointments', view: 'my-appointments',  icon: 'clipboard' },
  { label: 'Upload a Bill',  view: 'bill-upload',       icon: 'upload' },
];

const staffNav: NavItem[] = [
  { label: 'Dashboard',      view: 'staff-dashboard', icon: 'dashboard' },
  { label: 'Doctor Schedule', view: 'doctor-schedule', icon: 'calendar' },
  { label: 'Prior Auth Queue', view: 'prior-auth',     icon: 'clipboard' },
  { label: 'Appeals Queue',  view: 'appeals',          icon: 'appeals' },
];

const defaultView: Record<UserRole, AppView> = {
  patient: 'patient-dashboard',
  staff:   'staff-dashboard',
};

interface SidebarProps {
  role: UserRole;
  view: AppView;
  setView: (v: AppView) => void;
  onSignOut: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function Sidebar({ role, view, setView, onSignOut, mobileOpen, onMobileClose }: SidebarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { todo } = usePortal();
  const nav = role === 'patient' ? patientNav : staffNav;
  const userName = currentUsers[role].name;
  const userRole = currentUsers[role].roleLabel;
  const userInitials = currentUsers[role].initials;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="border-b border-slate-200 px-5 py-5">
        <BrandLogo
          className="w-44"
          portal={role === 'patient' ? 'Patient Portal' : 'Staff Portal'}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label={`${userRole} navigation`}>
        {nav.map(item => (
          <button
            key={item.view}
            onClick={() => { setView(item.view); onMobileClose(); }}
            aria-current={view === item.view ? 'page' : undefined}
            className={`relative min-h-11 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-left focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2
              ${view === item.view
                ? 'bg-brand-50 text-brand-800 font-semibold'
                : 'text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            {view === item.view && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600" aria-hidden="true" />}
            <span className="w-5 flex-shrink-0"><NavIcon name={item.icon} /></span>
            <span className="flex-1">{item.label}</span>
            {(todo[item.view] ?? 0) > 0 && (
              <span
                className="min-w-6 rounded-full bg-brand-100 px-2 py-0.5 text-center text-xs font-semibold text-brand-800"
                aria-label={`${todo[item.view]} to do`}
              >
                {todo[item.view]! > 99 ? '99+' : todo[item.view]}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User + sign out */}
      <div className="relative px-3 py-4 border-t border-slate-200">
        {accountMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <button
              className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              onClick={() => setAccountMenuOpen(false)}
            >
              Settings
            </button>
            <button
              className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-red-500"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        )}
        <button
          type="button"
          aria-expanded={accountMenuOpen}
          aria-label="Open account settings"
          onClick={() => setAccountMenuOpen(open => !open)}
          className="mb-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
            <p className="text-sm text-slate-600">{userRole}</p>
          </div>
          <svg className={`h-4 w-4 text-slate-500 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={onSignOut}
          className="min-h-11 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 8H3m0 0l2.5-2.5M3 8l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 3h4a1 1 0 011 1v8a1 1 0 01-1 1H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full lg:flex flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex h-screen h-dvh">
          <div className="absolute inset-0 bg-slate-900/40" onClick={onMobileClose} />
          <aside className="relative w-72 max-w-[85vw] bg-white flex flex-col shadow-xl animate-slide-in-right">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}

export default function App() {
  const portalRole: UserRole = 'staff';
  const [role, setRole] = useState<UserRole | null>(null);

  if (!role) {
    return <Login role={portalRole} onLogin={setRole} />;
  }

  // The provider is mounted only while signed in, so signing out clears the session state.
  return (
    <PortalProvider role={role}>
      <Shell role={role} onSignOut={() => setRole(null)} />
    </PortalProvider>
  );
}

function Shell({ role, onSignOut }: { role: UserRole; onSignOut: () => void }) {
  const [view, setView] = useState<AppView>(defaultView[role]);
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { unread, openNotification } = usePortal();

  useEffect(() => {
    if (!notificationsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notificationsOpen]);

  const renderView = () => {
    switch (view) {
      case 'patient-dashboard': return <PatientDashboard setView={setView} />;
      case 'book-appointment':  return <BookAppointment  setView={setView} />;
      case 'patient-waitlist':  return <PatientWaitlist  setView={setView} />;
      case 'my-appointments':   return <MyAppointments   setView={setView} />;
      case 'bill-upload':       return <BillUpload        setView={setView} />;
      case 'staff-dashboard':   return <StaffDashboard    setView={setView} />;
      case 'doctor-schedule':   return <DoctorSchedule    setView={setView} />;
      case 'prior-auth':        return <PriorAuth          setView={setView} />;
      case 'appeals':           return <Appeals            setView={setView} />;
      default:                  return null;
    }
  };

  const allNav = role === 'patient' ? patientNav : staffNav;
  const currentNavItem = allNav.find(n => n.view === view);
  const unreadCount = unread.length;

  return (
    <div className="flex h-screen h-dvh w-full bg-slate-100 overflow-hidden">
      <Sidebar
        role={role}
        view={view}
        setView={setView}
        onSignOut={onSignOut}
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
      />

      {/* Main content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile + breadcrumb) */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation menu"
            className="lg:hidden min-h-11 min-w-11 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="text-sm font-semibold text-slate-800">
            {role === 'staff' && view === 'staff-dashboard'
              ? 'Staff Dashboard'
              : currentNavItem?.label ?? (role === 'patient' ? 'Patient Portal' : 'Staff Portal')}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative" ref={bellRef}>
              <button
                type="button"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, none unread'}
                title="Notifications"
                onClick={() => setNotificationsOpen(open => !open)}
                aria-expanded={notificationsOpen}
                className="group min-h-11 min-w-11 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2a4.5 4.5 0 014.5 4.5c0 2.5.5 4 1.5 5H2c1-1 1.5-2.5 1.5-5A4.5 4.5 0 018 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {unreadCount > 0 && (
                  <span
                    data-testid="bell-badge"
                    className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
                    aria-hidden="true"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    <button type="button" onClick={() => setNotificationsOpen(false)} className="text-xs text-slate-500 hover:text-slate-800">Close</button>
                  </div>
                  {unreadCount === 0 ? (
                    <p className="text-sm text-slate-600">You’re all caught up. New notifications will appear here.</p>
                  ) : (
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                      {unread.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            const target = openNotification(item);
                            setNotificationsOpen(false);
                            setView(target);
                          }}
                          className="block w-full rounded-lg p-2 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800">{notificationTitle(item.type)}</p>
                              <p className="mt-0.5 text-xs text-slate-600">{item.message}</p>
                              <p className="mt-1 text-xs text-slate-400">{timeAgo(item.createdAt)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 lg:p-8 lg:pt-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const commonProps = {
    className: 'h-5 w-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'dashboard') {
    return <svg {...commonProps}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>;
  }
  if (name === 'calendar') {
    return <svg {...commonProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
  }
  if (name === 'clock') {
    return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  }
  if (name === 'upload') {
    return <svg {...commonProps}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" /></svg>;
  }
  if (name === 'appeals') {
    return <svg {...commonProps}><path d="M12 3v18M5 7h14M7 7l-4 7h8L7 7zM17 7l-4 7h8l-4-7z" /></svg>;
  }
  return <svg {...commonProps}><path d="M9 5h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V9" /><path d="M9 3H5a2 2 0 00-2 2v10M9 3v6H3" /></svg>;
}
