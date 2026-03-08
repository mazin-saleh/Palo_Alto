import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDigest, fetchIncidents, fetchResources } from '../api';
import SafetyDigest from '../components/SafetyDigest';
import IncidentCard from '../components/IncidentCard';
import IncidentDetail from '../components/IncidentDetail';

export default function DashboardPage() {
  const [digest, setDigest] = useState(null);
  const [resolved, setResolved] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [digestData, resolvedData] = await Promise.all([
        fetchDigest(),
        fetchIncidents({ status: 'resolved', hide_noise: true }),
      ]);
      setDigest(digestData);
      setResolved(resolvedData.slice(0, 10));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    fetchResources().then((r) => setEmergencyContacts(r.general || [])).catch(() => {});
  }, [loadData]);

  const handleIncidentUpdated = (updated) => {
    setSelectedIncident(updated);
    loadData();
  };

  const activeAlerts = digest?.active_alerts || [];

  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, noise: 4 };
  const sortedAlerts = [...activeAlerts].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5));
  const urgentAlerts = sortedAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  const otherAlerts = sortedAlerts.filter(a => a.severity !== 'critical' && a.severity !== 'high');

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl">
      {/* Header row */}
      <div className="flex items-end justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">
            {(() => {
              const h = new Date().getHours();
              if (h < 12) return 'Good morning';
              if (h < 17) return 'Good afternoon';
              return 'Good evening';
            })()}
          </h1>
          <p className="text-stone text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/incidents', { state: { openForm: true } })}
          className="px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-warm-sm hover:shadow-warm active:scale-[0.98]"
          aria-label="Report a safety concern"
        >
          Report
        </button>
      </div>

      {/* Safety Status */}
      {loading ? (
        <div className="skeleton h-20 rounded-2xl mb-6" />
      ) : (
        <SafetyDigest digest={digest} />
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }} aria-label="Active safety alerts">
          {/* Urgent Alerts */}
          {urgentAlerts.length > 0 && (
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-lg font-display font-semibold text-ink mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-coral animate-pulse" />
                Requires Your Attention
              </h2>
              <div className="space-y-3">
                {/* Featured Alert Card */}
                {(() => {
                  const featured = urgentAlerts[0];
                  const bgClass = featured.severity === 'critical' ? 'bg-coral-light' : 'bg-terracotta-light';
                  return (
                    <div className={`${bgClass} rounded-2xl p-6 border border-sand/60 shadow-warm-sm`}>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-semibold text-ink">{featured.alert_title || featured.incident_category}</h3>
                        <span className="text-xs font-medium text-coral uppercase tracking-wide">{featured.severity}</span>
                      </div>
                      {featured.location_zone && (
                        <p className="text-sm text-stone mb-3">{featured.location_zone} · {featured.incident_category}</p>
                      )}
                      {featured.raw_text && (
                        <p className="text-sm text-ink/70 mb-4 line-clamp-2">{featured.raw_text}</p>
                      )}
                      <button
                        onClick={() => setSelectedIncident(featured)}
                        className="bg-sage text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-sage-dark transition-colors"
                      >
                        Take Action
                      </button>
                    </div>
                  );
                })()}
                {/* Remaining urgent alerts */}
                {urgentAlerts.slice(1).map((inc, i) => (
                  <IncidentCard
                    key={inc.incident_id}
                    incident={inc}
                    onClick={setSelectedIncident}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Alerts */}
          {otherAlerts.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-stone mb-3">Monitoring</h2>
              <div className="space-y-3">
                {otherAlerts.map((inc, i) => (
                  <IncidentCard
                    key={inc.incident_id}
                    incident={inc}
                    onClick={setSelectedIncident}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recently Resolved */}
      {resolved.length > 0 && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => setShowResolved(!showResolved)}
            aria-expanded={showResolved}
            className="flex items-center gap-2 text-sm text-stone hover:text-ink transition-colors mb-3"
          >
            <svg className={`w-4 h-4 transition-transform ${showResolved ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {resolved.length} resolved recently
          </button>

          {showResolved && (
            <div className="space-y-3 animate-fade-in-up">
              {resolved.map((inc, i) => (
                <IncidentCard
                  key={inc.incident_id}
                  incident={inc}
                  onClick={setSelectedIncident}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Emergency Contacts */}
      {emergencyContacts.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <button
            onClick={() => setShowEmergency(!showEmergency)}
            aria-expanded={showEmergency}
            className="flex items-center gap-2 text-sm text-stone hover:text-ink transition-colors mb-3"
          >
            <svg className={`w-4 h-4 transition-transform ${showEmergency ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Emergency Contacts
          </button>

          {showEmergency && (
            <div className="bg-white rounded-xl border border-sand/60 shadow-warm-sm divide-y divide-sand/40 animate-fade-in-up">
              {emergencyContacts.slice(0, 6).map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{r.name}</p>
                    <p className="text-sm text-stone">{r.description}</p>
                  </div>
                  {r.phone && (
                    <a
                      href={`tel:${r.phone}`}
                      aria-label={`Call ${r.name}: ${r.phone}`}
                      className="shrink-0 ml-3 px-3 py-2 bg-sage-light text-sage text-sm font-medium rounded-lg hover:bg-sage hover:text-white transition-colors"
                    >
                      {r.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && activeAlerts.length === 0 && resolved.length === 0 && (
        <div className="text-center py-12 animate-fade-in-up">
          <svg viewBox="0 0 40 44" className="w-14 h-14 text-sage/30 mx-auto mb-4" aria-hidden="true">
            <path d="M20 3L5 10.5v9.5c0 9.5 6.4 18.4 15 21 8.6-2.6 15-11.5 15-21v-9.5L20 3z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 22l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <p className="text-stone">No reports yet</p>
          <p className="text-pebble text-sm mt-1">Your community safety feed will appear here.</p>
        </div>
      )}

      {/* Detail slide-over */}
      <IncidentDetail
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdated={handleIncidentUpdated}
      />
    </div>
  );
}
