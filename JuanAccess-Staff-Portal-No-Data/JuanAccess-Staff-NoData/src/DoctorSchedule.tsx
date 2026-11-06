import { useState } from 'react';
import type { AppView } from './types';
import { staffProviders, doctorSchedule, patientSummaries } from './data';
import { Card, SidePanel, Collapsible, PageHeader } from './components';

const todayLabel = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const weekdayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });

export default function DoctorSchedule({ setView: _setView }: { setView: (v: AppView) => void }) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(staffProviders[0]?.id ?? null);
  const [selectedView, setSelectedView]         = useState<'day' | 'week'>('day');
  const [panelApptId, setPanelApptId]           = useState<string | null>(null);

  const provider = staffProviders.find(p => p.id === selectedProvider);
  const slots    = (selectedProvider && doctorSchedule[selectedProvider]) || [];
  const panelAppt = slots.find(s => s.appointmentId === panelApptId);
  const summary   = panelApptId ? patientSummaries[panelApptId] : null;

  if (!provider) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Doctor Schedule" subtitle="View and manage provider appointments" />
        <Card className="p-12 text-center">
          <p className="font-semibold text-slate-800">No providers found</p>
          <p className="mt-1 text-sm text-slate-600">Provider schedules will appear here once providers are added.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Doctor Schedule" subtitle="View and manage provider appointments" />

      {/* Provider selector + view toggle */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {staffProviders.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProvider(p.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all border
                ${selectedProvider === p.id
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                }`}
            >
              {p.name.replace('Dr. ', '')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['day', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setSelectedView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
                ${selectedView === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Provider header */}
      <Card className="p-4 mb-4 bg-brand-50 border-brand-100 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">
          {provider.name.split(' ').filter(w => w !== 'Dr.').map(w => w[0]).join('').slice(0,2)}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{provider.name}</p>
          <p className="text-sm text-slate-500">{provider.specialty} · {slots.length} appointment{slots.length === 1 ? '' : 's'} today</p>
        </div>
        <div className="ml-auto text-sm text-slate-500">
          <span className="font-medium text-brand-600">{todayLabel()}</span> · {weekdayLabel()}
        </div>
      </Card>

      {/* Schedule list */}
      <Card className="overflow-hidden">
        {slots.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-slate-800">No appointments scheduled</p>
            <p className="mt-1 text-sm text-slate-600">{provider.name} has no appointments today.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => setPanelApptId(slot.appointmentId)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-brand-50/50 transition-colors text-left group"
              >
                <div className="w-16 flex-shrink-0">
                  <p className="text-sm font-mono font-medium text-slate-500">{slot.time}</p>
                </div>
                <div className="w-1 h-8 rounded-full bg-brand-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 group-hover:text-brand-700 transition-colors">{slot.patientName}</p>
                  <p className="text-sm text-slate-500">{slot.visitType}</p>
                </div>
                {patientSummaries[slot.appointmentId] && (
                  <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-lg font-medium flex-shrink-0">
                    AI Summary
                  </span>
                )}
                <svg className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors flex-shrink-0" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Side panel */}
      <SidePanel
        isOpen={!!panelApptId}
        onClose={() => setPanelApptId(null)}
        title={panelAppt ? `${panelAppt.patientName} · ${panelAppt.time}` : ''}
      >
        {panelAppt && (
          <div className="space-y-5">
            {/* Visit info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Visit Type</p>
                  <p className="font-medium text-slate-700">{panelAppt.visitType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Time</p>
                  <p className="font-medium text-slate-700">{panelAppt.time}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Provider</p>
                  <p className="font-medium text-slate-700">{provider.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Date</p>
                  <p className="font-medium text-slate-700">{todayLabel()}</p>
                </div>
              </div>
            </div>

            {summary ? (
              <>
                {/* AI Summary */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2C4.24 2 2 4.24 2 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M5 7h4M7 5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">AI Patient Summary</p>
                  </div>
                  <div className="p-4 bg-brand-50 rounded-xl border border-brand-100 text-sm text-slate-700 leading-relaxed">
                    {summary.aiSummary}
                  </div>
                </div>

                {/* Collapsible data sections */}
                <Collapsible title="Recent Labs" defaultOpen>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-1.5 pr-4 text-xs text-slate-400">Test</th>
                        <th className="text-left py-1.5 pr-4 text-xs text-slate-400">Result</th>
                        <th className="text-left py-1.5 text-xs text-slate-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentLabs.map((lab, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-4 font-medium text-slate-700">{lab.test}</td>
                          <td className="py-2 pr-4 font-mono text-brand-700">{lab.result}</td>
                          <td className="py-2 text-slate-400">{lab.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Collapsible>

                <Collapsible title="Recent Encounters">
                  {summary.recentEncounters.map((enc, i) => (
                    <div key={i} className="py-2 border-b border-slate-100 last:border-0">
                      <p className="text-xs text-brand-600 font-medium mb-0.5">{enc.date}</p>
                      <p className="text-slate-600">{enc.note}</p>
                    </div>
                  ))}
                </Collapsible>

                <Collapsible title="Medication Changes">
                  {summary.medicationChanges.map((med, i) => (
                    <div key={i} className="py-2 border-b border-slate-100 last:border-0">
                      <p className="text-xs text-brand-600 font-medium mb-0.5">{med.date}</p>
                      <p className="text-slate-600">{med.change}</p>
                    </div>
                  ))}
                </Collapsible>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">No AI summary available for this appointment.</p>
              </div>
            )}
          </div>
        )}
      </SidePanel>
    </div>
  );
}
