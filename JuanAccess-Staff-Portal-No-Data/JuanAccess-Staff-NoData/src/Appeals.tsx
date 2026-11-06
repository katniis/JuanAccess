import { useEffect, useState } from 'react';
import type { AppView, StatusVariant } from './types';
import { usePortal } from './store';
import type { AppealCard } from './types';
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

export default function Appeals({ setView: _setView }: { setView: (v: AppView) => void }) {
  const { appeals: cards, submitAppeal: submitToStore, focus, clearFocus } = usePortal();
  const [activeTab, setActiveTab] = useState<Tab>('needs-draft');
  const [selectedCard, setSelectedCard] = useState<AppealCard | null>(null);
  const [draftLetter, setDraftLetter]   = useState('');

  const filtered = cards.filter(c => c.status === activeTab);

  const tabsWithCount = tabs.map(t => ({
    ...t,
    count: cards.filter(c => c.status === t.id).length,
  }));

  const openCard = (card: AppealCard) => {
    setSelectedCard(card);
    setDraftLetter(card.draftedLetter);
  };

  const submitAppeal = (card: AppealCard) => {
    submitToStore(card.id, draftLetter);
    setSelectedCard(null);
  };

  // Opened from a notification: jump to that appeal.
  useEffect(() => {
    if (focus?.view !== 'appeals') return;
    const card = cards.find(c => c.id === focus.refId);
    if (card) {
      setActiveTab(card.status);
      setSelectedCard(card);
      setDraftLetter(card.draftedLetter);
    }
    clearFocus();
  }, [focus, cards, clearFocus]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Appeals Queue"
        subtitle="Manage insurance denial appeals with clinical justification"
      />

      <div className="mb-5">
        <TabBar tabs={tabsWithCount} active={activeTab} onChange={setActiveTab} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="mx-auto mb-3 h-9 w-9 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v18M5 7h14M7 7l-4 7h8L7 7ZM17 7l-4 7h8l-4-7Z" />
          </svg>
          <p className="font-medium text-slate-500">No appeals in this stage</p>
          <p className="text-sm mt-1">Appeals will appear here as they are created or advance.</p>
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
              {card.denialReason && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 px-2 py-1 rounded-lg border border-red-100 line-clamp-2">
                  {card.denialReason}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Detail side panel */}
      <SidePanel
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        title={selectedCard ? `${selectedCard.patientName} · Appeal` : ''}
        width={600}
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
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Insurer</p>
                <p className="font-medium text-slate-700">{selectedCard.insurer}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Denial Reason</p>
                <p className="font-medium text-red-600">{selectedCard.denialReason}</p>
              </div>
            </div>

            {/* Section 1: Matched Clinical Guideline */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</div>
                <p className="text-sm font-semibold text-slate-700">Matched Clinical Guideline</p>
              </div>
              <blockquote className="border-l-4 border-emerald-400 pl-4 py-2 bg-emerald-50 rounded-r-xl text-sm text-slate-700 leading-relaxed italic">
                {selectedCard.clinicalGuideline}
              </blockquote>
            </div>

            {/* Section 2: Chart Justification */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">2</div>
                <p className="text-sm font-semibold text-slate-700">Chart Justification</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 leading-relaxed">
                {selectedCard.chartJustification}
              </div>
            </div>

            {/* Section 3: Draft Appeal Letter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">3</div>
                <p className="text-sm font-semibold text-slate-700">Drafted Appeal Letter</p>
              </div>
              <Textarea value={draftLetter} onChange={setDraftLetter} rows={12} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button className="flex-1" onClick={() => submitAppeal(selectedCard)}>
                Submit Appeal
              </Button>
              <Button variant="secondary">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v9m0 0L5.5 8.5M8 11l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Download
              </Button>
              <Button variant="ghost" onClick={() => setSelectedCard(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
