import { useState, useEffect } from 'react';
import { fetchAnalytics } from '../api';
import { SEVERITY_DOT, SEVERITY_TEXT, CATEGORY_ICONS, CATEGORY_LABELS } from '../utils/constants';

const SCORE_COLORS = {
  safe: { ring: '#22c55e', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  caution: { ring: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  danger: { ring: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

function ScoreRing({ score, level, size = 80 }) {
  const colors = SCORE_COLORS[level] || SCORE_COLORS.safe;
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={colors.ring} strokeWidth="6"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="transform rotate-90 origin-center"
        fill={colors.ring} fontSize="18" fontWeight="700"
      >
        {score}
      </text>
    </svg>
  );
}

const TREND_ARROWS = {
  worsening: '↑',
  improving: '↓',
  stable: '→',
};

const TREND_COLORS = {
  worsening: 'text-coral',
  improving: 'text-sage',
  stable: 'text-stone',
};

function DonutChart({ data, size = 160 }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-stone text-sm">No data</p>;

  const colors = {
    critical: '#ef4444',
    high: '#e87040',
    medium: '#f59e0b',
    low: '#0ea5e9',
    noise: '#9ca3af',
  };

  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  let currentOffset = 0;
  const segments = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === 0) continue;
    const pct = value / total;
    const dashLength = pct * circumference;
    segments.push(
      <circle
        key={key}
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={colors[key] || '#9ca3af'}
        strokeWidth="20"
        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
        strokeDashoffset={-currentOffset}
        className="transition-all duration-700"
      />
    );
    currentOffset += dashLength;
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
        {segments}
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          className="transform rotate-90 origin-center"
          fill="#374151" fontSize="22" fontWeight="700"
        >
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {Object.entries(data).map(([key, value]) => value > 0 && (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${SEVERITY_DOT[key]}`} />
            <span className="text-sm text-ink capitalize">{key}</span>
            <span className="text-sm text-stone font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">
        <div className="skeleton h-8 w-48 mb-6 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto text-center">
        <p className="text-stone">Failed to load analytics.</p>
      </div>
    );
  }

  const zones = data.zone_scores || {};
  const catDist = data.category_distribution || [];
  const sevBreak = data.severity_breakdown || {};
  const methodRatio = data.analysis_method_ratio || {};
  const trending = data.trending_threats || [];
  const correlations = data.cross_zone_correlations || [];
  const maxCatCount = Math.max(...catDist.map(c => c.count), 1);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-display font-bold text-ink mb-1">Threat Intelligence</h1>
        <p className="text-stone">Real-time analytics across all sectors</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-8 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'zones', label: 'Zones' },
          { key: 'intelligence', label: 'Intelligence' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-sage text-white'
                : 'bg-white text-stone border border-sand/60 hover:bg-sand-light'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <div className="bg-white rounded-2xl border border-sand/60 p-5 shadow-warm-sm">
              <p className="text-sm text-stone mb-1">Total Reports</p>
              <p className="text-3xl font-display font-bold text-ink">{data.total_incidents}</p>
            </div>
            <div className="bg-white rounded-2xl border border-sand/60 p-5 shadow-warm-sm">
              <p className="text-sm text-stone mb-1">Active Alerts</p>
              <p className="text-3xl font-display font-bold text-coral">{data.active_incidents}</p>
            </div>
            <div className="bg-white rounded-2xl border border-sand/60 p-5 shadow-warm-sm">
              <p className="text-sm text-stone mb-1">Resolved</p>
              <p className="text-3xl font-display font-bold text-sage">{data.resolved_incidents}</p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Category Distribution */}
            <div className="bg-white rounded-2xl border border-sand/60 p-6 shadow-warm-sm animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <h2 className="text-lg font-display font-semibold text-ink mb-4">Category Distribution</h2>
              <div className="space-y-3">
                {catDist.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[cat.category] && (
                          <svg className="w-4 h-4 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[cat.category]} />
                          </svg>
                        )}
                        <span className="text-sm text-ink">{CATEGORY_LABELS[cat.category] || cat.category}</span>
                      </div>
                      <span className="text-sm text-stone font-medium">{cat.count} ({cat.percentage}%)</span>
                    </div>
                    <div className="h-2.5 bg-sand-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sage rounded-full transition-all duration-700"
                        style={{ width: `${(cat.count / maxCatCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="bg-white rounded-2xl border border-sand/60 p-6 shadow-warm-sm animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <h2 className="text-lg font-display font-semibold text-ink mb-4">Severity Breakdown</h2>
              <DonutChart data={sevBreak} />
            </div>
          </div>
        </>
      )}

      {/* Zones Tab */}
      {activeTab === 'zones' && (
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-lg font-display font-semibold text-ink mb-4">Zone Safety Scores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(zones).map(([zone, zoneData]) => {
              const colors = SCORE_COLORS[zoneData.level] || SCORE_COLORS.safe;
              return (
                <div
                  key={zone}
                  className={`${colors.bg} rounded-2xl border ${colors.border} p-4 flex flex-col items-center shadow-warm-sm hover:shadow-warm transition-shadow`}
                >
                  <ScoreRing score={zoneData.score} level={zoneData.level} />
                  <p className="text-sm font-semibold text-ink mt-2">{zone}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-xs font-medium ${TREND_COLORS[zoneData.trend]}`}>
                      {TREND_ARROWS[zoneData.trend]}
                    </span>
                    <span className="text-xs text-stone">
                      {zoneData.incident_count} report{zoneData.incident_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Intelligence Tab */}
      {activeTab === 'intelligence' && (
        <>
          {/* AI vs Regex Ratio */}
          <div className="bg-white rounded-2xl border border-sand/60 p-6 shadow-warm-sm mb-8 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <h2 className="text-lg font-display font-semibold text-ink mb-1">Analysis Method</h2>
            <p className="text-xs text-pebble mb-4">How each incident was processed — AI (LLM pipeline) vs Regex (deterministic fallback)</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-5 rounded-full overflow-hidden flex bg-sand-light">
                  {methodRatio.ai > 0 && (
                    <div
                      className="h-full bg-sage transition-all duration-700 flex items-center justify-center"
                      style={{ width: `${methodRatio.ai_percentage}%` }}
                    >
                      {methodRatio.ai_percentage >= 15 && (
                        <span className="text-xs text-white font-bold">AI {methodRatio.ai_percentage}%</span>
                      )}
                    </div>
                  )}
                  {methodRatio.regex > 0 && (
                    <div
                      className="h-full bg-terracotta transition-all duration-700 flex items-center justify-center"
                      style={{ width: `${100 - methodRatio.ai_percentage}%` }}
                    >
                      {(100 - methodRatio.ai_percentage) >= 15 && (
                        <span className="text-xs text-white font-bold">Regex {(100 - methodRatio.ai_percentage).toFixed(1)}%</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 text-sm flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-sage" />
                  <span className="text-stone">AI ({methodRatio.ai})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-terracotta" />
                  <span className="text-stone">Regex ({methodRatio.regex})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row: Trending + Correlations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trending Threats */}
            <div className="bg-white rounded-2xl border border-sand/60 p-6 shadow-warm-sm animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <h2 className="text-lg font-display font-semibold text-ink mb-1">Trending Threats</h2>
              <p className="text-xs text-pebble mb-4">Categories changing the most — comparing last 7 days vs the 7 days before</p>
              {trending.length === 0 ? (
                <p className="text-stone text-sm">No significant trends detected</p>
              ) : (
                <div className="space-y-3">
                  {trending.map((t) => (
                    <div key={t.category} className={`flex items-center justify-between p-3 rounded-xl ${t.direction === 'up' ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${t.direction === 'up' ? 'text-coral' : 'text-sage'}`}>
                          {t.direction === 'up' ? '↑' : '↓'}
                        </span>
                        <span className="text-sm font-medium text-ink">{t.category}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${t.direction === 'up' ? 'text-coral' : 'text-sage'}`}>
                          {t.change_percentage > 0 ? '+' : ''}{t.change_percentage}%
                        </span>
                        <p className="text-xs text-stone">{t.recent_count} recent / {t.prior_count} prior</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cross-Zone Correlations */}
            <div className="bg-white rounded-2xl border border-sand/60 p-6 shadow-warm-sm animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <h2 className="text-lg font-display font-semibold text-ink mb-1">Cross-Zone Alerts</h2>
              <p className="text-xs text-pebble mb-4">Same threat type appearing across 3+ zones — may indicate a widespread issue</p>
              {correlations.length === 0 ? (
                <p className="text-stone text-sm">No cross-zone patterns detected</p>
              ) : (
                <div className="space-y-3">
                  {correlations.map((c) => (
                    <div key={c.category} className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm font-semibold text-amber-800">{c.category} — spreading across {c.zone_count} zones</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.zones.map((z) => (
                          <span key={z} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">{z}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
