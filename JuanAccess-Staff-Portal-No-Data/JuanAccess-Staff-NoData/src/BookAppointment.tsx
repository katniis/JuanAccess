import { useState } from 'react';
import type { AppView } from './types';
import { visitReasons } from './data';
import { usePortal } from './store';
import { StepIndicator, Button, Card, PageHeader } from './components';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | null;

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function MiniCalendar({
  selected, onToggle,
}: { selected: string[]; onToggle: (date: string) => void }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const monthLabel = `${MONTHS[month]} ${year}`;
  const dateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">{monthLabel}</p>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 text-xs flex items-center justify-center">◀</button>
          <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 text-xs flex items-center justify-center">▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center mb-1">
        {DAYS.map(d => <span key={d} className="text-xs text-slate-400 font-medium py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(year, month, day);
          date.setHours(0, 0, 0, 0);
          const past = date < today;
          const key = dateKey(day);
          const isSel = selected.includes(key);
          const isToday = date.getTime() === today.getTime();
          return (
            <button
              type="button"
              key={key}
              disabled={past}
              aria-pressed={isSel}
              onClick={() => onToggle(key)}
              className={`h-9 w-full rounded-lg text-sm transition-all
                ${past ? 'text-slate-300 cursor-not-allowed' : ''}
                ${isSel && !past ? 'bg-brand-600 text-white font-semibold' : ''}
                ${!isSel && !past ? 'text-slate-700 hover:bg-brand-50 hover:text-brand-700' : ''}
                ${isToday && !isSel ? 'ring-1 ring-brand-500 font-semibold' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BookAppointment({ setView }: { setView: (v: AppView) => void }) {
  const { slots: availableSlots, bookSlot } = usePortal();
  const [step, setStep] = useState(0);
  const [reason, setReason]     = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(null);
  const [booked, setBooked]     = useState(false);

  const toggleDay = (date: string) =>
    setSelectedDays(prev => prev.includes(date) ? prev.filter(x => x !== date) : [...prev, date].sort());

  if (booked) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Appointment Booked!</h2>
        <p className="text-slate-500 text-sm max-w-xs">Your appointment has been confirmed. You'll receive a confirmation by email shortly.</p>
        <Button className="mt-8" onClick={() => { setBooked(false); setStep(0); setReason(null); setSelectedDays([]); setView('patient-dashboard'); }}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader title="Book an Appointment" subtitle="Find a time that works for you" />

      <div className="mb-8">
        <StepIndicator steps={['Reason', 'Availability', 'Select']} current={step} />
      </div>

      {/* Step 1: Reason */}
      {step === 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-800 mb-1">What's the reason for your visit?</h2>
          <p className="text-sm text-slate-500 mb-5">Select the option that best describes your needs.</p>
          <div className="space-y-2">
            {visitReasons.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all
                  ${reason === r
                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                    : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50/50'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                  ${reason === r ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`}>
                  {reason === r && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {r}
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!reason}>
              Continue →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Availability */}
      {step === 1 && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-800 mb-1">When are you available?</h2>
          <p className="text-sm text-slate-500 mb-5">Select one or more preferred dates, and optionally a time of day.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Preferred Dates</p>
              <MiniCalendar selected={selectedDays} onToggle={toggleDay} />
              {selectedDays.length > 0 && (
                <p className="text-xs text-brand-600 mt-2 font-medium">
                  {selectedDays.length} date{selectedDays.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Preferred Time of Day</p>
              <div className="space-y-2">
                {[
                  { id: 'morning',   label: 'Morning',   sub: '8:00 AM – 12:00 PM' },
                  { id: 'afternoon', label: 'Afternoon',  sub: '12:00 PM – 5:00 PM' },
                  { id: 'evening',   label: 'Evening',    sub: '5:00 PM – 7:00 PM' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTimeOfDay(timeOfDay === t.id as TimeOfDay ? null : t.id as TimeOfDay)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all
                      ${timeOfDay === t.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50/50'
                      }`}
                  >
                    <TimeOfDayIcon period={t.id} />
                    <div>
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-slate-400">{t.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">No preference? We'll show all available slots.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
            <Button onClick={() => setStep(2)}>Find Slots →</Button>
          </div>
        </Card>
      )}

      {/* Step 3: Select Provider */}
      {step === 2 && (
        <div>
          <Card className="p-5 mb-5 bg-slate-50 border-slate-200">
            <div className="flex flex-wrap gap-4 text-sm">
              <span><span className="text-slate-400 mr-1">Reason:</span><span className="font-medium text-slate-700">{reason}</span></span>
              {selectedDays.length > 0 && (
                <span><span className="text-slate-400 mr-1">Dates:</span><span className="font-medium text-slate-700">{selectedDays.slice(0,3).map(date => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })).join(', ')} {selectedDays.length > 3 ? `+${selectedDays.length-3} more` : ''}</span></span>
              )}
              {timeOfDay && (
                <span><span className="text-slate-400 mr-1">Time:</span><span className="font-medium text-slate-700 capitalize">{timeOfDay}</span></span>
              )}
            </div>
          </Card>

          <h2 className="font-semibold text-slate-800 mb-1">Available Appointments</h2>
          <p className="text-sm text-slate-500 mb-4">Select a slot to confirm your booking.</p>

          {availableSlots.length === 0 && (
            <Card className="p-8 text-center">
              <p className="font-semibold text-slate-800">No appointments available right now</p>
              <p className="mt-1 text-sm text-slate-600">Try different dates, or join the waitlist to be notified when a slot opens.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setStep(1)}>Change dates</Button>
                <Button size="sm" onClick={() => setView('patient-waitlist')}>Go to waitlist</Button>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {availableSlots.map(slot => (
              <Card key={slot.id} className="p-4 flex items-center justify-between gap-4 hover:border-brand-200 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-14 rounded-xl bg-brand-50 flex flex-col items-center justify-center text-brand-600 flex-shrink-0">
                    <span className="text-xs font-semibold uppercase">{slot.date.split(' ')[0]}</span>
                    <span className="text-xl font-bold leading-tight">{slot.date.split(' ')[1].replace(',','')}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{slot.provider}</p>
                    <p className="text-sm text-slate-500">{slot.specialty}</p>
                    <p className="text-sm text-brand-600 font-medium mt-0.5">{slot.time}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => { bookSlot(slot.id, reason ?? 'Appointment'); setBooked(true); }} className="flex-shrink-0">
                  Select
                </Button>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex justify-start">
            <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeOfDayIcon({ period }: { period: string }) {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {period === 'evening' ? (
        <path d="M20.5 15.5A9 9 0 0 1 8.5 3.5 9 9 0 1 0 20.5 15.5Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r={period === 'morning' ? '4' : '5'} />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
    </svg>
  );
}
