import { useEffect, useState } from 'react';
import type { AppView } from './types';
import { usePortal, ELEVATED_STAFF } from './store';
import type { PriorAuthCard } from './types';
import { StatusPill, Card, Button, SidePanel, TabBar, Textarea, PageHeader } from './components';

type Tab = 'needs-draft' | 'drafted' | 'submitted' | 'approved' | 'denied';

const tabs: { id: Tab; label: string }[] = [
  { id: 'needs-draft', label: 'Needs Draft' },
  { id: 'drafted',     label: 'Drafted' },
  { id: 'submitted',   label: 'Submitted' },
  { id: 'approved',    label: 'Approved' },
  { id: 'denied',      label: 'Denied' },
];

const tabToStatus: Record<Tab, StatusVariant> = {
  'needs-draft': 'pending',
  drafted:       'drafted',
  submitted:     'submitted',
  approved:      'approved',
  denied:        'denied',
};

import type { StatusVariant } from './types';

export default function PriorAuth({ setView: _setView }: { setView: (v: AppView) => void }) {
  const { priorAuth: cards, advancePriorAuth, focus, clearFocus } = usePortal();
  const [activeTab, setActiveTab] = useState<Tab>('needs-draft');
  const [selectedCard, setSelectedCard] = useState<PriorAuthCard | null>(null);
  const [justification, setJustification] = useState('');
  const isElevatedStaff = ELEVATED_STAFF;

  const filtered = cards.filter(c => c.status === activeTab);

  const tabsWithCount = tabs.map(t => ({
    ...t,
    count: cards.filter(c => c.status === t.id).length,
  }));

  const openCard = (card: PriorAuthCard) => {
    setSelectedCard(card);
    setJustification(card.justification);
  };

  const saveAndAdvance = (card: PriorAuthCard, newStatus: PriorAuthCard['status']) => {
    advancePriorAuth(card.id, newStatus, justification);
    setSelectedCard(null);
  };

  // Opened from a notification: jump to that case.
  useEffect(() => {
    if (focus?.view !== 'prior-auth') return;
    const card = cards.find(c => c.id === focus.refId);
    if (card) {
      setActiveTab(card.status);
      setSelectedCard(card);
      setJustification(card.justification);
    }
    clearFocus();
  }, [focus, cards, clearFocus]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Prior Authorization Queue"
        subtitle="Track and manage authorization requests across all stages"
      />

      <div className="mb-5">
        <TabBar tabs={tabsWithCount} active={activeTab} onChange={setActiveTab} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="mx-auto mb-3 h-9 w-9 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6M8 13h8M8 17h5" />
          </svg>
          <p className="font-medium text-slate-500">No cases in this stage</p>
          <p className="text-sm mt-1">Cases will appear here as they move through the queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(card => (
            <Card
              key={card.id}
              className="p-4 cursor-pointer hover:border-brand-200 hover:shadow-md transition-all group"
              onClick={() => openCard(card)}
            >
              <div className="flex items-start justify-between mb-3">
                <StatusPill status={tabToStatus[activeTab]} label={
                  activeTab === 'needs-draft' ? 'Needs Draft' :
                  activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
                } />
                <svg className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-semibold text-slate-800 mb-0.5">{card.patientName}</p>
              <p className="text-sm text-slate-500 mb-3">{card.visitType}</p>
              <div className="text-xs text-slate-400 space-y-0.5">
                <p>DOB: {card.dob}</p>
                <p>Insurer: {card.insurer}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail side panel */}
      <SidePanel
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        title={selectedCard ? `${selectedCard.patientName} · ${selectedCard.visitType}` : ''}
        width={560}
      >
        {selectedCard && (
          <div className="space-y-5">
            {/* Patient info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Patient</p>
                <p className="font-medium text-slate-700">{selectedCard.patientName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">DOB</p>
                <p className="font-medium text-slate-700">{selectedCard.dob}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Visit Type</p>
                <p className="font-medium text-slate-700">{selectedCard.visitType}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Insurer</p>
                <p className="font-medium text-slate-700">{selectedCard.insurer}</p>
              </div>
            </div>

            {/* Justification editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Clinical Justification</p>
                <StatusPill status={tabToStatus[activeTab]} label={
                  activeTab === 'needs-draft' ? 'Needs Draft' :
                  activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
                } />
              </div>
              <Textarea
                value={justification}
                onChange={setJustification}
                rows={8}
              />
              {justification.length < 50 && (
                <p className="text-xs text-amber-600 mt-1.5">Justification should be at least 50 characters for submission.</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              {selectedCard.status === 'needs-draft' && (
                <Button
                  className="flex-1"
                  onClick={() => saveAndAdvance(selectedCard, 'drafted')}
                  disabled={justification.length < 50}
                >
                  Save as Draft
                </Button>
              )}
              {selectedCard.status === 'drafted' && (
                <Button
                  className="flex-1"
                  onClick={() => saveAndAdvance(selectedCard, 'submitted')}
                  disabled={!isElevatedStaff || justification.length < 50}
                  title={!isElevatedStaff ? 'Requires elevated staff permissions to submit' : ''}
                >
                  {!isElevatedStaff && (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="10" width="14" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  )}
                  Submit to Insurer
                </Button>
              )}
              {!isElevatedStaff && selectedCard.status === 'drafted' && (
                <p className="text-xs text-slate-400 self-center">Submission requires elevated permissions</p>
              )}
              <Button variant="ghost" onClick={() => setSelectedCard(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
