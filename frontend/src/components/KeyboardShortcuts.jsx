import { useEffect, useRef } from 'react';

const SHORTCUTS = [
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close dialog / panel' },
  { key: 'h', description: 'Go to Home' },
  { key: 'a', description: 'Go to Analytics' },
  { key: 'r', description: 'Report an incident' },
  { key: '/', description: 'Focus search (Incidents page)' },
];

export default function KeyboardShortcuts({ open, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative bg-ivory rounded-2xl border border-sand/60 shadow-warm-xl p-6 w-full max-w-sm animate-fade-in-up"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display font-semibold text-ink">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-stone hover:bg-parchment hover:text-ink transition-colors" aria-label="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-ink">{s.description}</span>
              <kbd className="px-2.5 py-1 bg-parchment border border-sand rounded-lg text-xs font-mono text-stone font-medium min-w-[28px] text-center">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
