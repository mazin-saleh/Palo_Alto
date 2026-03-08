import { useState, useEffect, useRef } from 'react';
import { resolveIncident, fetchCircles, broadcastStatus, fetchResources, fetchIncident } from '../api';
import { useToast } from './Toast';
import { SEVERITY_COLORS, CATEGORY_ICONS, SEVERITY_BG_LIGHT } from '../utils/constants';
import { timeAgo } from '../utils/constants';

export default function IncidentDetail({ incident, onClose, onUpdated, currentUserId = 'USR-001' }) {
  const [circles, setCircles] = useState([]);
  const [shareCircleId, setShareCircleId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [resources, setResources] = useState(null);
  const [correlatedIncidents, setCorrelatedIncidents] = useState([]);
  const panelRef = useRef(null);
  const addToast = useToast();

  useEffect(() => {
    if (incident) {
      setClosing(false);
      fetchCircles(currentUserId).then(setCircles).catch(() => {});

      // Fetch emergency resources
      fetchResources({
        zone: incident.location_zone,
        category: incident.incident_category,
      }).then(setResources).catch(() => {});

      // Fetch correlated incidents
      if (incident.correlated_incident_ids?.length > 0) {
        Promise.all(
          incident.correlated_incident_ids.slice(0, 3).map((id) =>
            fetchIncident(id).catch(() => null)
          )
        ).then((results) => setCorrelatedIncidents(results.filter(Boolean)));
      } else {
        setCorrelatedIncidents([]);
      }
    }
  }, [incident, currentUserId]);

  // Focus trap
  useEffect(() => {
    if (!incident) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusableEls = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) { e.preventDefault(); lastEl?.focus(); }
      } else {
        if (document.activeElement === lastEl) { e.preventDefault(); firstEl?.focus(); }
      }
    };

    panel.addEventListener('keydown', handleTab);
    firstEl?.focus();
    return () => panel.removeEventListener('keydown', handleTab);
  }, [incident]);

  if (!incident) return null;

  const sev = incident.severity || 'noise';
  const cat = incident.incident_category || 'Noise';
  const iconPath = CATEGORY_ICONS[cat];
  const title = incident.alert_title || cat;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 250);
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      const updated = await resolveIncident(incident.incident_id);
      addToast('Alert marked as resolved', 'success');
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      addToast(`Failed to resolve: ${err.message}`, 'error');
    } finally {
      setResolving(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      await broadcastStatus(shareCircleId, {
        sender_id: currentUserId,
        plaintext_message: `Safety alert: ${title} in ${incident.location_zone}`,
        linked_incident_id: incident.incident_id,
      });
      addToast('Alert shared with your circle', 'success');
      setShareCircleId('');
    } catch (err) {
      addToast(`Share failed: ${err.message}`, 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${closing ? 'pointer-events-none' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Alert detail: ${title}`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 slide-over-backdrop transition-opacity duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className={`absolute right-0 top-0 h-full w-full max-w-2xl bg-ivory overflow-y-auto shadow-warm-xl ${closing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-ivory/95 backdrop-blur-sm z-10 border-b border-sand/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {iconPath && (
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${SEVERITY_BG_LIGHT[sev] || 'bg-sand-light'} flex items-center justify-center`}>
                  <svg className={`w-5 h-5 ${sev === 'critical' ? 'text-coral' : sev === 'high' ? 'text-terracotta' : 'text-stone'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                  </svg>
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-display font-semibold text-ink truncate">{title}</h2>
                <p className="text-sm text-stone">{incident.location_zone} · {timeAgo(incident.timestamp)}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone hover:bg-parchment hover:text-ink transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Urgency bar */}
          <div className={`h-1 ${SEVERITY_COLORS[sev]?.split(' ')[0] || 'bg-pebble'}`} />
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Verified badge */}
          {incident.is_verified_incident === true && (
            <div className="flex items-center gap-2 text-sage">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-medium">Verified report</span>
            </div>
          )}

          {/* SECTION 1: What You Should Do (FIRST) */}
          {incident.actionable_checklist?.length > 0 && (
            <div className="animate-fade-in-up">
              <h3 className="text-lg font-display font-semibold text-ink mb-3">What You Should Do</h3>
              <div className="bg-white rounded-xl border border-sand/60 shadow-warm-sm divide-y divide-sand/40">
                {incident.actionable_checklist.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                    <div className="w-6 h-6 rounded-full bg-sage-light border border-sage/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-base text-ink">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: What Happened */}
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-lg font-display font-semibold text-ink mb-3">What Happened</h3>
            <div className="bg-white rounded-xl p-4 border-l-4 border-sand shadow-warm-sm">
              <p className="text-ink text-base leading-relaxed whitespace-pre-wrap italic">{incident.raw_text}</p>
            </div>
            <p className="text-sm text-stone mt-2">
              {incident.location_zone} · {new Date(incident.timestamp).toLocaleString()}
            </p>
          </div>

          {/* SECTION 3: Similar Reports Nearby */}
          {correlatedIncidents.length > 0 && (
            <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <h3 className="text-lg font-display font-semibold text-ink mb-3">Similar Reports Nearby</h3>
              <div className="space-y-2">
                {correlatedIncidents.map((rel) => (
                  <div key={rel.incident_id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-sand/60">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rel.severity === 'critical' ? 'bg-coral' : rel.severity === 'high' ? 'bg-terracotta' : 'bg-amber-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{rel.alert_title || rel.incident_category}</p>
                      <p className="text-xs text-stone">{rel.location_zone} · {timeAgo(rel.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {incident.correlated_incident_ids.length > 3 && (
                <p className="text-xs text-stone mt-2">+{incident.correlated_incident_ids.length - 3} more similar reports</p>
              )}
            </div>
          )}

          {/* SECTION 4: Verification Notice */}
          {incident.fake_news_indicators?.length > 0 && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/60 rounded-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-stone">This report hasn't been independently verified. Check official sources before acting on it.</p>
            </div>
          )}

          {/* SECTION 4.5: Emergency Resources */}
          {resources && (resources.category_specific?.length > 0 || resources.zone_specific?.length > 0) && (
            <div className="animate-fade-in-up" style={{ animationDelay: '220ms' }}>
              <h3 className="text-lg font-display font-semibold text-ink mb-3">Emergency Resources</h3>
              <div className="bg-white rounded-xl border border-sand/60 shadow-warm-sm divide-y divide-sand/40">
                {[...(resources.category_specific || []), ...(resources.zone_specific || [])].map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{r.name}</p>
                      <p className="text-sm text-stone">{r.description}</p>
                    </div>
                    {r.phone && (
                      <a
                        href={`tel:${r.phone}`}
                        className="flex-shrink-0 ml-3 px-3 py-2.5 min-h-[44px] flex items-center bg-sage-light text-sage text-sm font-medium rounded-lg hover:bg-sage hover:text-white transition-colors"
                      >
                        {r.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: Share with Circle */}
          {circles.length > 0 && (
            <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <h3 className="text-sm font-semibold text-stone mb-2">Share with Your Circle</h3>
              <div className="flex gap-2">
                <select
                  value={shareCircleId}
                  onChange={(e) => setShareCircleId(e.target.value)}
                  className="flex-1 text-sm px-3 py-2.5 bg-white border border-sand rounded-xl text-ink focus:outline-none focus:border-sage transition-colors"
                  aria-label="Select a circle to share with"
                >
                  <option value="">Select a group...</option>
                  {circles.map((c) => (
                    <option key={c.circle_id} value={c.circle_id}>{c.circle_name}</option>
                  ))}
                </select>
                <button
                  disabled={sharing || !shareCircleId}
                  onClick={handleShare}
                  className="text-sm px-5 py-2.5 bg-sage hover:bg-sage-dark text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {sharing ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </div>
          )}

          {/* SECTION 6: Mark as Resolved */}
          {incident.status !== 'resolved' && (
            <div className="pt-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="w-full py-3 bg-white border-2 border-sage text-sage text-base font-semibold rounded-xl hover:bg-sage hover:text-white transition-all duration-200 disabled:opacity-50"
              >
                {resolving ? 'Resolving...' : 'Mark as Resolved'}
              </button>
            </div>
          )}

          {incident.status === 'resolved' && (
            <div className="flex items-center justify-center gap-2 py-3 text-sage">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-base font-medium">This alert has been resolved</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
