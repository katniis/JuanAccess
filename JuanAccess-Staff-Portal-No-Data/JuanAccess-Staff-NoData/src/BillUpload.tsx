import { useState } from 'react';
import type { AppView } from './types';
import { billLineItems, sampleDisputeLetter } from './data';
import type { BillLineItem } from './types';
import { StatusPill, Card, Button, DropZone, PageHeader, Textarea } from './components';

export default function BillUpload({ setView: _setView }: { setView: (v: AppView) => void }) {
  const [fileName, setFileName]   = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed]   = useState(false);
  const [letter, setLetter]       = useState(sampleDisputeLetter);
  const [editingLetter, setEditingLetter] = useState(false);

  const handleFile = (name: string) => {
    setFileName(name);
    setAnalyzing(true);
    setAnalyzed(false);
    setExpanded(null);
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true); }, 1800);
  };

  const flaggedCount = billLineItems.filter(i => i.flagged).length;
  const total = billLineItems.reduce((sum, item) => sum + parseFloat(item.amount.replace('$', '')), 0);

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader title="Upload & Dispute a Bill" subtitle="We'll extract and review your bill for potential issues" />

      <DropZone onFile={handleFile} fileName={fileName} />

      {analyzing && (
        <div className="mt-6 p-5 bg-brand-50 border border-brand-200 rounded-2xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-brand-700">Analyzing your bill…</p>
            <p className="text-xs text-brand-500 mt-0.5">Extracting line items and checking for common billing issues</p>
          </div>
        </div>
      )}

      {analyzed && billLineItems.length === 0 && (
        <Card className="mt-6 p-6 text-center">
          <p className="font-semibold text-slate-800">No billing details found</p>
          <p className="mt-1 text-sm text-slate-600">We couldn't find any line items in this file. Try uploading a clearer copy of your bill.</p>
          <Button className="mt-4" size="sm" variant="secondary" onClick={() => { setFileName(null); setAnalyzed(false); }}>
            Upload another file
          </Button>
        </Card>
      )}

      {analyzed && billLineItems.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Line Items</p>
              <p className="text-2xl font-semibold text-slate-800">{billLineItems.length}</p>
            </Card>
            <Card className={`p-4 text-center ${flaggedCount > 0 ? 'bg-orange-50 border-orange-200' : ''}`}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${flaggedCount > 0 ? 'text-orange-400' : 'text-slate-400'}`}>Flagged</p>
              <p className={`text-2xl font-semibold ${flaggedCount > 0 ? 'text-orange-600' : 'text-slate-800'}`}>{flaggedCount}</p>
              {flaggedCount > 0 && <p className="text-xs text-orange-400 mt-0.5">Review needed</p>}
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Billed</p>
              <p className="text-2xl font-semibold text-slate-800">${total.toFixed(2)}</p>
            </Card>
          </div>

          {/* Line items table */}
          <Card className="mt-5 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-slate-800 text-sm">Extracted Line Items</p>
              <p className="text-xs text-slate-400">Click a row to see details</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Description', 'Code', 'Amount', 'Flag'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {billLineItems.map((item: BillLineItem) => (
                  <>
                    <tr
                      key={item.id}
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className={`cursor-pointer transition-colors border-b border-slate-100 last:border-0
                        ${item.flagged ? 'bg-orange-50/40 hover:bg-orange-50' : 'hover:bg-slate-50'}
                        ${expanded === item.id ? (item.flagged ? 'bg-orange-50' : 'bg-slate-50') : ''}
                      `}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <svg
                            className={`w-3.5 h-3.5 text-slate-300 transition-transform flex-shrink-0 ${expanded === item.id ? 'rotate-90' : ''}`}
                            viewBox="0 0 12 12" fill="none"
                          >
                            <path d="M4 3l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-slate-700 font-medium">{item.description}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{item.code}</code>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-700">{item.amount}</td>
                      <td className="px-5 py-3.5">
                        {item.flagged ? (
                          <StatusPill status="flagged" label="Flagged" />
                        ) : (
                          <StatusPill status="approved" label="OK" />
                        )}
                      </td>
                    </tr>
                    {expanded === item.id && (
                      <tr key={`${item.id}-exp`} className={item.flagged ? 'bg-orange-50' : 'bg-slate-50'}>
                        <td colSpan={4} className="px-5 py-3.5 pb-5">
                          <div className={`text-sm leading-relaxed p-4 rounded-xl border ${item.flagged ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <p className="font-semibold mb-1 text-xs uppercase tracking-wider text-slate-400">Plain-Language Explanation</p>
                            {item.explanation}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Drafted dispute letter */}
          {flaggedCount > 0 && (
            <Card className="mt-5 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Drafted Dispute Letter</p>
                  <p className="text-xs text-slate-400 mt-0.5">Auto-generated based on flagged items — review before sending</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingLetter(e => !e)}>
                    {editingLetter ? 'Done Editing' : 'Edit'}
                  </Button>
                  <Button size="sm">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v9m0 0L5.5 8.5M8 11l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Download
                  </Button>
                </div>
              </div>

              {editingLetter ? (
                <Textarea value={letter} onChange={setLetter} rows={14} />
              ) : (
                <pre className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 rounded-xl border border-slate-200 p-5 max-h-64 overflow-y-auto">
                  {letter}
                </pre>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
