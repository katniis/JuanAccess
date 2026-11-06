import type { AppNotification, AppView, UserRole } from './types';

/**
 * Notification types come from the backend (notifyPatient calls in
 * server/src/services/* and controller/*). The two `*_needs_draft` types are
 * staff-side types the backend does not emit yet.
 */
interface TypeInfo {
  title: string;
  patientView: AppView;
  staffView: AppView;
}

const typeInfo: Record<string, TypeInfo> = {
  appointment_created:               { title: 'Appointment booked',               patientView: 'my-appointments', staffView: 'doctor-schedule' },
  appointment_cancelled:             { title: 'Appointment cancelled',            patientView: 'my-appointments', staffView: 'doctor-schedule' },
  appointment_rescheduled:           { title: 'Appointment rescheduled',          patientView: 'my-appointments', staffView: 'doctor-schedule' },
  waitlist_offer:                    { title: 'Waitlist slot available',          patientView: 'patient-waitlist', staffView: 'doctor-schedule' },
  waitlist_offer_expired:            { title: 'Waitlist offer expired',           patientView: 'patient-waitlist', staffView: 'doctor-schedule' },
  waitlist_offer_closed:             { title: 'Waitlist offer closed',            patientView: 'patient-waitlist', staffView: 'doctor-schedule' },
  waitlist_confirmed:                { title: 'Waitlist slot confirmed',          patientView: 'my-appointments', staffView: 'doctor-schedule' },
  dispute_letter_available:          { title: 'Dispute letter ready',             patientView: 'bill-upload',     staffView: 'staff-dashboard' },
  prior_authorization_draft_ready:   { title: 'Prior authorization draft ready',  patientView: 'my-appointments', staffView: 'prior-auth' },
  prior_authorization_decision:      { title: 'Prior authorization update',       patientView: 'my-appointments', staffView: 'prior-auth' },
  appeal_draft_available:            { title: 'Appeal draft available',           patientView: 'my-appointments', staffView: 'appeals' },
  appeal_decision:                   { title: 'Appeal update',                    patientView: 'my-appointments', staffView: 'appeals' },
  coverage_simulation:               { title: 'Insurance coverage update',        patientView: 'my-appointments', staffView: 'staff-dashboard' },
  prior_authorization_needs_draft:   { title: 'Prior authorization needs a draft', patientView: 'my-appointments', staffView: 'prior-auth' },
  appeal_needs_draft:                { title: 'Appeal needs a draft',             patientView: 'my-appointments', staffView: 'appeals' },
};

export function notificationTitle(type: string): string {
  return typeInfo[type]?.title ?? 'Notification';
}

export function notificationTarget(type: string, role: UserRole): AppView {
  const info = typeInfo[type];
  if (!info) return role === 'patient' ? 'patient-dashboard' : 'staff-dashboard';
  return role === 'patient' ? info.patientView : info.staffView;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

/** Unread only, newest first (backend returns oldest first, including read ones). */
export function unreadNewestFirst(list: AppNotification[]): AppNotification[] {
  return list.filter(n => !n.isRead).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function parseDate(label: string): Date {
  const d = new Date(label);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
