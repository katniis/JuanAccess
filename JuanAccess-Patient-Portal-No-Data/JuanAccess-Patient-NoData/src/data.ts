import type {
  Appointment, WaitlistEntry, BillLineItem,
  StaffProvider, ScheduleSlot, PatientSummary,
  PriorAuthCard, AppealCard, AppNotification, UserRole,
  StaffWaitlistEntry, PendingBill, AvailableSlot, StaffPatient,
} from './types';

/* ── NO DATA VERSION ─────────────────────────────────────────────────────────
 * Same exports as the mock-data package, but every collection is empty.
 * Use it to check that every screen shows a correct empty state, with no
 * bell notification and no side-menu numbers.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Signed-in account identity (not clinical data, so it is the same in both packages). */
export const currentUsers: Record<UserRole, { name: string; firstName: string; initials: string; roleLabel: string }> = {
  patient: { name: 'Sarah Chen',     firstName: 'Sarah',      initials: 'SC', roleLabel: 'Patient' },
  staff:   { name: 'Dr. A. Torres',  firstName: 'Dr. Torres', initials: 'AT', roleLabel: 'Clinical Staff' },
};

export const patientAppointments: Appointment[] = [];
export const waitlistEntries: WaitlistEntry[] = [];
export const billLineItems: BillLineItem[] = [];
export const staffProviders: StaffProvider[] = [];
export const doctorSchedule: Record<string, ScheduleSlot[]> = {};
export const patientSummaries: Record<string, PatientSummary> = {};
export const priorAuthCards: PriorAuthCard[] = [];
export const appealCards: AppealCard[] = [];

/** Form options (the list of visit reasons), not records, so the booking form still works. */
export const visitReasons = [
  'Annual Physical / Wellness Exam',
  'Follow-up – Chronic Condition',
  'New Problem / Sick Visit',
  'Preventive Screening',
  'Pre-operative Clearance',
  'Lab Review & Medication Management',
  'Mental Health Check-in',
  'Specialist Consultation',
  'Immunizations / Vaccines',
  'Sports Physical',
];

export const availableSlots: AvailableSlot[] = [];
export const staffPatients: StaffPatient[] = [];
export const staffWaitlist: StaffWaitlistEntry[] = [];
export const pendingBills: PendingBill[] = [];
export const sampleDisputeLetter = '';

export const initialNotifications: Record<UserRole, AppNotification[]> = {
  patient: [],
  staff: [],
};
