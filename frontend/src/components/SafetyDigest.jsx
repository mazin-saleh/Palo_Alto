export default function SafetyDigest({ digest }) {
  if (!digest) return null;

  const config = {
    elevated: {
      bg: 'bg-coral-light',
      border: 'border-coral/15',
      iconColor: 'text-coral',
      label: 'Stay Alert',
      labelColor: 'text-coral',
      dot: 'bg-coral',
    },
    moderate: {
      bg: 'bg-amber-50',
      border: 'border-amber-200/40',
      iconColor: 'text-terracotta',
      label: 'Some Activity Nearby',
      labelColor: 'text-terracotta',
      dot: 'bg-amber-500',
    },
    all_clear: {
      bg: 'bg-sage-light',
      border: 'border-sage/15',
      iconColor: 'text-sage',
      label: 'All Clear',
      labelColor: 'text-sage',
      dot: 'bg-sage',
    },
  };

  const c = config[digest.safety_level] || config.all_clear;
  const alertCount = digest.active_alerts?.length || 0;

  return (
    <div
      className={`relative rounded-2xl border ${c.border} ${c.bg} px-6 py-5 mb-6 animate-fade-in-up`}
      role="status"
      aria-live="polite"
      aria-label={`Safety status: ${c.label}. ${alertCount} active alerts. ${digest.summary}`}
    >
      <div className="flex items-center gap-4">
        {/* Shield icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 40 44" className={`w-7 h-7 ${c.iconColor}`} aria-hidden="true">
            <path d="M20 3L5 10.5v9.5c0 9.5 6.4 18.4 15 21 8.6-2.6 15-11.5 15-21v-9.5L20 3z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            {digest.safety_level === 'all_clear' ? (
              <path d="M14 22l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            ) : (
              <>
                <path d="M20 15v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <circle cx="20" cy="28" r="1.5" fill="currentColor"/>
              </>
            )}
          </svg>
        </div>

        {/* Status text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-2 h-2 rounded-full ${c.dot}`} aria-hidden="true" />
            <h2 className={`text-lg font-display font-bold ${c.labelColor}`}>
              {c.label}
            </h2>
            {alertCount > 0 && digest.safety_level !== 'all_clear' && (
              <span className={`text-xs font-medium ${c.labelColor} opacity-70`}>
                · {alertCount} active
              </span>
            )}
          </div>
          <p className="text-sm text-stone leading-relaxed line-clamp-2">
            {digest.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
