import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppView } from './types';
import { currentUsers, doctorSchedule, staffPatients as patients, staffProviders, staffWaitlist } from './data';
import { usePortal, ELEVATED_STAFF } from './store';
import { greeting } from './notifications';
import { Button, Card } from './components';

type SearchMode = 'doctors' | 'patients';
type IconName = 'alert' | 'calendar' | 'check' | 'chevron' | 'clock' | 'file-check' | 'scale' | 'search' | 'user';

type AttentionItem = { id: string; description: string; person: string; status: string; icon: IconName; view: AppView };

export default function StaffDashboard({ setView }: { setView: (v: AppView) => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<SearchMode>('doctors');
  const [query, setQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { priorAuth, appeals } = usePortal();

  const todaysAppointments = Object.values(doctorSchedule).reduce((sum, slots) => sum + slots.length, 0);
  const providersScheduled = Object.values(doctorSchedule).filter(slots => slots.length > 0).length;
  const paTodo = priorAuth.filter(c => c.status === 'needs-draft' || (ELEVATED_STAFF && c.status === 'drafted'));
  const appealTodo = appeals.filter(c => c.status === 'needs-draft' || c.status === 'drafted');
  const offersAwaiting = staffWaitlist.filter(w => w.status === 'offered').length;

  const stats: { label: string; value: number; detail: string; urgency: string; done: boolean; icon: IconName; view: AppView }[] = [
    {
      label: "Today's appointments", value: todaysAppointments, icon: 'calendar', view: 'doctor-schedule',
      detail: todaysAppointments > 0 ? `${providersScheduled} provider${providersScheduled === 1 ? '' : 's'} on the schedule` : 'No appointments scheduled',
      urgency: todaysAppointments > 0 ? 'View schedule' : 'Nothing scheduled', done: todaysAppointments === 0,
    },
    {
      label: 'Prior auths', value: paTodo.length, icon: 'file-check', view: 'prior-auth',
      detail: priorAuth.length > 0 ? `${priorAuth.length} case${priorAuth.length === 1 ? '' : 's'} in the queue` : 'No cases in the queue',
      urgency: paTodo.length > 0 ? `${paTodo.length} need action` : 'Nothing to do', done: paTodo.length === 0,
    },
    {
      label: 'Appeals', value: appealTodo.length, icon: 'scale', view: 'appeals',
      detail: appeals.length > 0 ? `${appeals.length} appeal${appeals.length === 1 ? '' : 's'} in the queue` : 'No appeals in the queue',
      urgency: appealTodo.length > 0 ? `${appealTodo.length} need action` : 'Nothing to do', done: appealTodo.length === 0,
    },
    {
      label: 'Waitlist slots', value: staffWaitlist.length, icon: 'clock', view: 'doctor-schedule',
      detail: staffWaitlist.length > 0 ? `${offersAwaiting} offer${offersAwaiting === 1 ? '' : 's'} awaiting response` : 'No one on the waitlist',
      urgency: offersAwaiting > 0 ? `${offersAwaiting} awaiting` : 'Nothing to do', done: offersAwaiting === 0,
    },
  ];

  const attentionItems: AttentionItem[] = [
    ...appeals.filter(c => c.status === 'needs-draft' || c.status === 'drafted').map(c => ({
      id: c.id, description: `Appeal ${c.status === 'drafted' ? 'ready to submit' : 'needs a draft'}: ${c.visitType}`,
      person: c.patientName, status: c.status === 'drafted' ? 'Drafted' : 'Needs draft', icon: 'alert' as IconName, view: 'appeals' as AppView,
    })),
    ...priorAuth.filter(c => c.status === 'needs-draft' || (ELEVATED_STAFF && c.status === 'drafted')).map(c => ({
      id: c.id, description: `Prior auth ${c.status === 'drafted' ? 'ready to submit' : 'needs a draft'}: ${c.visitType}`,
      person: c.patientName, status: c.status === 'drafted' ? 'Drafted' : 'Needs draft', icon: 'file-check' as IconName, view: 'prior-auth' as AppView,
    })),
    ...(offersAwaiting > 0 ? [{
      id: 'waitlist-offers', description: 'Waitlist offers awaiting response',
      person: `${offersAwaiting} open offer${offersAwaiting === 1 ? '' : 's'}`, status: 'Awaiting', icon: 'clock' as IconName, view: 'doctor-schedule' as AppView,
    }] : []),
  ];

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (mode === 'doctors') {
      const matches = staffProviders.filter(provider =>
        provider.name.toLowerCase().includes(normalized) || provider.specialty.toLowerCase().includes(normalized)
      );
      return normalized ? matches : matches.slice(0, 5);
    }
    const matches = patients.filter(patient =>
      patient.name.toLowerCase().includes(normalized) || patient.id.toLowerCase().includes(normalized)
    );
    return normalized ? matches : matches.slice(0, 5);
  }, [mode, query]);

  return (
    <div className="animate-fade-in space-y-8 text-[15px]">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{greeting()}, {currentUsers.staff.firstName}</h1>
        <p className="mt-1 text-[15px] text-slate-600">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {isLoading ? <DashboardSkeleton /> : (
        <>
          <section aria-label="Staff dashboard summary">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(stat => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => setView(stat.view)}
                  className="group flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  aria-label={`${stat.label}: ${stat.value}. ${stat.detail}`}
                >
                  <DashboardIcon name={stat.icon} className="h-6 w-6 text-brand-700" />
                  <p className="mt-4 truncate text-base font-semibold text-slate-800">{stat.label}</p>
                  <p className="mt-3 text-[40px] font-bold leading-none text-slate-900">{stat.value}</p>
                  <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{stat.detail}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <DashboardIcon name={stat.done ? 'check' : 'alert'} className="h-4 w-4 text-brand-700" />
                      {stat.urgency}
                    </span>
                    <DashboardIcon name="chevron" className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="attention-heading">
            <Card className="overflow-hidden">
              <div className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 id="attention-heading" className="text-lg font-semibold text-slate-900">Needs attention today</h2>
                  <p className="mt-0.5 text-sm text-slate-600">Appeals first, then prior authorizations</p>
                </div>
                {attentionItems.length > 0 && (
                  <Button variant="ghost" onClick={() => setView(attentionItems[0].view)} className="shrink-0 text-brand-700">
                    View all <DashboardIcon name="chevron" className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {attentionItems.length ? (
                <div className="divide-y divide-slate-200">
                  {attentionItems.map(item => (
                    <div key={item.id} className="flex flex-col gap-4 px-6 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <DashboardIcon name={item.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800">{item.description}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.person}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:ml-auto sm:flex-nowrap">
                        <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-800">{item.status}</span>
                        <Button variant="secondary" onClick={() => setView(item.view)}>Review</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <DashboardIcon name="check" className="h-8 w-8 text-brand-700" />
                  <p className="mt-3 font-semibold text-slate-800">You're all caught up.</p>
                  <p className="mt-1 text-sm text-slate-600">Nothing needs your attention right now.</p>
                </div>
              )}
            </Card>
          </section>

          <section aria-labelledby="search-heading">
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="search-heading" className="text-lg font-semibold text-slate-900">Search records</h2>
                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Search category">
                  {(['doctors', 'patients'] as SearchMode[]).map(option => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={mode === option}
                      onClick={() => { setMode(option); setQuery(''); }}
                      className={`min-h-11 rounded-lg px-4 text-sm font-semibold capitalize transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 ${mode === option ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-700 hover:bg-white/70'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mt-5">
                <DashboardIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={mode === 'doctors' ? 'Search by doctor name or specialty' : 'Search by patient name or ID'}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-14 text-[15px] text-slate-800 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/40"
                />
                <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">/</kbd>
              </div>

              <p className="mb-2 mt-5 text-sm font-semibold text-slate-700">{query.trim() ? 'Results' : results.length > 0 ? 'Recent' : ''}</p>
              <div className="space-y-1">
                {results.map(result => mode === 'doctors' ? (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => setView('doctor-schedule')}
                    className="group flex min-h-14 w-full items-center gap-4 rounded-xl px-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><DashboardIcon name="user" className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-800">{result.name}</span>
                      <span className="block text-sm text-slate-600">{'specialty' in result ? result.specialty : ''}</span>
                    </span>
                    <DashboardIcon name="chevron" className="h-5 w-5 text-slate-500 group-hover:text-brand-700" />
                  </button>
                ) : (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => setSelectedPatient(result.id)}
                    className="group flex min-h-14 w-full items-center gap-4 rounded-xl px-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><DashboardIcon name="user" className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-800">{result.name}</span>
                      <span className="block text-sm text-slate-600">
                        {result.id}
                        <span className={selectedPatient === result.id ? 'inline' : 'hidden group-hover:inline group-focus:inline'}>
                          {'dob' in result ? ` · DOB ${result.dob}` : ''}
                        </span>
                      </span>
                    </span>
                    <DashboardIcon name="chevron" className="h-5 w-5 text-slate-500 group-hover:text-brand-700" />
                  </button>
                ))}
                {results.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-center">
                    <DashboardIcon name="search" className="h-7 w-7 text-slate-600" />
                    {query.trim() ? (
                      <>
                        <p className="mt-3 font-semibold text-slate-800">No matching records found.</p>
                        <p className="mt-1 text-sm text-slate-600">Try a different name or identifier.</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-3 font-semibold text-slate-800">{mode === 'doctors' ? 'No doctors on record yet.' : 'No patients on record yet.'}</p>
                        <p className="mt-1 text-sm text-slate-600">Records will appear here once they are added.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading staff dashboard" aria-busy="true">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(item => (
          <div key={item} className="min-h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-6 w-6 rounded bg-slate-200" />
            <div className="mt-4 h-5 w-32 rounded bg-slate-200" />
            <div className="mt-4 h-10 w-16 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-40 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}

function DashboardIcon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.6 2.4 17.3A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.7L13.7 3.6a2 2 0 0 0-3.4 0Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    'file-check': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 15l2 2 4-4" /></>,
    scale: <><path d="M12 3v18M5 7h14M7 7l-4 7h8L7 7ZM17 7l-4 7h8l-4-7Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
