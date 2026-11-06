import type { AppView, Appointment } from './types';
import { StatusPill, Card, PageHeader, Button } from './components';
import { usePortal } from './store';
import { parseDate, startOfToday } from './notifications';

const headers = ['Date & Time', 'Provider', 'Visit Type', 'Insurance', 'Prior Auth'];

function AppointmentTable({ rows, muted }: { rows: Appointment[]; muted?: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          {headers.map(h => (
            <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((appt, i) => (
          <tr key={appt.id} className={`hover:bg-slate-50/60 transition-colors ${i < rows.length - 1 ? 'border-b border-slate-100' : ''}`}>
            <td className="px-5 py-3.5">
              <p className={`font-medium ${muted ? 'text-slate-700' : 'text-slate-800'}`}>{appt.date}</p>
              <p className={`text-xs ${muted ? 'text-slate-400' : 'text-brand-600 font-medium'}`}>{appt.time}</p>
            </td>
            <td className="px-5 py-3.5">
              <p className="font-medium text-slate-700">{appt.provider}</p>
              {appt.specialty && <p className="text-xs text-slate-400">{appt.specialty}</p>}
            </td>
            <td className="px-5 py-3.5 text-slate-600">{appt.visitType}</td>
            <td className="px-5 py-3.5"><StatusPill status={appt.insuranceStatus} /></td>
            <td className="px-5 py-3.5"><StatusPill status={appt.priorAuthStatus} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MyAppointments({ setView }: { setView: (v: AppView) => void }) {
  const { appointments } = usePortal();
  const today = startOfToday();
  const byDate = (a: Appointment, b: Appointment) => parseDate(a.date).getTime() - parseDate(b.date).getTime();
  const upcoming = appointments.filter(a => parseDate(a.date) >= today).sort(byDate);
  const past = appointments.filter(a => parseDate(a.date) < today).sort(byDate).reverse();

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader title="My Appointments" subtitle="Your appointment history and upcoming visits" />

      {/* Upcoming */}
      <section className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Upcoming</p>
        <Card>
          {upcoming.length > 0 ? (
            <AppointmentTable rows={upcoming} />
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="font-semibold text-slate-800">No upcoming appointments</p>
              <p className="mt-1 text-sm text-slate-600">Booked visits will appear here.</p>
              <Button className="mt-4" size="sm" onClick={() => setView('book-appointment')}>Book an appointment</Button>
            </div>
          )}
        </Card>
      </section>

      {/* Past */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Past Appointments</p>
        <Card>
          {past.length > 0 ? (
            <AppointmentTable rows={past} muted />
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="font-semibold text-slate-800">No past appointments</p>
              <p className="mt-1 text-sm text-slate-600">Your visit history will appear here.</p>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
