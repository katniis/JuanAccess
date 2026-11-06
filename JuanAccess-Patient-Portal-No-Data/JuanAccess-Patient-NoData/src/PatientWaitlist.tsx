import { useState } from 'react';
import { usePortal } from './store';
import type { AppView } from './types';
import { StatusPill, Card, Button, CountdownTimer, PageHeader } from './components';

export default function PatientWaitlist({ setView: _setView }: { setView: (v: AppView) => void }) {
  const { waitlist: entries, confirmWaitlist, declineWaitlist, removeWaitlist } = usePortal();
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [declined, setDeclined]   = useState<string | null>(null);

  const handleConfirm = (id: string) => {
    confirmWaitlist(id);
    setDeclined(null);
    setConfirmed(id);
  };

  const handleDecline = (id: string) => {
    declineWaitlist(id);
    setConfirmed(null);
    setDeclined(id);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader
        title="My Waitlist"
        subtitle="You'll be notified when a slot becomes available"
        action={
          <Button size="sm" variant="secondary">
            + Join Waitlist
          </Button>
        }
      />

      {confirmed && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 12 4 4L19 6" />
          </svg>
          Appointment confirmed! It now appears in My Appointments.
          <button onClick={() => setConfirmed(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">×</button>
        </div>
      )}

      {declined && (
        <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 flex items-center gap-2">
          <span>↩</span> Slot declined. You remain on the waitlist for the next available opening.
          <button onClick={() => setDeclined(null)} className="ml-auto text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      <div className="space-y-4">
        {entries.map(entry => (
          <Card key={entry.id} className={`p-5 ${entry.status === 'offered' ? 'border-violet-200 ring-1 ring-violet-200' : ''}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status={entry.status as any} />
                  {entry.status === 'offered' && (
                    <span className="text-xs text-violet-500 font-medium">Slot available — respond soon</span>
                  )}
                </div>
                <p className="font-semibold text-slate-800">{entry.provider}</p>
                <p className="text-sm text-slate-500 mt-0.5">{entry.visitType}</p>
                <p className="text-xs text-slate-400 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/>
                      <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                    Requested window: {entry.dateRange}
                  </span>
                </p>

                {entry.status === 'offered' && entry.offeredDate && (
                  <div className="mt-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      Offered: {entry.offeredDate} at {entry.offeredTime}
                    </p>
                    <CountdownTimer initialSeconds={entry.offeredExpiresSeconds ?? 0} />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 items-end">
                {entry.status === 'offered' ? (
                  <>
                    <Button size="sm" onClick={() => handleConfirm(entry.id)}>Confirm</Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDecline(entry.id)}>Decline</Button>
                  </>
                ) : (
                  <button
                    onClick={() => removeWaitlist(entry.id)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-16">
          <svg className="mx-auto mb-3 h-9 w-9 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9" />
            <path d="M9 3H5a2 2 0 0 0-2 2v10M9 3v6H3" />
          </svg>
          <p className="font-medium text-slate-600">No waitlist entries</p>
          <p className="text-sm text-slate-400 mt-1">Join a waitlist to be notified of earlier appointments.</p>
        </div>
      )}
    </div>
  );
}
