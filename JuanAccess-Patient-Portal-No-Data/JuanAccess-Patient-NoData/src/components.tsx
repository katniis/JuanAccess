import React, { useState, useEffect, useRef } from 'react';
import type { StatusVariant } from './types';

// ─── Brand Logo ───────────────────────────────────────────────────────────────

export function BrandLogo({
  className = '',
  portal,
}: {
  className?: string;
  portal?: string;
}) {
  return (
    <div className={className}>
      <img
        src="/juanaccess-logo.svg"
        alt="JuanAccess"
        className="block h-auto w-full"
      />
      {portal && <p className="mt-1 text-sm text-slate-600">{portal}</p>}
    </div>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

const pillStyles: Record<StatusVariant, string> = {
  approved:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending:      'bg-amber-100 text-amber-700 border-amber-200',
  denied:       'bg-red-100 text-red-700 border-red-200',
  active:       'bg-sky-100 text-sky-700 border-sky-200',
  offered:      'bg-violet-100 text-violet-700 border-violet-200',
  waitlisted:   'bg-slate-100 text-slate-700 border-slate-200',
  flagged:      'bg-orange-100 text-orange-700 border-orange-200',
  'not-required': 'bg-slate-100 text-slate-700 border-slate-200',
  drafted:      'bg-blue-100 text-blue-700 border-blue-200',
  submitted:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  info:         'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const pillDots: Record<StatusVariant, string> = {
  approved:     'bg-emerald-500',
  pending:      'bg-amber-500',
  denied:       'bg-red-500',
  active:       'bg-sky-500',
  offered:      'bg-violet-500',
  waitlisted:   'bg-slate-400',
  flagged:      'bg-orange-500',
  'not-required': 'bg-slate-300',
  drafted:      'bg-blue-500',
  submitted:    'bg-indigo-500',
  info:         'bg-cyan-500',
};

const pillLabels: Record<string, string> = {
  'not-required': 'Not Required',
  'needs-draft':  'Needs Draft',
};

export function StatusPill({ status, label }: { status: StatusVariant; label?: string }) {
  const displayLabel = label ?? pillLabels[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${pillStyles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${pillDots[status]}`} aria-hidden="true" />
      {displayLabel}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'min-h-11 inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  const variants = {
    primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-500 shadow-sm',
    secondary: 'bg-white text-brand-700 border border-brand-200 hover:bg-brand-50 active:bg-brand-100 focus-visible:ring-brand-400',
    ghost:     'text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-slate-400',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
    outline:   'border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:ring-slate-400',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ className = '', children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  const handleKeyDown = onClick
    ? (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

export function StatCard({
  title, value, subtitle, icon, accent = false, onClick, actionLabel = 'View',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: boolean;
  onClick?: () => void;
  actionLabel?: string;
}) {
  return (
    <Card
      onClick={onClick}
      className={`p-6 flex items-start gap-4 text-left transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2' : ''
      } ${accent ? 'bg-brand-600 border-brand-700' : ''}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${accent ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-semibold ${accent ? 'text-brand-100' : 'text-slate-700'}`}>{title}</p>
          {onClick && (
            <span className={`text-sm font-semibold ${accent ? 'text-white' : 'text-brand-700'}`}>
              {actionLabel} →
            </span>
          )}
        </div>
        <p className={`text-2xl font-semibold mt-0.5 leading-none ${accent ? 'text-white' : 'text-slate-800'}`}>{value}</p>
        {subtitle && <p className={`text-sm mt-2 ${accent ? 'text-brand-100' : 'text-slate-600'}`}>{subtitle}</p>}
      </div>
    </Card>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const isDone    = i < current;
        const isCurrent = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all
                ${isDone    ? 'bg-brand-600 border-brand-600 text-white' : ''}
                ${isCurrent ? 'bg-white border-brand-600 text-brand-600' : ''}
                ${!isDone && !isCurrent ? 'bg-white border-slate-200 text-slate-400' : ''}
              `}>
                {isDone ? <CheckIcon /> : i + 1}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${isCurrent ? 'text-brand-600' : isDone ? 'text-slate-500' : 'text-slate-300'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 mx-2 min-w-[2rem] ${isDone ? 'bg-brand-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

export function CountdownTimer({ initialSeconds }: { initialSeconds: number }) {
  const [secs, setSecs] = useState(initialSeconds);

  useEffect(() => {
    if (secs <= 0) return;
    const id = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [secs]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const urgent = secs < 3600;

  const fmt = (n: number) => String(n).padStart(2, '0');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-mono font-medium border
      ${urgent ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="9" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 6v3l2 1M6 2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {h > 0 && <span>{fmt(h)}h </span>}
      <span>{fmt(m)}m {fmt(s)}s</span>
      <span className="text-xs font-sans font-medium ml-0.5">remaining</span>
    </span>
  );
}

// ─── Side Panel / Drawer ──────────────────────────────────────────────────────

export function SidePanel({
  isOpen, onClose, title, width = 520, children,
}: {
  isOpen: boolean; onClose: () => void; title: string; width?: number; children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className="relative bg-white shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
        style={{ width: Math.min(width, window.innerWidth) }}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-semibold text-slate-800 text-base">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Section Collapse ─────────────────────────────────────────────────────────

export function Collapsible({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="px-4 py-3 text-sm text-slate-600 space-y-2">{children}</div>}
    </div>
  );
}

// ─── Drag-and-Drop Upload Zone ────────────────────────────────────────────────

export function DropZone({ onFile, fileName }: {
  onFile: (name: string) => void; fileName: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file.name);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragEnter={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-150 p-10 flex flex-col items-center justify-center text-center
        ${dragging ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/40'}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f.name); }}
      />
      {fileName ? (
        <>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </div>
          <p className="font-medium text-slate-700">{fileName}</p>
          <p className="text-sm text-slate-400 mt-1">Click to replace</p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 text-2xl mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-medium text-slate-700">Drop your bill here</p>
          <p className="text-sm text-slate-400 mt-1">or click to browse — PDF, JPG, PNG supported</p>
        </>
      )}
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description }: {
  icon: string; title: string; description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-medium text-slate-600">{title}</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>
    </div>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────

export function SearchInput({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
      />
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

export function TabBar<T extends string>({
  tabs, active, onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
            active === t.id
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t.label}
          {t.count != null && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              active === t.id ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-500'
            }`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export function Textarea({ value, onChange, rows = 6, className = '' }: {
  value: string; onChange: (v: string) => void; rows?: number; className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition ${className}`}
    />
  );
}
