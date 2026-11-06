export type AppView =
  | 'login'
  | 'patient-dashboard'
  | 'book-appointment'
  | 'patient-waitlist'
  | 'my-appointments'
  | 'bill-upload'
  | 'staff-dashboard'
  | 'doctor-schedule'
  | 'prior-auth'
  | 'appeals';

export type UserRole = 'patient' | 'staff';

export type StatusVariant =
  | 'approved'
  | 'pending'
  | 'denied'
  | 'active'
  | 'offered'
  | 'waitlisted'
  | 'flagged'
  | 'not-required'
  | 'drafted'
  | 'submitted'
  | 'info';

export interface NavItem {
  label: string;
  view: AppView;
  icon: string;
}

/**
 * Mirrors a row of the backend `notifications` table
 * (server/src/db/schema/notifications.js): id, type, message, isRead, createdAt.
 * `refId` is a frontend-only helper that points at the card/entry the
 * notification is about, so it can be opened directly and auto-cleared when the
 * underlying task is handled. It is not sent by the backend today.
 */
export interface AppNotification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string; // ISO timestamp
  refId?: string;
}

export interface StaffWaitlistEntry {
  id: string;
  patientName: string;
  provider: string;
  visitType: string;
  status: 'offered' | 'waiting';
}

export interface PendingBill {
  id: string;
  description: string;
  amount: number;
}

export interface AvailableSlot {
  id: string;
  provider: string;
  specialty: string;
  date: string;
  time: string;
}

export interface StaffPatient {
  name: string;
  dob: string;
  id: string;
}

export interface Appointment {
  id: string;
  provider: string;
  specialty: string;
  date: string;
  time: string;
  visitType: string;
  insuranceStatus: StatusVariant;
  priorAuthStatus: StatusVariant;
}

export interface WaitlistEntry {
  id: string;
  provider: string;
  visitType: string;
  dateRange: string;
  status: 'active' | 'offered' | 'paused' | 'waitlisted';
  offeredDate?: string;
  offeredTime?: string;
  offeredExpiresSeconds?: number;
}

export interface BillLineItem {
  id: string;
  description: string;
  code: string;
  amount: string;
  flagged: boolean;
  explanation: string;
}

export interface StaffProvider {
  id: string;
  name: string;
  specialty: string;
}

export interface ScheduleSlot {
  time: string;
  patientName: string;
  visitType: string;
  appointmentId: string;
}

export interface PatientSummary {
  aiSummary: string;
  recentLabs: { test: string; result: string; date: string }[];
  recentEncounters: { date: string; note: string }[];
  medicationChanges: { date: string; change: string }[];
}

export interface PriorAuthCard {
  id: string;
  patientName: string;
  visitType: string;
  status: 'needs-draft' | 'drafted' | 'submitted' | 'approved' | 'denied';
  dob: string;
  insurer: string;
  justification: string;
}

export interface AppealCard {
  id: string;
  patientName: string;
  visitType: string;
  status: 'needs-draft' | 'drafted' | 'submitted' | 'approved' | 'denied';
  dob: string;
  insurer: string;
  denialReason: string;
  clinicalGuideline: string;
  chartJustification: string;
  draftedLetter: string;
}
