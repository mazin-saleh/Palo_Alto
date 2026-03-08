import { SEVERITY_BORDER, SEVERITY_BG_LIGHT, SEVERITY_COLORS, CATEGORY_ICONS } from '../utils/constants';
import { timeAgo } from '../utils/constants';

export default function IncidentCard({ incident, onClick, index = 0 }) {
  const sev = incident.severity || 'noise';
  const cat = incident.incident_category || 'Noise';
  const iconPath = CATEGORY_ICONS[cat];
  const title = incident.alert_title || cat;
  const isResolved = incident.status === 'resolved';
  const cardBg = (sev === 'critical' || sev === 'high') && !isResolved ? (SEVERITY_BG_LIGHT[sev] || 'bg-white') : 'bg-white';

  // Screen reader description
  const srDescription = `${title}, ${sev} severity, ${incident.location_zone}, ${timeAgo(incident.timestamp)}${isResolved ? ', resolved' : ''}${incident.is_verified_incident ? ', verified' : ''}`;

  return (
    <div
      onClick={() => onClick(incident)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(incident)}
      aria-label={srDescription}
      className={`group ${cardBg} border-l-4 ${isResolved ? 'border-sage/40' : (SEVERITY_BORDER[sev] || 'border-sand')} rounded-xl p-5 cursor-pointer shadow-warm-sm hover:shadow-warm-lg hover:-translate-y-0.5 transition-all duration-300 border border-sand/60 animate-fade-in-up min-h-18 ${isResolved ? 'opacity-75' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Category Icon */}
        {iconPath && (
          <div className={`shrink-0 w-10 h-10 rounded-xl ${isResolved ? 'bg-sage-light' : (SEVERITY_BG_LIGHT[sev] || 'bg-sand-light')} flex items-center justify-center`} aria-hidden="true">
            <svg className={`w-5 h-5 ${isResolved ? 'text-sage' : sev === 'critical' ? 'text-coral' : sev === 'high' ? 'text-terracotta' : 'text-stone'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-base font-display font-semibold text-ink group-hover:text-sage transition-colors truncate" aria-hidden="true">
                {title}
              </h3>
              {isResolved ? (
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-sage-light text-sage" aria-hidden="true">
                  Resolved
                </span>
              ) : sev !== 'noise' ? (
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[sev]}`} aria-hidden="true">
                  {sev.toUpperCase()}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {incident.is_verified_incident === true && (
                <span className="text-sage" aria-hidden="true">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
              )}
            </div>
          </div>

          {/* Location + time */}
          <div className="text-sm text-stone" aria-hidden="true">
            {incident.location_zone} · {timeAgo(incident.timestamp)}
          </div>

          {/* Misinformation flag */}
          {incident.fake_news_indicators?.length > 0 && (
            <p className="text-xs text-amber-600 mt-1" aria-hidden="true">Unverified — treat with caution</p>
          )}
        </div>
      </div>
    </div>
  );
}
