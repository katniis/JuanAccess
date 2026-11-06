import { useEffect, useRef, useState } from 'react';
import type { AppView, StatusVariant, WaitlistEntry } from './types';
import { currentUsers, pendingBills } from './data';
import { usePortal } from './store';
import { greeting, parseDate, startOfToday } from './notifications';
import { StatusPill, StatCard, Card, Button, CountdownTimer, PageHeader } from './components';

type ConfirmationType = 'decline' | 'cancel' | null;

const waitlistStatusCopy: Record<string, string> = {
  active: 'Looking for a slot',
  offered: 'Action needed',
  waitlisted: "We'll notify you",
};

export default function PatientDashboard({ setView }: { setView: (v: AppView) => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null);
  const { appointments, waitlist: waitlistEntries } = usePortal();
  const today = startOfToday();
  const upcomingList = appointments
    .filter(a => parseDate(a.date) >= today)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const upcoming = upcomingList[0];
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const pastVisits = appointments.filter(a => { const d = parseDate(a.date); return d < today && d >= yearAgo; }).length;
  const pendingTotal = pendingBills.reduce((sum, b) => sum + b.amount, 0);
  const offeredEntry = waitlistEntries.find(entry => entry.status === 'offered');
  const orderedWaitlist = [...waitlistEntries].sort((a, b) => {
    if (a.status === 'offered') return -1;
    if (b.status === 'offered') return 1;
    return 0;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const confirmDialog = () => {
    if (confirmation === 'decline') {
      setConfirmation(null);
      setView('patient-waitlist');
    }
    if (confirmation === 'cancel') {
      setConfirmation(null);
      setView('my-appointments');
    }
  };

  return (
    <div className="animate-fade-in space-y-6 pt-2">
      <PageHeader
        title={`${greeting()}, ${currentUsers.patient.firstName}`}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        action={
          <div className="flex flex-nowrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setView('bill-upload')}>
              <UploadIcon />
              Upload a Bill
            </Button>
            <Button size="sm" onClick={() => setView('book-appointment')}>
              <CalendarIcon />
              Book an Appointment
            </Button>
          </div>
        }
      />

      {offeredEntry && (
        <Card className="border-l-4 border-l-violet-500 border-violet-200 bg-violet-50 p-6 shadow-md">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3">
                <StatusPill status="offered" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">A slot opened up for you</h2>
              <p className="mt-2 text-base font-semibold text-slate-800">{offeredEntry.provider}</p>
              <p className="mt-1 text-sm text-slate-700">
                {offeredEntry.visitType} · {offeredEntry.offeredDate} at {offeredEntry.offeredTime}
              </p>
            </div>
            <div className="flex flex-col gap-3 xl:items-end">
              <CountdownTimer initialSeconds={offeredEntry.offeredExpiresSeconds ?? 0} />
              <p className="max-w-md text-sm text-slate-700">
                Confirm before the timer ends or the slot goes to the next patient.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setView('patient-waitlist')}>Confirm Slot</Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                  onClick={() => setConfirmation('decline')}
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="flex min-h-96 flex-col p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming appointment</h2>
            <Button variant="ghost" size="sm" onClick={() => setView('my-appointments')}>
              View all →
            </Button>
          </div>

          {upcoming ? (
            <>
              <div className="flex flex-1 items-start gap-4">
                <div className="flex h-16 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <span className="text-xs font-semibold uppercase">{upcoming.date.split(' ')[0]}</span>
                  <span className="text-xl font-bold leading-tight">{upcoming.date.split(' ')[1].replace(',', '')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{upcoming.provider}</p>
                  <p className="mt-1 text-sm text-slate-700">{upcoming.specialty} · {upcoming.visitType}</p>
                  <p className="mt-2 text-sm font-semibold text-brand-700">{upcoming.time}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                    <MapPinIcon />
                    In-person · Main Clinic, Floor 2
                  </p>
                  <button
                    type="button"
                    className="mt-2 min-h-11 rounded-lg text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  >
                    Add to calendar
                  </button>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Insurance</span>
                    <StatusPill status={upcoming.insuranceStatus} />
                    <span className="ml-1 text-sm font-medium text-slate-700">Prior auth</span>
                    <StatusPill status={upcoming.priorAuthStatus} />
                    {(upcoming.priorAuthStatus === 'pending' || upcoming.insuranceStatus === 'pending') && <span className="group relative">
                      <button
                        type="button"
                        aria-label="More information about pending prior authorization"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <InfoIcon />
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden w-64 rounded-xl bg-slate-900 p-3 text-sm leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block"
                      >
                        Your insurer is still reviewing this visit. We will notify you once approved.
                      </span>
                    </span>}
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-200 pt-5">
                <Button variant="outline" onClick={() => setView('book-appointment')}>Reschedule</Button>
                <Button
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => setConfirmation('cancel')}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <CalendarIcon className="h-8 w-8 text-slate-500" />
              <p className="mt-3 font-semibold text-slate-800">No upcoming appointments</p>
              <Button className="mt-4" onClick={() => setView('book-appointment')}>Book one now</Button>
            </div>
          )}
        </Card>

        <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Active waitlist</h2>
            <Button variant="secondary" size="sm" onClick={() => setView('patient-waitlist')}>
              Manage →
            </Button>
          </div>
          {orderedWaitlist.length > 0 ? (
            <div className="space-y-2">
              {orderedWaitlist.map(entry => (
                <WaitlistRow key={entry.id} entry={entry} onClick={() => setView('patient-waitlist')} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="font-semibold text-slate-800">You are not on a waitlist</p>
              <p className="mt-1 text-sm text-slate-600">Join one to hear about earlier appointments.</p>
            </div>
          )}
          <Button variant="outline" className="mt-5 w-full" onClick={() => setView('patient-waitlist')}>
            <PlusIcon />
            Join Waitlist
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Total visits"
          value={pastVisits}
          subtitle="Last 12 months"
          icon={<CalendarIcon />}
          onClick={() => setView('my-appointments')}
        />
        <StatCard
          title="Upcoming"
          value={upcomingList.length}
          subtitle={upcoming ? `Next: ${upcoming.date}` : 'Nothing scheduled'}
          icon={<ClockIcon />}
          onClick={() => setView('my-appointments')}
        />
        <StatCard
          title="Pending bills"
          value={`$${pendingTotal.toFixed(2)}`}
          subtitle={pendingBills.length > 0 ? `${pendingBills.length} bill${pendingBills.length > 1 ? 's' : ''} need review` : 'No bills need review'}
          icon={<ReceiptIcon />}
          actionLabel="Review bills"
          onClick={() => setView('bill-upload')}
        />
      </div>

      <ConfirmDialog
        open={confirmation !== null}
        title={confirmation === 'decline' ? 'Decline this offered slot?' : 'Cancel this appointment?'}
        description={
          confirmation === 'decline'
            ? "Are you sure? You'll stay on the waitlist."
            : 'Are you sure you want to cancel? You can review the appointment before making any changes.'
        }
        confirmLabel={confirmation === 'decline' ? 'Decline slot' : 'Review cancellation'}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmDialog}
      />
    </div>
  );
}

function WaitlistRow({ entry, onClick }: { entry: WaitlistEntry; onClick: () => void }) {
  const highlighted = entry.status === 'offered';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
        highlighted
          ? 'border-violet-200 bg-violet-50 hover:bg-violet-100'
          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{entry.provider}</p>
          <StatusPill status={entry.status as StatusVariant} />
        </div>
        <p className="mt-1 text-sm text-slate-700">{entry.visitType} · {entry.dateRange}</p>
        <p className={`mt-1 text-sm font-medium ${highlighted ? 'text-violet-800' : 'text-slate-600'}`}>
          {waitlistStatusCopy[entry.status]}
        </p>
      </div>
      <ChevronRightIcon />
    </button>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation" onMouseDown={onCancel}>
      <Card
        className="w-full max-w-md p-6 shadow-2xl"
      >
        <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" onMouseDown={event => event.stopPropagation()}>
          <h2 id="confirm-dialog-title" className="text-xl font-semibold text-slate-900">{title}</h2>
          <p id="confirm-dialog-description" className="mt-2 text-sm leading-relaxed text-slate-700">{description}</p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel}>Go back</Button>
            <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pt-2" aria-label="Loading patient dashboard" aria-busy="true">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <div className="h-11 w-32 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-11 w-44 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
      <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
      </div>
    </div>
  );
}

function UploadIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M16 3v4M8 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function ClockIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ReceiptIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MapPinIcon() {
  return <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 7c0 3.5-5 7-5 7S3 10.5 3 7a5 5 0 0110 0z" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function InfoIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" /><path d="M10 9v5M10 6.25v.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function PlusIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

function ChevronRightIcon() {
  return <svg className="h-5 w-5 flex-shrink-0 text-slate-500" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
