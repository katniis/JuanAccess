import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AppNotification, AppView, Appointment, AppealCard, AvailableSlot,
  PriorAuthCard, UserRole, WaitlistEntry,
} from './types';
import {
  appealCards as seedAppeals,
  availableSlots as seedSlots,
  initialNotifications,
  patientAppointments as seedAppointments,
  priorAuthCards as seedPriorAuth,
  staffProviders,
  waitlistEntries as seedWaitlist,
} from './data';
import { notificationTarget, unreadNewestFirst } from './notifications';

/** Only elevated staff can submit a drafted prior authorization to the insurer. */
export const ELEVATED_STAFF = false;

interface Focus { view: AppView; refId: string }

interface PortalStore {
  role: UserRole;
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  priorAuth: PriorAuthCard[];
  appeals: AppealCard[];
  slots: AvailableSlot[];
  notifications: AppNotification[];
  /** Unread notifications, newest first. This is what the bell shows. */
  unread: AppNotification[];
  /** Number of things to do per side-menu item. Items with nothing to do are absent. */
  todo: Partial<Record<AppView, number>>;
  focus: Focus | null;
  clearFocus: () => void;
  /** Marks the notification read and returns the screen it belongs to. */
  openNotification: (n: AppNotification) => AppView;
  confirmWaitlist: (id: string) => void;
  declineWaitlist: (id: string) => void;
  removeWaitlist: (id: string) => void;
  bookSlot: (slotId: string, reason: string) => void;
  advancePriorAuth: (id: string, status: PriorAuthCard['status'], justification: string) => void;
  submitAppeal: (id: string, letter: string) => void;
}

const Ctx = createContext<PortalStore | null>(null);

export function usePortal(): PortalStore {
  const value = useContext(Ctx);
  if (!value) throw new Error('usePortal must be used inside <PortalProvider>');
  return value;
}

export function PortalProvider({ role, children }: { role: UserRole; children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(seedWaitlist);
  const [priorAuth, setPriorAuth] = useState<PriorAuthCard[]>(seedPriorAuth);
  const [appeals, setAppeals] = useState<AppealCard[]>(seedAppeals);
  const [slots, setSlots] = useState<AvailableSlot[]>(seedSlots);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications[role]);
  const [focus, setFocus] = useState<Focus | null>(null);

  const addNotification = useCallback((type: string, message: string, refId?: string) => {
    setNotifications(prev => {
      const id = prev.reduce((max, n) => Math.max(max, n.id), 0) + 1;
      return [...prev, { id, type, message, isRead: false, createdAt: new Date().toISOString(), refId }];
    });
  }, []);

  /** Marks notifications about a given card/entry as read once the task is handled. */
  const resolveByRef = useCallback((types: string[], refId: string) => {
    setNotifications(prev => prev.map(n => (n.refId === refId && types.includes(n.type) ? { ...n, isRead: true } : n)));
  }, []);

  const openNotification = useCallback((n: AppNotification): AppView => {
    setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, isRead: true } : x)));
    const view = notificationTarget(n.type, role);
    setFocus(n.refId ? { view, refId: n.refId } : null);
    return view;
  }, [role]);

  const clearFocus = useCallback(() => setFocus(null), []);

  const confirmWaitlist = useCallback((id: string) => {
    const entry = waitlist.find(e => e.id === id);
    if (!entry) return;
    setWaitlist(prev => prev.filter(e => e.id !== id));
    setAppointments(prev => [
      ...prev,
      {
        id: `appt-${Date.now()}`,
        provider: entry.provider,
        specialty: staffProviders.find(p => p.name === entry.provider)?.specialty ?? '',
        date: entry.offeredDate ?? '',
        time: entry.offeredTime ?? '',
        visitType: entry.visitType,
        insuranceStatus: 'pending',
        priorAuthStatus: 'not-required',
      },
    ]);
    resolveByRef(['waitlist_offer'], id);
    addNotification('waitlist_confirmed', 'Your waitlist appointment was confirmed.');
  }, [waitlist, resolveByRef, addNotification]);

  const declineWaitlist = useCallback((id: string) => {
    setWaitlist(prev => prev.map(e => (e.id === id ? { ...e, status: 'waitlisted', offeredDate: undefined, offeredTime: undefined, offeredExpiresSeconds: undefined } : e)));
    resolveByRef(['waitlist_offer'], id);
  }, [resolveByRef]);

  const removeWaitlist = useCallback((id: string) => {
    setWaitlist(prev => prev.filter(e => e.id !== id));
    resolveByRef(['waitlist_offer'], id);
  }, [resolveByRef]);

  const bookSlot = useCallback((slotId: string, reason: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    setSlots(prev => prev.filter(s => s.id !== slotId));
    setAppointments(prev => [
      ...prev,
      {
        id: `appt-${Date.now()}`,
        provider: slot.provider,
        specialty: slot.specialty,
        date: slot.date,
        time: slot.time,
        visitType: reason,
        insuranceStatus: 'pending',
        priorAuthStatus: 'not-required',
      },
    ]);
    addNotification('appointment_created', 'Your appointment was booked successfully.');
  }, [slots, addNotification]);

  const advancePriorAuth = useCallback((id: string, status: PriorAuthCard['status'], justification: string) => {
    setPriorAuth(prev => prev.map(c => (c.id === id ? { ...c, status, justification } : c)));
    resolveByRef(['prior_authorization_needs_draft'], id);
  }, [resolveByRef]);

  const submitAppeal = useCallback((id: string, letter: string) => {
    setAppeals(prev => prev.map(c => (c.id === id ? { ...c, status: 'submitted', draftedLetter: letter } : c)));
    resolveByRef(['appeal_needs_draft'], id);
  }, [resolveByRef]);

  const unread = useMemo(() => unreadNewestFirst(notifications), [notifications]);

  const todo = useMemo(() => {
    const counts: Partial<Record<AppView, number>> = {};
    const add = (view: AppView, n: number) => { if (n > 0) counts[view] = n; };
    if (role === 'patient') {
      add('patient-waitlist', waitlist.filter(e => e.status === 'offered').length);
    } else {
      add('prior-auth', priorAuth.filter(c => c.status === 'needs-draft' || (ELEVATED_STAFF && c.status === 'drafted')).length);
      add('appeals', appeals.filter(c => c.status === 'needs-draft' || c.status === 'drafted').length);
    }
    return counts;
  }, [role, waitlist, priorAuth, appeals]);

  const value: PortalStore = {
    role, appointments, waitlist, priorAuth, appeals, slots, notifications, unread, todo,
    focus, clearFocus, openNotification,
    confirmWaitlist, declineWaitlist, removeWaitlist, bookSlot, advancePriorAuth, submitAppeal,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
